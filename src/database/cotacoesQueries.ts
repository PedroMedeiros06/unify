import { getDatabase, executarNaFila } from "./database";

export type CotacaoMoeda = {
  codigo: string; // ISO 4217 — "USD", "EUR"...
  nome: string;
  cotacaoBrl: number; // quantos reais valem 1 unidade da moeda
  dataReferencia: string; // "aaaa-mm-dd" — data do dado na fonte
  atualizadoEm: string; // quando o app gravou
};

export async function listarCotacoes(): Promise<CotacaoMoeda[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<CotacaoMoeda>(
      `SELECT codigo, nome, cotacao_brl as cotacaoBrl,
              data_referencia as dataReferencia, atualizado_em as atualizadoEm
       FROM cotacoes_moeda
       ORDER BY codigo ASC;`
    );
  });
}

/**
 * Upsert de um lote de cotações (o retorno da Frankfurter API). Substitui
 * `cotacao_brl` e `data_referencia` das moedas que já existem e insere as
 * novas; `nome` só é gravado na primeira vez (INSERT) — a API não manda
 * nome, então o rótulo em português vem de NOMES_MOEDA no cotacoesApi.
 */
export async function salvarCotacoes(
  cotacoes: { codigo: string; nome: string; cotacaoBrl: number; dataReferencia: string }[]
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const c of cotacoes) {
        await db.runAsync(
          `INSERT INTO cotacoes_moeda (codigo, nome, cotacao_brl, data_referencia, atualizado_em)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(codigo) DO UPDATE SET
             cotacao_brl = excluded.cotacao_brl,
             data_referencia = excluded.data_referencia,
             atualizado_em = excluded.atualizado_em;`,
          [c.codigo, c.nome, c.cotacaoBrl, c.dataReferencia]
        );
      }
    });
  });
}
