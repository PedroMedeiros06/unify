import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  registrarNotificacao,
  removerPorNotificacaoId,
  removerAgendadasFuturas,
} from "./notificacoesHistoricoQueries";
import { obterPerfil } from "./perfilQueries";
import { dataHoraLocalIso } from "@/utils/dateUtils";

/**
 * Notificações locais agendadas pelo próprio app — diferente de ler
 * notificações de outros apps (risco de bloqueio na Play Store).
 *
 * LIMITAÇÃO CONHECIDA: a partir do Expo SDK 53, o módulo
 * `expo-notifications` lança um erro ao ser importado dentro do Expo Go
 * no Android (mesmo para notificações puramente locais, sem push).
 * Funciona normalmente em um Development Build ou build de produção.
 *
 * Para não quebrar o app inteiro enquanto o time ainda testa via Expo Go,
 * este módulo detecta o ambiente de execução e desativa graciosamente
 * a funcionalidade de notificação quando necessário — o restante do app
 * (criar/editar/excluir compromissos) continua funcionando normalmente,
 * só sem o lembrete agendado.
 */

const rodandoNoExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// O import de expo-notifications só é feito dinamicamente e só quando
// NÃO estamos no Expo Go — evita que o próprio `import` no topo do
// arquivo dispare o erro documentado acima antes mesmo de qualquer
// função ser chamada.
type NotificationsModule = typeof import("expo-notifications");
let notificationsModulePromise: Promise<NotificationsModule> | null = null;

function carregarModuloNotifications(): Promise<NotificationsModule> {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications").then((mod) => {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return mod;
    });
  }
  return notificationsModulePromise;
}

let permissaoSolicitada = false;
let avisoExpoGoMostrado = false;

/**
 * Lê a preferência global de notificações do perfil (coluna
 * `notificacoes_ativas`, migration 19). Se o usuário desativou, o app
 * não deve agendar nada. Falha de leitura = assume ativo (não silencia
 * notificação por causa de um erro de banco pontual).
 */
async function notificacoesPermitidasPeloUsuario(): Promise<boolean> {
  try {
    const perfil = await obterPerfil();
    return perfil.notificacoesAtivas;
  } catch (erro) {
    console.warn("[notificacoes] Falha ao ler preferência de notificações (assumindo ativa):", erro);
    return true;
  }
}

function avisarLimitacaoExpoGo() {
  if (avisoExpoGoMostrado) return;
  avisoExpoGoMostrado = true;
  console.warn(
    "[notificacoes] Notificações locais estão desativadas no Expo Go (limitação do SDK 53+). " +
      "O compromisso será salvo normalmente, mas sem lembrete agendado. " +
      "Use um Development Build para testar notificações."
  );
}

async function garantirPermissao(Notifications: NotificationsModule): Promise<boolean> {
  const { status: statusAtual } = await Notifications.getPermissionsAsync();
  if (statusAtual === "granted") return true;

  if (permissaoSolicitada) return false;
  permissaoSolicitada = true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Agenda uma notificação local para o dia do vencimento de um
 * compromisso, às 9h. Retorna o ID da notificação agendada, ou null
 * se não foi possível agendar (Expo Go, permissão negada, ou data
 * já passada) — nesses casos o compromisso ainda deve ser salvo
 * normalmente por quem chama esta função.
 *
 * Quando agenda com sucesso, também grava a notificação no histórico
 * (`notificacoes_historico`) para aparecer na tela de notificações da
 * Home. `refId` é o id do compromisso, usado para casar a linha do
 * histórico com o item de origem.
 */
export async function agendarNotificacaoVencimento(
  nomeCompromisso: string,
  valor: number,
  dataVencimentoIso: string,
  refId: string | null = null
): Promise<string | null> {
  if (rodandoNoExpoGo) {
    avisarLimitacaoExpoGo();
    return null;
  }

  if (!(await notificacoesPermitidasPeloUsuario())) return null;

  try {
    const Notifications = await carregarModuloNotifications();

    const permitido = await garantirPermissao(Notifications);
    if (!permitido) return null;

    const [ano, mes, dia] = dataVencimentoIso.split("-").map(Number);
    const dataNotificacao = new Date(ano, mes - 1, dia, 9, 0, 0);

    if (dataNotificacao.getTime() <= Date.now()) return null;

    const valorFormatado = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const titulo = "Compromisso vence hoje";
    const corpo = `${nomeCompromisso} — ${valorFormatado}`;

    const notificacaoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: Platform.OS === "ios" ? "default" : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dataNotificacao,
      },
    });

    // Histórico é acessório: se falhar, a notificação já foi agendada e
    // o compromisso deve ser salvo do mesmo jeito.
    try {
      await registrarNotificacao({
        titulo,
        corpo,
        disparaEm: dataHoraLocalIso(dataNotificacao),
        notificacaoId,
        origem: "compromisso",
        refId,
      });
    } catch (erroHistorico) {
      console.warn("[notificacoes] Falha ao registrar notificação no histórico:", erroHistorico);
    }

    return notificacaoId;
  } catch (erro) {
    // Cobre tanto a exceção conhecida do Expo Go (caso a detecção acima
    // falhe por algum motivo) quanto qualquer outro erro inesperado do
    // módulo — nunca deve propagar e quebrar o fluxo de salvar o compromisso.
    console.error("[notificacoes] Falha ao agendar notificação:", erro);
    return null;
  }
}

/**
 * Agenda uma notificação local para um lembrete, na DATA e HORA exatas
 * escolhidas pelo usuário (diferente de `agendarNotificacaoVencimento`,
 * que fixa 9h). Retorna o ID da notificação agendada, ou null se não foi
 * possível agendar (Expo Go, permissão negada, ou data/hora já passada) —
 * nesses casos o lembrete ainda deve ser salvo normalmente por quem chama.
 *
 * `horaHHMM` no formato "HH:MM" (24h).
 */
export async function agendarNotificacaoLembrete(
  titulo: string,
  descricao: string | null,
  dataIso: string,
  horaHHMM: string,
  refId: string | null = null
): Promise<string | null> {
  if (rodandoNoExpoGo) {
    avisarLimitacaoExpoGo();
    return null;
  }

  if (!(await notificacoesPermitidasPeloUsuario())) return null;

  try {
    const Notifications = await carregarModuloNotifications();

    const permitido = await garantirPermissao(Notifications);
    if (!permitido) return null;

    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const [hora, minuto] = horaHHMM.split(":").map(Number);
    const dataNotificacao = new Date(ano, mes - 1, dia, hora, minuto, 0);

    if (dataNotificacao.getTime() <= Date.now()) return null;

    const corpo = descricao?.trim() ? descricao.trim() : "Lembrete";

    const notificacaoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: Platform.OS === "ios" ? "default" : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dataNotificacao,
      },
    });

    try {
      await registrarNotificacao({
        titulo,
        corpo,
        disparaEm: dataHoraLocalIso(dataNotificacao),
        notificacaoId,
        origem: "lembrete",
        refId,
      });
    } catch (erroHistorico) {
      console.warn("[notificacoes] Falha ao registrar notificação no histórico:", erroHistorico);
    }

    return notificacaoId;
  } catch (erro) {
    console.error("[notificacoes] Falha ao agendar notificação de lembrete:", erro);
    return null;
  }
}

/**
 * Cancela uma notificação previamente agendada. Seguro chamar mesmo
 * se o ID for null, se já não existir mais, ou se estivermos no Expo Go.
 *
 * Também remove a linha correspondente do histórico — MAS só se a
 * notificação ainda não tiver disparado (ver `removerPorNotificacaoId`).
 * Se já chegou ao usuário, permanece no histórico mesmo que o
 * compromisso/lembrete seja editado ou excluído depois.
 */
export async function cancelarNotificacao(notificacaoId: string | null): Promise<void> {
  if (!notificacaoId) return;

  // A remoção do histórico independe do Expo Go — a linha pode ter sido
  // gravada num build anterior (dev/produção) e o app estar rodando no
  // Expo Go agora.
  try {
    await removerPorNotificacaoId(notificacaoId);
  } catch (erro) {
    console.warn("[notificacoes] Falha ao remover notificação do histórico:", erro);
  }

  if (rodandoNoExpoGo) return;

  try {
    const Notifications = await carregarModuloNotifications();
    await Notifications.cancelScheduledNotificationAsync(notificacaoId);
  } catch (erro) {
    console.warn("[notificacoes] Não foi possível cancelar notificação:", erro);
  }
}

/**
 * Cancela TODAS as notificações que o app tem agendadas no sistema e
 * remove do histórico as que ainda não dispararam.
 *
 * Usado quando os dados de origem deixam de existir de uma vez só
 * ("Apagar dados do app") ou são substituídos (restaurar backup): sem
 * isto, os avisos agendados para lembretes/compromissos apagados
 * continuavam disparando, porque o agendamento vive no sistema
 * operacional, fora do SQLite. Nunca lança.
 */
export async function cancelarTodasNotificacoes(): Promise<void> {
  try {
    await removerAgendadasFuturas();
  } catch (erro) {
    console.warn("[notificacoes] Falha ao limpar agendadas do histórico:", erro);
  }

  if (rodandoNoExpoGo) return;

  try {
    const Notifications = await carregarModuloNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (erro) {
    console.warn("[notificacoes] Não foi possível cancelar todas as notificações:", erro);
  }
}

/** Exposto para a UI poder avisar o usuário, se quiser (ex: um banner discreto). */
export function notificacoesDisponiveis(): boolean {
  return !rodandoNoExpoGo;
}
