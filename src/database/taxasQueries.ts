import { getDatabase, executarNaFila } from "./database";

export type TaxaReferencia = {
  codigo: string; // "selic" | "cdi" | "poupanca" | "ipca"
  nome: string;
  valorAnualPct: number; // taxa já em % ao ano
  serieBcb: number | null; // série no SGS do Banco Central (referência)
  dataReferencia: string; // "aaaa-mm-dd" — data do dado na fonte
  atualizadoEm: string; // quando o app gravou
};

export async function listarTaxas(): Promise<TaxaReferencia[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<TaxaReferencia>(
      `SELECT codigo, nome, valor_anual_pct as valorAnualPct,
              serie_bcb as serieBcb, data_referencia as dataReferencia,
              atualizado_em as atualizadoEm
       FROM taxas_referencia
       ORDER BY rowid ASC;`
    );
  });
}

/**
 * Upsert de um lote de taxas (o retorno da API do Banco Central).
 * Substitui `valor_anual_pct` e `data_referencia` das que já existem e
 * insere as novas; `nome` e `serie_bcb` só são gravados no INSERT — a
 * API só devolve valor e data, o rótulo em português vem de
 * SERIES_TAXA em taxasApi.
 */
export async function salvarTaxas(
  taxas: { codigo: string; nome: string; valorAnualPct: number; serieBcb: number; dataReferencia: string }[]
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const t of taxas) {
        await db.runAsync(
          `INSERT INTO taxas_referencia (codigo, nome, valor_anual_pct, serie_bcb, data_referencia, atualizado_em)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(codigo) DO UPDATE SET
             valor_anual_pct = excluded.valor_anual_pct,
             data_referencia = excluded.data_referencia,
             atualizado_em = excluded.atualizado_em;`,
          [t.codigo, t.nome, t.valorAnualPct, t.serieBcb, t.dataReferencia]
        );
      }
    });
  });
}
