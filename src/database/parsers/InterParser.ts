import { ParserBanco, ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";
import { parseCsvBruto, normalizarDataBR, normalizarValor, tipoPorSinal } from "@/database/parsers/csvUtils";

// Colunas no cabeçalho real: Data Lançamento;Histórico;Descrição;Valor;Saldo
const COLUNA_DATA = 0;
const COLUNA_HISTORICO = 1;
const COLUNA_DESCRICAO = 2;
const COLUNA_VALOR = 3;

/**
 * O extrato do Inter tem 5 linhas de metadata (título, número da conta,
 * período, saldo) ANTES do cabeçalho real da tabela. Esta função localiza
 * a linha onde a tabela de fato começa, procurando pelo cabeçalho conhecido.
 */
function localizarLinhaCabecalho(linhas: string[][]): number {
  for (let i = 0; i < linhas.length; i++) {
    const primeiraColuna = linhas[i][0]?.toLowerCase() ?? "";
    if (primeiraColuna.includes("data") && linhas[i].length >= 5) {
      return i;
    }
  }
  return -1;
}

export const InterParser: ParserBanco = {
  idBanco: "inter",
  nomeBanco: "Inter",

  identificar(primeirasLinhas) {
    // O Inter começa o arquivo com " Extrato Conta Corrente " —
    // texto característico o suficiente para identificar sem
    // precisar parsear a tabela inteira.
    const primeiraLinha = primeirasLinhas[0]?.toLowerCase() ?? "";
    return primeiraLinha.includes("extrato conta corrente");
  },

  parse(conteudoCsv): ResultadoParse {
    const linhas = parseCsvBruto(conteudoCsv, ";");
    const transacoes: TransacaoImportada[] = [];
    const linhasComErro: ResultadoParse["linhasComErro"] = [];

    const linhaCabecalho = localizarLinhaCabecalho(linhas);

    if (linhaCabecalho === -1) {
      return {
        transacoes: [],
        linhasComErro: [
          {
            numeroLinha: 0,
            conteudoOriginal: "",
            motivo: "Não foi possível localizar o cabeçalho da tabela de transações no arquivo do Inter",
          },
        ],
        bancoDetectado: "inter",
      };
    }

    for (let i = linhaCabecalho + 1; i < linhas.length; i++) {
      const colunas = linhas[i];
      const numeroLinha = i + 1;

      if (!colunas || colunas.length < 4) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas?.join(";") ?? "",
          motivo: "Número de colunas inesperado",
        });
        continue;
      }

      const dataOriginal = colunas[COLUNA_DATA];
      const dataIso = normalizarDataBR(dataOriginal);

      if (!dataIso) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(";"),
          motivo: `Data inválida: "${dataOriginal}"`,
        });
        continue;
      }

      const historico = colunas[COLUNA_HISTORICO]?.trim() ?? "";
      const descricaoDetalhe = colunas[COLUNA_DESCRICAO]?.trim() ?? "";
      // Combina "Histórico" (tipo de operação) + "Descrição" (quem/o quê)
      // em uma única descrição legível, ex: "Pix enviado - Filipe Silveira Santana"
      const descricao = descricaoDetalhe ? `${historico} - ${descricaoDetalhe}` : historico;

      if (!descricao) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: colunas.join(";"),
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

    return { transacoes, linhasComErro, bancoDetectado: "inter" };
  },
};
