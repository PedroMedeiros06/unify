import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

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
 */
export async function agendarNotificacaoVencimento(
  nomeCompromisso: string,
  valor: number,
  dataVencimentoIso: string
): Promise<string | null> {
  if (rodandoNoExpoGo) {
    avisarLimitacaoExpoGo();
    return null;
  }

  try {
    const Notifications = await carregarModuloNotifications();

    const permitido = await garantirPermissao(Notifications);
    if (!permitido) return null;

    const [ano, mes, dia] = dataVencimentoIso.split("-").map(Number);
    const dataNotificacao = new Date(ano, mes - 1, dia, 9, 0, 0);

    if (dataNotificacao.getTime() <= Date.now()) return null;

    const valorFormatado = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const notificacaoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Compromisso vence hoje",
        body: `${nomeCompromisso} — ${valorFormatado}`,
        sound: Platform.OS === "ios" ? "default" : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dataNotificacao,
      },
    });

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
 * Cancela uma notificação previamente agendada. Seguro chamar mesmo
 * se o ID for null, se já não existir mais, ou se estivermos no Expo Go.
 */
export async function cancelarNotificacao(notificacaoId: string | null): Promise<void> {
  if (!notificacaoId || rodandoNoExpoGo) return;

  try {
    const Notifications = await carregarModuloNotifications();
    await Notifications.cancelScheduledNotificationAsync(notificacaoId);
  } catch (erro) {
    console.warn("[notificacoes] Não foi possível cancelar notificação:", erro);
  }
}

/** Exposto para a UI poder avisar o usuário, se quiser (ex: um banner discreto). */
export function notificacoesDisponiveis(): boolean {
  return !rodandoNoExpoGo;
}
