import { ParserBanco, ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";
import { parseCsvBruto, normalizarDataBR, normalizarValor, tipoPorSinal } from "@/database/parsers/csvUtils";

// Índices de coluna esperados no cabeçalho: Data,Valor,Identificador,Descrição
const COLUNA_DATA = 0;
const COLUNA_VALOR = 1;
const COLUNA_IDENTIFICADOR = 2;
const COLUNA_DESCRICAO = 3;

export const NubankParser: ParserBanco = {
  idBanco: "nubank",
  nomeBanco: "Nubank",

  identificar(primeirasLinhas) {
    const cabecalho = primeirasLinhas[0]?.toLowerCase() ?? "";
    return (
      cabecalho.includes("data") &&
      cabecalho.includes("valor") &&
      cabecalho.includes("identificador") &&
      cabecalho.includes("descrição")
    );
  },

  parse(conteudoCsv): ResultadoParse {
    const linhas = parseCsvBruto(conteudoCsv, ",");
    const transacoes: TransacaoImportada[] = [];
    const linhasComErro: ResultadoParse["linhasComErro"] = [];

    // Pula a linha 0 (cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      const colunas = linhas[i];
      const numeroLinha = i + 1;

      if (!colunas || colunas.length < 4) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas?.join(",") ?? "",
          motivo: "Número de colunas inesperado",
        });
        continue;
      }

      const dataOriginal = colunas[COLUNA_DATA];
      const dataIso = normalizarDataBR(dataOriginal);

      if (!dataIso) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(","),
          motivo: `Data inválida: "${dataOriginal}"`,
        });
        continue;
      }

      const valorOriginal = colunas[COLUNA_VALOR];
      const descricao = colunas[COLUNA_DESCRICAO]?.trim();

      if (!descricao) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(","),
          motivo: "Descrição vazia",
        });
        continue;
      }

      transacoes.push({
        data: dataIso,
        descricao,
        valor: normalizarValor(valorOriginal),
        tipo: tipoPorSinal(valorOriginal),
        extra: {
          identificadorExterno: colunas[COLUNA_IDENTIFICADOR]?.trim() || undefined,
        },
      });
    }

    return { transacoes, linhasComErro, bancoDetectado: "nubank" };
  },
};
