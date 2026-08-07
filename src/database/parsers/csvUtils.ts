import Papa from "papaparse";

/**
 * Converte "dd/mm/aaaa" para "aaaa-mm-dd" (ISO), formato usado
 * internamente em toda a aplicação (TransacaoImportada.data).
 * Retorna null se a data for inválida ou for a data-sentinela
 * "00/00/0000" que alguns bancos usam em linhas de resumo/saldo.
 */
export function normalizarDataBR(dataBR: string): string | null {
  const match = dataBR.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, dia, mes, ano] = match;

  // "00/00/0000" e datas com dia/mês zerado são linhas de resumo, não transações reais
  if (dia === "00" || mes === "00") return null;

  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte um valor monetário em texto para número, aceitando tanto
 * vírgula (BB, Inter) quanto ponto (Nubank) como separador decimal.
 * Sempre retorna o valor absoluto — o sinal/tipo é decidido à parte
 * por quem chama, olhando o sinal original antes de normalizar.
 */
export function normalizarValor(valorTexto: string): number {
  const limpo = valorTexto.trim();

  // Se tem vírgula E ponto, assume formato BR completo (1.234,56) —
  // remove pontos de milhar e troca vírgula por ponto decimal.
  // Se tem só vírgula, é decimal BR simples (4,50).
  // Se tem só ponto, já está em formato decimal padrão (200.00).
  let normalizado: string;
  if (limpo.includes(",") && limpo.includes(".")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  } else {
    normalizado = limpo;
  }

  const numero = parseFloat(normalizado);
  return Number.isNaN(numero) ? 0 : Math.abs(numero);
}

/**
 * Decide o tipo (entrada/saida) a partir do sinal do valor original.
 * Todos os 3 bancos observados usam essa convenção: valor negativo = saída.
 */
export function tipoPorSinal(valorTexto: string): "entrada" | "saida" {
  return valorTexto.trim().startsWith("-") ? "saida" : "entrada";
}

/**
 * Faz o parse bruto de um CSV usando papaparse, com as opções mais
 * comumente necessárias já configuradas. `delimiter` deixado vazio
 * ("") faz o papaparse tentar auto-detectar — mas os parsers de banco
 * devem informar explicitamente (',' ou ';') sempre que souberem,
 * porque a auto-detecção pode falhar em arquivos pequenos.
 */
export function parseCsvBruto(
  conteudo: string,
  delimiter: "," | ";" | "" = ""
): string[][] {
  const resultado = Papa.parse<string[]>(conteudo, {
    delimiter,
    skipEmptyLines: true,
  });

  return resultado.data;
}
