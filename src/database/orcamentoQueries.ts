import { gerarOcorrenciasDoMes } from "./gerarOcorrenciasPrevistas";

/**
 * Camada de resumo do Orçamento (PREVISTO).
 *
 * O resumo é calculado EXCLUSIVAMENTE sobre as ocorrências previstas do
 * mês (via `gerarOcorrenciasDoMes`), nunca somando `recorrencias`
 * diretamente:
 *  - mês congelado / anterior à âncora -> só os snapshots persistidos;
 *  - mês vivo -> previsões atuais (linhas materializadas + dinâmicas).
 *
 * Ocorrências com `pulado = 1` NÃO entram nos totais, mas continuam no
 * banco — a UI ainda vai querer mostrá-las como "pulada". Aqui elas só
 * são contadas à parte (`quantidadePuladas`).
 *
 * Esta camada é só previsão. Realizado, limites e correspondência com
 * transações são de fases seguintes. Nada aqui cria ou altera transação.
 */

export type ResumoPrevistoMes = {
  mesAno: string; // "aaaa-mm"
  receitasPrevistas: number; // soma das ocorrências tipo "entrada" não puladas
  despesasPrevistas: number; // soma das ocorrências tipo "saida" não puladas
  saldoPrevisto: number; // receitasPrevistas - despesasPrevistas
  quantidadeOcorrencias: number; // ocorrências que entraram no total
  quantidadePuladas: number; // ocorrências ignoradas por `pulado`
};

export async function obterResumoPrevistoDoMes(mesAno: string): Promise<ResumoPrevistoMes> {
  const ocorrencias = await gerarOcorrenciasDoMes(mesAno);

  let receitasPrevistas = 0;
  let despesasPrevistas = 0;
  let quantidadeOcorrencias = 0;
  let quantidadePuladas = 0;

  for (const ocorrencia of ocorrencias) {
    if (ocorrencia.pulado) {
      quantidadePuladas++;
      continue;
    }

    quantidadeOcorrencias++;
    if (ocorrencia.tipo === "entrada") {
      receitasPrevistas += ocorrencia.valorPrevisto;
    } else {
      despesasPrevistas += ocorrencia.valorPrevisto;
    }
  }

  return {
    mesAno,
    receitasPrevistas,
    despesasPrevistas,
    saldoPrevisto: receitasPrevistas - despesasPrevistas,
    quantidadeOcorrencias,
    quantidadePuladas,
  };
}
