import { ParserBanco, ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";
import { parseCsvBruto, normalizarDataBR, normalizarValor, tipoPorSinal } from "@/database/parsers/csvUtils";

// Colunas: "Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"
const COLUNA_DATA = 0;
const COLUNA_LANCAMENTO = 1;
const COLUNA_DETALHES = 2;
const COLUNA_VALOR = 4;

/**
 * O CSV do BB observado veio com encoding corrompido (provavelmente
 * Latin-1/Windows-1252 lido como UTF-8), trocando acentos por "�".
 * Como não é viável adivinhar com certeza qual era o caractere original
 * em todos os casos, substituímos os padrões mais comuns conhecidos
 * (baseado no arquivo de exemplo real) por sua forma correta.
 *
 * Isso cobre a maioria dos casos reais do extrato do BB. Caracteres
 * "�" que sobrarem fora desses padrões são mantidos como estão —
 * melhor exibir um acento estranho do que perder a transação inteira.
 */
function corrigirEncoding(texto: string): string {
  return texto
    .replace(/Lan�amento/g, "Lançamento")
    .replace(/Sa�da/g, "Saída")
    .replace(/F�cil/g, "Fácil")
    .replace(/Cart�o/g, "Cartão")
    .replace(/N� documento/g, "Nº documento")
    .replace(/(\w)�(\w)/g, "$1ã$2"); // fallback genérico para "ã" no meio de palavras (ex: transações)
}

/**
 * Linhas que não são transações reais, e sim marcadores de resumo
 * do extrato do BB. Identificadas pelo texto da coluna "Lançamento".
 */
const LANCAMENTOS_IGNORADOS = ["saldo anterior", "saldo do dia", "s a l d o"];

function ehLinhaDeResumo(lancamento: string): boolean {
  const normalizado = lancamento.trim().toLowerCase();
  return LANCAMENTOS_IGNORADOS.some((ignorado) => normalizado === ignorado);
}

export const BancoDoBrasilParser: ParserBanco = {
  idBanco: "bb",
  nomeBanco: "Banco do Brasil",

  identificar(primeirasLinhas) {
    const cabecalho = corrigirEncoding(primeirasLinhas[0]?.toLowerCase() ?? "");
    return (
      cabecalho.includes("data") &&
      cabecalho.includes("lançamento") &&
      cabecalho.includes("detalhes") &&
      cabecalho.includes("tipo lançamento")
    );
  },

  parse(conteudoCsvBruto): ResultadoParse {
    const conteudoCsv = corrigirEncoding(conteudoCsvBruto);
    const linhas = parseCsvBruto(conteudoCsv, ",");
    const transacoes: TransacaoImportada[] = [];
    const linhasComErro: ResultadoParse["linhasComErro"] = [];

    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i];
      const numeroLinha = i + 1;

      if (!colunas || colunas.length < 5) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas?.join(",") ?? "",
          motivo: "Número de colunas inesperado",
        });
        continue;
      }

      const lancamento = colunas[COLUNA_LANCAMENTO]?.trim() ?? "";

      // Linhas de "Saldo Anterior" / "Saldo do dia" / "S A L D O" não são
      // transações — são marcadores de resumo do próprio extrato do BB.
      // Descartadas silenciosamente (não é erro, é esperado existirem).
      if (ehLinhaDeResumo(lancamento)) continue;

      const dataOriginal = colunas[COLUNA_DATA];
      const dataIso = normalizarDataBR(dataOriginal);

      if (!dataIso) {
        // "00/00/0000" também aparece nas linhas de saldo — se chegou
        // aqui é porque não foi pega pelo filtro de lançamento acima,
        // então registramos como erro real para investigação.
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(","),
          motivo: `Data inválida: "${dataOriginal}"`,
        });
        continue;
      }

      const detalhes = colunas[COLUNA_DETALHES]?.trim() ?? "";
      // Combina "Lançamento" (tipo, ex: "Pix - Enviado") + "Detalhes"
      // (quem/o quê, ex: "02/04 18:08 SELMA FUDOLI DINIZ")
      const descricao = detalhes ? `${lancamento} - ${detalhes}` : lancamento;

      if (!descricao) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(","),
          motivo: "Descrição vazia",
        });
        continue;
      }

      const valorOriginal = colunas[COLUNA_VALOR];

      transacoes.push({
        data: dataIso,
        descricao,
        valor: normalizarValor(valorOriginal),
        tipo: tipoPorSinal(valorOriginal),
      });
    }

    return { transacoes, linhasComErro, bancoDetectado: "bb" };
  },
};
