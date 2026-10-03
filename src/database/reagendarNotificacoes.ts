import { listarCompromissos, atualizarNotificacaoIdCompromisso } from "./compromissosQueries";
import { listarLembretes, atualizarNotificacaoIdLembrete } from "./lembretesQueries";
import { agendarNotificacaoVencimento, agendarNotificacaoLembrete } from "./notificacoes";
import { dataHojeIso, dataHoraLocalIso } from "@/utils/dateUtils";

/**
 * Reagenda, direto a partir do BANCO, as notificações de todos os
 * compromissos não pagos e lembretes ainda no futuro.
 *
 * Existe para a restauração de backup: os `notificacao_id` que vêm no
 * arquivo pertencem ao agendamento de OUTRO aparelho (ou de antes do
 * backup) e não valem aqui — `restaurarDados` os zera, e esta função
 * agenda tudo de novo. Não usa os contexts porque roda antes da
 * remontagem da árvore (os providers ainda estão com os dados antigos).
 *
 * Quem chama deve ter cancelado as notificações anteriores antes
 * (`cancelarTodasNotificacoes`). `agendarNotificacao*` já respeita a
 * preferência global `notificacoes_ativas` (restaurada junto do perfil)
 * e devolve null para datas passadas, Expo Go ou permissão negada.
 */
export async function reagendarNotificacoesDoBanco(): Promise<void> {
  const hojeIso = dataHojeIso();
  const agoraLocal = dataHoraLocalIso();

  const [compromissos, lembretes] = await Promise.all([listarCompromissos(), listarLembretes()]);

  for (const c of compromissos) {
    if (c.pago || c.dataVencimento < hojeIso) continue;
    const id = await agendarNotificacaoVencimento(c.nome, c.valor, c.dataVencimento, c.id);
    if (id) await atualizarNotificacaoIdCompromisso(c.id, id);
  }

  for (const l of lembretes) {
    // "aaaa-mm-ddTHH:MM" compara como texto com o agora local.
    if (`${l.data}T${l.hora}` <= agoraLocal.slice(0, 16)) continue;
    const id = await agendarNotificacaoLembrete(l.titulo, l.descricao, l.data, l.hora, l.id);
    if (id) await atualizarNotificacaoIdLembrete(l.id, id);
  }
}
