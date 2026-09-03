/**
 * Cliente da API de dados abertos do Banco Central do Brasil — SGS
 * (Sistema Gerenciador de Séries Temporais). Sem chave, sem limite
 * prático de uso.
 *
 * Endpoint por série:
 *   GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/1?formato=json
 *   Resposta: [{ "data": "01/06/2025", "valor": "14.90" }]
 *
 * Cada série tem uma unidade própria (ver comentários em SERIES_TAXA);
 * `normalizarParaAnual` converte tudo para "% ao ano" antes de gravar,
 * que é o formato que o simulador de investimento consome.
 */

type UnidadeSerie = "anual" | "mensal";

export type SerieTaxa = {
  codigo: string; // chave interna: "selic" | "cdi" | "poupanca" | "ipca"
  nome: string; // rótulo em português no seletor
  serieBcb: number; // número da série no SGS
  unidade: UnidadeSerie; // como o BC publica o valor
};

// Ordem aqui é a ordem de exibição no seletor.
export const SERIES_TAXA: SerieTaxa[] = [
  // 432 — Taxa Selic meta definida pelo Copom, já em % a.a.
  { codigo: "selic", nome: "Selic (meta)", serieBcb: 432, unidade: "anual" },
  // 4389 — Taxa de juros CDI anualizada (base 252), em % a.a.
  { codigo: "cdi", nome: "CDI", serieBcb: 4389, unidade: "anual" },
  // 196 — Rendimento da poupança, publicado ao MÊS (%). Anualizado aqui.
  { codigo: "poupanca", nome: "Poupança", serieBcb: 196, unidade: "mensal" },
  // 13522 — IPCA acumulado nos últimos 12 meses (%), já "ao ano".
  { codigo: "ipca", nome: "IPCA (12 meses)", serieBcb: 13522, unidade: "anual" },
];

export type TaxaRemota = {
  codigo: string;
  nome: string;
  valorAnualPct: number;
  serieBcb: number;
  dataReferencia: string;
};

type PontoSgs = { data: string; valor: string };

function unificarData(ddmmaaaa: string): string {
  // "01/06/2025" -> "2025-06-01"
  const [dia, mes, ano] = ddmmaaaa.split("/");
  if (!dia || !mes || !ano) return ddmmaaaa;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function normalizarParaAnual(valor: number, unidade: UnidadeSerie): number {
  if (unidade === "anual") return valor;
  // Mensal -> anual por juros compostos: (1 + m)^12 - 1.
  return (Math.pow(1 + valor / 100, 12) - 1) * 100;
}

async function buscarSerie(serie: SerieTaxa): Promise<TaxaRemota | null> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie.serieBcb}/dados/ultimos/1?formato=json`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`BCB série ${serie.serieBcb} respondeu ${resposta.status}`);
  }

  const dados = (await resposta.json()) as PontoSgs[];
  const ponto = Array.isArray(dados) ? dados[dados.length - 1] : undefined;
  if (!ponto || typeof ponto.valor !== "string") {
    return null;
  }

  const bruto = parseFloat(ponto.valor.replace(",", "."));
  if (!Number.isFinite(bruto)) return null;

  return {
    codigo: serie.codigo,
    nome: serie.nome,
    valorAnualPct: Number(normalizarParaAnual(bruto, serie.unidade).toFixed(2)),
    serieBcb: serie.serieBcb,
    dataReferencia: unificarData(ponto.data),
  };
}

/**
 * Busca todas as séries em paralelo. Uma série que falhar ou vier vazia
 * é simplesmente omitida do lote — as demais ainda são gravadas, e a
 * omitida mantém o último valor que já estava no banco. Só lança se
 * NENHUMA série voltou (tratado como "sem internet" por quem chama).
 */
export async function buscarTaxasBcb(): Promise<TaxaRemota[]> {
  const resultados = await Promise.allSettled(SERIES_TAXA.map(buscarSerie));

  const taxas: TaxaRemota[] = [];
  for (const r of resultados) {
    if (r.status === "fulfilled" && r.value) {
      taxas.push(r.value);
    }
  }

  if (taxas.length === 0) {
    throw new Error("Nenhuma série de taxa do Banco Central pôde ser lida");
  }

  return taxas;
}
