import { getDatabase, executarNaFila } from "./database";

/**
 * Lembrete = anotação com data e hora que dispara uma notificação local
 * no horário marcado. Não tem valor monetário nem vínculo com transação
 * (ver migration 12) — é só um aviso pontual do usuário para si mesmo.
 * Não tem estado de conclusão: se não serve mais, o usuário exclui.
 */
export type Lembrete = {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string; // ISO "aaaa-mm-dd"
  hora: string; // "HH:MM" (24h)
  notificacaoId: string | null;
  criadoEm: string;
};

export type CamposLembrete = {
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string;
};

export async function listarLembretes(): Promise<Lembrete[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Lembrete>(
      `SELECT
         id, titulo, descricao, data, hora,
         notificacao_id as notificacaoId, criado_em as criadoEm
       FROM lembretes
       ORDER BY data ASC, hora ASC;`
    );
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
      `INSERT INTO lembretes (id, titulo, descricao, data, hora, notificacao_id)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, campos.titulo, campos.descricao, campos.data, campos.hora, notificacaoId]
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
       SET titulo = ?, descricao = ?, data = ?, hora = ?, notificacao_id = ?
       WHERE id = ?;`,
      [campos.titulo, campos.descricao, campos.data, campos.hora, notificacaoId, id]
    );
  });
}

export async function excluirLembrete(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM lembretes WHERE id = ?;`, [id]);
  });
}
