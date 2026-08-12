import { getDatabase, executarNaFila } from "./database";

export type Compromisso = {
  id: string;
  nome: string;
  valor: number;
  dataVencimento: string;
  icone: string;
  cor: string;
  pago: boolean;
  notificacaoId: string | null;
  criadoEm: string;
};

export type CamposCompromisso = {
  nome: string;
  valor: number;
  dataVencimento: string;
  icone: string;
  cor: string;
};

type LinhaBrutaCompromisso = Omit<Compromisso, "pago"> & { pago: number };

function mapearLinha(linha: LinhaBrutaCompromisso): Compromisso {
  return { ...linha, pago: linha.pago === 1 };
}

export async function listarCompromissos(): Promise<Compromisso[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaCompromisso>(
      `SELECT
         id, nome, valor, data_vencimento as dataVencimento, icone, cor,
         pago, notificacao_id as notificacaoId, criado_em as criadoEm
       FROM compromissos
       ORDER BY data_vencimento ASC;`
    );
    return linhas.map(mapearLinha);
  });
}

export async function inserirCompromisso(
  id: string,
  campos: CamposCompromisso,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO compromissos (id, nome, valor, data_vencimento, icone, cor, pago, notificacao_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
      [id, campos.nome, campos.valor, campos.dataVencimento, campos.icone, campos.cor, notificacaoId]
    );
  });
}

export async function atualizarCompromisso(
  id: string,
  campos: CamposCompromisso,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE compromissos
       SET nome = ?, valor = ?, data_vencimento = ?, icone = ?, cor = ?, notificacao_id = ?
       WHERE id = ?;`,
      [campos.nome, campos.valor, campos.dataVencimento, campos.icone, campos.cor, notificacaoId, id]
    );
  });
}

export async function marcarCompromissoPago(id: string, pago: boolean): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE compromissos SET pago = ? WHERE id = ?;`, [pago ? 1 : 0, id]);
  });
}

export async function excluirCompromisso(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM compromissos WHERE id = ?;`, [id]);
  });
}
