import { getDatabase, executarNaFila } from "./database";
import { RepeticaoLembrete } from "@/utils/repeticaoLembrete";

/**
 * Lembrete = anotação com data e hora que dispara uma notificação local
 * no horário marcado. Não tem valor monetário nem vínculo com transação
 * (ver migration 12) — é só um aviso pontual do usuário para si mesmo.
 * Não tem estado de conclusão: se não serve mais, o usuário exclui.
 *
 * Pode se repetir (semanal/mensal/anual, migration 23): aí `data` é a
 * PRÓXIMA ocorrência e `notificacaoId` pode conter vários ids separados
 * por vírgula (as próximas ocorrências já agendadas — ver
 * agendarNotificacaoLembrete).
 */
export type Lembrete = {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string; // ISO "aaaa-mm-dd"
  hora: string; // "HH:MM" (24h)
  repeticao: RepeticaoLembrete;
  diaBase: number | null;
  notificacaoId: string | null;
  criadoEm: string;
};

export type CamposLembrete = {
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string;
  repeticao: RepeticaoLembrete;
};

export async function listarLembretes(): Promise<Lembrete[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Lembrete>(
      `SELECT
         id, titulo, descricao, data, hora, repeticao, dia_base as diaBase,
         notificacao_id as notificacaoId, criado_em as criadoEm
       FROM lembretes
       ORDER BY data ASC, hora ASC;`
    );
  });
}

/**
 * Lembretes com data em [inicioIso, fimIso] (inclusive) — Agenda. Os
 * REPETIDOS com próxima data até `fimIso` vêm sempre (a Agenda expande
 * as ocorrências dentro do período, ver agendaQueries).
 */
export async function listarLembretesNoPeriodo(inicioIso: string, fimIso: string): Promise<Lembrete[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Lembrete>(
      `SELECT
         id, titulo, descricao, data, hora, repeticao, dia_base as diaBase,
         notificacao_id as notificacaoId, criado_em as criadoEm
       FROM lembretes
       WHERE (data >= ? AND data <= ?) OR (repeticao <> 'nenhuma' AND data <= ?)
       ORDER BY data ASC, hora ASC;`,
      [inicioIso, fimIso, fimIso]
    );
  });
}

/** Dia do mês da data escolhida — referência do mensal/anual. */
export function diaBaseDe(campos: Pick<CamposLembrete, "data" | "repeticao">): number | null {
  return campos.repeticao === "nenhuma" ? null : Number(campos.data.split("-")[2]);
}

/** Avança um lembrete repetido para a próxima ocorrência (data + ids agendados). */
export async function avancarLembrete(id: string, novaData: string, notificacaoId: string | null): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE lembretes SET data = ?, notificacao_id = ? WHERE id = ?;`, [novaData, notificacaoId, id]);
  });
}

export async function inserirLembrete(
  id: string,
  campos: CamposLembrete,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO lembretes (id, titulo, descricao, data, hora, repeticao, dia_base, notificacao_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id, campos.titulo, campos.descricao, campos.data, campos.hora,
        campos.repeticao, diaBaseDe(campos), notificacaoId,
      ]
    );
  });
}

export async function atualizarLembrete(
  id: string,
  campos: CamposLembrete,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE lembretes
       SET titulo = ?, descricao = ?, data = ?, hora = ?, repeticao = ?, dia_base = ?, notificacao_id = ?
       WHERE id = ?;`,
      [
        campos.titulo, campos.descricao, campos.data, campos.hora,
        campos.repeticao, diaBaseDe(campos), notificacaoId, id,
      ]
    );
  });
}

export async function excluirLembrete(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM lembretes WHERE id = ?;`, [id]);
  });
}

/**
 * Grava APENAS o `notificacao_id` de um lembrete, sem tocar nos demais
 * campos. Usado quando a preferência global de notificações é alternada
 * e o app precisa reagendar/cancelar em massa (ver Preferencias.tsx).
 * `null` = lembrete sem notificação agendada.
 */
export async function atualizarNotificacaoIdLembrete(
  id: string,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE lembretes SET notificacao_id = ? WHERE id = ?;`, [notificacaoId, id]);
  });
}
