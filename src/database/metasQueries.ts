import { getDatabase, executarNaFila } from "./database";

export type Meta = {
  id: string;
  nome: string;
  valorMeta: number;
  progressoAtual: number;
  icone: string;
  cor: string;
  criadoEm: string;
};

export type CamposMeta = {
  nome: string;
  valorMeta: number;
  progressoAtual: number;
  icone: string;
  cor: string;
};

export async function listarMetas(): Promise<Meta[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Meta>(
      `SELECT
         id, nome, valor_meta as valorMeta, progresso_atual as progressoAtual,
         icone, cor, criado_em as criadoEm
       FROM metas
       ORDER BY criado_em DESC;`
    );
  });
}

export async function inserirMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO metas (id, nome, valor_meta, progresso_atual, icone, cor)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, campos.nome, campos.valorMeta, campos.progressoAtual, campos.icone, campos.cor]
    );
  });
}

export async function atualizarMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE metas
       SET nome = ?, valor_meta = ?, progresso_atual = ?, icone = ?, cor = ?
       WHERE id = ?;`,
      [campos.nome, campos.valorMeta, campos.progressoAtual, campos.icone, campos.cor, id]
    );
  });
}

export async function excluirMeta(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM metas WHERE id = ?;`, [id]);
  });
}
