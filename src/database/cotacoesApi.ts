/**
 * Cliente da Frankfurter API (https://frankfurter.dev) — cotações de
 * referência do Banco Central Europeu, sem chave, sem limite prático.
 *
 * Endpoint usado: GET https://api.frankfurter.dev/v1/latest?base=BRL
 * Resposta: { amount: 1, base: "BRL", date: "2025-08-29", rates: { USD: 0.1845, EUR: 0.17, ... } }
 *
 * `rates[X]` = quantas unidades de X valem 1 BRL. O app trabalha com o
 * inverso: `cotacaoBrl = 1 / rates[X]` = quantos reais valem 1 unidade de X.
 */

// Rótulos em português das moedas que expomos. A ordem aqui é a ordem de
// exibição no seletor. Só moedas que a Frankfurter suporta.
export const NOMES_MOEDA: Record<string, string> = {
  USD: "Dólar americano",
  EUR: "Euro",
  GBP: "Libra esterlina",
  JPY: "Iene japonês",
  CHF: "Franco suíço",
  CAD: "Dólar canadense",
  AUD: "Dólar australiano",
  CNY: "Yuan chinês",
  NZD: "Dólar neozelandês",
  SEK: "Coroa sueca",
  NOK: "Coroa norueguesa",
  DKK: "Coroa dinamarquesa",
  ZAR: "Rand sul-africano",
  MXN: "Peso mexicano",
  PLN: "Zloti polonês",
  HKD: "Dólar de Hong Kong",
  SGD: "Dólar de Singapura",
  TRY: "Lira turca",
};

const SYMBOLS = Object.keys(NOMES_MOEDA).join(",");
const URL = `https://api.frankfurter.dev/v1/latest?base=BRL&symbols=${SYMBOLS}`;

export type CotacaoRemota = {
  codigo: string;
  nome: string;
  cotacaoBrl: number;
  dataReferencia: string;
};

type RespostaFrankfurter = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

/**
 * Busca as cotações atuais. Lança em falha de rede / resposta inválida —
 * quem chama (CotacoesContext) trata como "sem internet" e mantém o que
 * já está no banco.
 */
export async function buscarCotacoesFrankfurter(): Promise<CotacaoRemota[]> {
  const resposta = await fetch(URL);
  if (!resposta.ok) {
    throw new Error(`Frankfurter respondeu ${resposta.status}`);
  }

  const dados = (await resposta.json()) as RespostaFrankfurter;
  if (!dados?.rates || typeof dados.date !== "string") {
    throw new Error("Resposta da Frankfurter em formato inesperado");
  }

  const cotacoes: CotacaoRemota[] = [];
  for (const [codigo, rate] of Object.entries(dados.rates)) {
    if (!rate || rate <= 0) continue;
    cotacoes.push({
      codigo,
      nome: NOMES_MOEDA[codigo] ?? codigo,
      cotacaoBrl: 1 / rate,
      dataReferencia: dados.date,
    });
  }

  return cotacoes;
}
