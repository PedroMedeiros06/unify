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
  // Categoria opcional (migration 23) — usada pelo Orçamento para
  // mostrar quanto ainda vai sair em cada categoria no mês.
  categoriaId: string | null;
  criadoEm: string;
};

export type CamposCompromisso = {
  nome: string;
  valor: number;
  dataVencimento: string;
  icone: string;
  cor: string;
  categoriaId: string | null;
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
         transacao_id as transacaoId, notificacao_id as notificacaoId, categoria_id as categoriaId,
         criado_em as criadoEm
       FROM compromissos
       ORDER BY data_vencimento ASC;`
    );
    return linhas.map(mapearLinha);
  });
}

/** Compromissos com vencimento em [inicioIso, fimIso] (inclusive) — Agenda. */
export async function listarCompromissosNoPeriodo(inicioIso: string, fimIso: string): Promise<Compromisso[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaCompromisso>(
      `SELECT
         id, nome, valor, data_vencimento as dataVencimento, icone, cor,
         transacao_id as transacaoId, notificacao_id as notificacaoId, categoria_id as categoriaId,
         criado_em as criadoEm
       FROM compromissos
       WHERE data_vencimento >= ? AND data_vencimento <= ?
       ORDER BY data_vencimento ASC;`,
      [inicioIso, fimIso]
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
      `INSERT INTO compromissos (id, nome, valor, data_vencimento, icone, cor, pago, notificacao_id, categoria_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?);`,
      [id, campos.nome, campos.valor, campos.dataVencimento, campos.icone, campos.cor, notificacaoId, campos.categoriaId]
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
       SET nome = ?, valor = ?, data_vencimento = ?, icone = ?, cor = ?, notificacao_id = ?, categoria_id = ?
       WHERE id = ?;`,
      [campos.nome, campos.valor, campos.dataVencimento, campos.icone, campos.cor, notificacaoId, campos.categoriaId, id]
    );
  });
}

/**
 * Grava APENAS o `notificacao_id` de um compromisso, sem tocar nos
 * demais campos. Usado quando a preferência global de notificações é
 * alternada e o app precisa reagendar/cancelar em massa (ver
 * Preferencias.tsx). `null` = compromisso sem notificação agendada.
 */
export async function atualizarNotificacaoIdCompromisso(
  id: string,
  notificacaoId: string | null
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE compromissos SET notificacao_id = ? WHERE id = ?;`, [notificacaoId, id]);
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

/**
 * Compromissos NÃO pagos com vencimento em [inicioIso, fimIso], somados
 * por categoria — o "a vencer" de cada linha do Orçamento. Sem
 * categoria ficam de fora (não há linha para eles).
 */
export async function somarCompromissosNaoPagosPorCategoria(
  inicioIso: string,
  fimIso: string
): Promise<Map<string, number>> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<{ categoriaId: string; total: number }>(
      `SELECT categoria_id as categoriaId, COALESCE(SUM(valor), 0) as total
       FROM compromissos
       WHERE transacao_id IS NULL AND categoria_id IS NOT NULL
         AND data_vencimento >= ? AND data_vencimento <= ?
       GROUP BY categoria_id;`,
      [inicioIso, fimIso]
    );
    return new Map(linhas.map((l) => [l.categoriaId, l.total]));
  });
}
