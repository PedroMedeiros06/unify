import { getDatabase, executarNaFila } from "./database";

export type Compromisso = {
  id: string;
  nome: string;
  valor: number;
  dataVencimento: string;
  icone: string;
  cor: string;
  // DERIVADO de `transacaoId != null` — nunca lido da coluna `pago`
  // do banco (deprecada desde a migration 9). Um compromisso só conta
  // como pago quando há uma transação real vinculada; marcar como pago
  // no app é, na prática, criar/escolher essa transação.
  pago: boolean;
  transacaoId: string | null;
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

type LinhaBrutaCompromisso = Omit<Compromisso, "pago">;

function mapearLinha(linha: LinhaBrutaCompromisso): Compromisso {
  return { ...linha, pago: linha.transacaoId != null };
}

export async function listarCompromissos(): Promise<Compromisso[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaCompromisso>(
      `SELECT
         id, nome, valor, data_vencimento as dataVencimento, icone, cor,
         transacao_id as transacaoId, notificacao_id as notificacaoId, criado_em as criadoEm
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

/**
 * Vincula um compromisso a uma transação real já existente — é o que
 * significa "pago" a partir da migration 9. Quem cria/escolhe a
 * transação é a UI (ver ProximosCompromissos + NovaTransacaoModal); esta
 * função é só a escrita do vínculo. Não toca na transação em si.
 */
export async function vincularCompromissoATransacao(id: string, transacaoId: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE compromissos SET transacao_id = ? WHERE id = ?;`, [transacaoId, id]);
  });
}

/**
 * Remove o vínculo (compromisso volta a "não pago"). A transação real
 * NÃO é excluída — se o usuário quiser apagá-la, faz isso à parte na
 * lista de transações.
 */
export async function desvincularCompromissoDaTransacao(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE compromissos SET transacao_id = NULL WHERE id = ?;`, [id]);
  });
}

export async function excluirCompromisso(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM compromissos WHERE id = ?;`, [id]);
  });
}

/**
 * Soma o valor dos compromissos AINDA NÃO PAGOS (sem transação real
 * vinculada, `transacao_id IS NULL`) com vencimento dentro do intervalo
 * [inicioIso, fimIso] (ambos inclusive) — usado por VisaoGeralMes e
 * pelo orçamento para projetar "quanto ainda falta sair" no mês.
 *
 * Compromissos com transação vinculada não entram aqui porque o impacto
 * deles no saldo já está refletido como transação real — que é a única
 * fonte do realizado (ver migration 9). A soma abaixo é, portanto, só a
 * parcela pendente do previsto, nunca o realizado.
 */
export async function somarCompromissosNaoPagosNoPeriodo(
  inicioIso: string,
  fimIso: string
): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const resultado = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(valor), 0) as total
       FROM compromissos
       WHERE transacao_id IS NULL AND data_vencimento >= ? AND data_vencimento <= ?;`,
      [inicioIso, fimIso]
    );
    return resultado?.total ?? 0;
  });
}