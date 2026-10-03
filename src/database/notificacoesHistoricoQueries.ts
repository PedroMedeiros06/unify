import { getDatabase, executarNaFila } from "./database";
import { dataHoraLocalIso } from "@/utils/dateUtils";

/**
 * Histórico das notificações locais que o app AGENDOU (ver migration
 * 18). Uma linha é criada no momento do agendamento, não do disparo —
 * uma notificação de lembrete/vencimento pode disparar com o app
 * fechado, então não há como registrá-la de forma confiável nesse
 * instante. A tela de histórico trata como "recebida" toda linha cujo
 * `disparaEm` já passou; `lida` marca se o usuário abriu o histórico
 * depois disso.
 *
 * Fluxo:
 * - agendar lembrete/compromisso  -> registrarNotificacao(...)
 * - cancelar (editar/excluir/pagar antes de disparar) -> removerPorNotificacaoId(...)
 * - abrir a tela de histórico -> marcarTodasComoLidas()
 */

export type OrigemNotificacao = "compromisso" | "lembrete";

export type NotificacaoHistorico = {
  id: string;
  titulo: string;
  corpo: string;
  disparaEm: string; // ISO datetime local ("aaaa-mm-ddTHH:MM:SS")
  criadaEm: string; // ISO datetime
  lida: boolean;
  notificacaoId: string | null; // id devolvido por scheduleNotificationAsync
  origem: OrigemNotificacao;
  refId: string | null; // id do compromisso/lembrete de origem
};

type LinhaBruta = Omit<NotificacaoHistorico, "lida"> & { lida: number };

function mapear(linha: LinhaBruta): NotificacaoHistorico {
  return { ...linha, lida: linha.lida === 1 };
}

type RegistrarInput = {
  titulo: string;
  corpo: string;
  disparaEm: string;
  notificacaoId: string | null;
  origem: OrigemNotificacao;
  refId: string | null;
};

/**
 * Grava uma notificação agendada no histórico. Chamado por
 * `database/notificacoes.ts` logo depois de `scheduleNotificationAsync`
 * ter dado certo. Nunca deve lançar de forma a quebrar o fluxo de
 * salvar o compromisso/lembrete — quem chama trata o erro.
 */
export async function registrarNotificacao(input: RegistrarInput): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      `INSERT INTO notificacoes_historico
         (id, titulo, corpo, disparar_em, criada_em, lida, notificacao_id, origem, ref_id)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?);`,
      [
        id,
        input.titulo,
        input.corpo,
        input.disparaEm,
        new Date().toISOString(),
        input.notificacaoId,
        input.origem,
        input.refId,
      ]
    );
  });
}

/**
 * Remove a linha de histórico correspondente a uma notificação que foi
 * cancelada (compromisso/lembrete editado, excluído ou marcado como
 * pago antes de a notificação disparar). No-op se `notificacaoId` for
 * null ou não existir linha.
 *
 * Só remove linhas AINDA NÃO disparadas (`disparar_em` no futuro): se a
 * notificação já chegou ao usuário, ela continua no histórico mesmo que
 * o item de origem seja apagado depois.
 */
export async function removerPorNotificacaoId(notificacaoId: string | null): Promise<void> {
  if (!notificacaoId) return;
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM notificacoes_historico
       WHERE notificacao_id = ? AND disparar_em > ?;`,
      [notificacaoId, dataHoraLocalIso()]
    );
  });
}

/**
 * Remove do histórico TODAS as linhas que ainda não dispararam. Usado
 * junto do cancelamento em massa das notificações agendadas (apagar
 * dados / restaurar backup) — as já recebidas continuam no histórico.
 */
export async function removerAgendadasFuturas(): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM notificacoes_historico WHERE disparar_em > ?;`, [dataHoraLocalIso()]);
  });
}

/**
 * Lista o histórico, mais recente (por horário de disparo) primeiro.
 * Inclui itens ainda não disparados (agendados para o futuro) — a UI
 * decide como rotulá-los.
 */
export async function listarHistorico(limite = 100): Promise<NotificacaoHistorico[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBruta>(
      `SELECT
         id, titulo, corpo,
         disparar_em as disparaEm, criada_em as criadaEm,
         lida, notificacao_id as notificacaoId, origem, ref_id as refId
       FROM notificacoes_historico
       ORDER BY disparar_em DESC
       LIMIT ?;`,
      [limite]
    );
    return linhas.map(mapear);
  });
}

/**
 * Conta as notificações NÃO LIDAS que já foram recebidas (disparar_em no
 * passado). É o número do badge vermelho no sino da Home. Agendadas para
 * o futuro não contam — ainda não "chegaram".
 */
export async function contarNaoLidas(): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM notificacoes_historico
       WHERE lida = 0 AND disparar_em <= ?;`,
      [dataHoraLocalIso()]
    );
    return linha?.total ?? 0;
  });
}

/**
 * Marca como lidas todas as notificações já recebidas. Chamado quando o
 * usuário abre a tela de histórico. Não toca nas agendadas para o
 * futuro (para elas voltarem a acender o badge quando dispararem).
 */
export async function marcarTodasComoLidas(): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE notificacoes_historico
       SET lida = 1
       WHERE lida = 0 AND disparar_em <= ?;`,
      [dataHoraLocalIso()]
    );
  });
}
