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

/**
 * Retorna a meta com maior percentual de progresso (progressoAtual /
 * valorMeta), ou null se não houver nenhuma meta cadastrada. Usado por
 * ResumoMetrics e PerfilCard para "% de meta atingida" quando o
 * usuário tem várias metas — critério definido: sempre a de maior progresso.
 */
export async function obterMetaDeMaiorProgresso(): Promise<Meta | null> {
  const metas = await listarMetas();
  if (metas.length === 0) return null;

  return metas.reduce((melhor, atual) => {
    const progressoMelhor = melhor.valorMeta > 0 ? melhor.progressoAtual / melhor.valorMeta : 0;
    const progressoAtualCalc = atual.valorMeta > 0 ? atual.progressoAtual / atual.valorMeta : 0;
    return progressoAtualCalc > progressoMelhor ? atual : melhor;
  });
}