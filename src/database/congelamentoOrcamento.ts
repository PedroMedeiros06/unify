import { dataHojeIso } from "@/utils/dateUtils";
import { materializarOcorrenciasDoMes } from "./gerarOcorrenciasPrevistas";
import {
  obterAncoraOrcamento,
  definirAncoraOrcamento,
  mesEstaCongelado,
  marcarMesCongelado,
} from "./ocorrenciasPrevistasQueries";

/**
 * Congelamento de meses encerrados.
 *
 * Roda uma vez no boot (ver RecorrenciasProvider). Para todo mês entre a
 * âncora de início de uso (inclusive) e o mês atual (exclusive) que
 * ainda não está congelado:
 *   1. materializa TODAS as ocorrências previstas faltantes do mês;
 *   2. só então marca o mês como congelado.
 *
 * Garantias:
 *  - Respeita a âncora: nada anterior a ela é tocado (o loop começa nela)
 *    e `gerarOcorrenciasDoMes` já trata mês pré-âncora como snapshot-only.
 *  - Ordem 1→2 por mês: se a materialização lançar, `marcarMesCongelado`
 *    não é chamado — o mês NÃO fica congelado sem suas ocorrências. O
 *    próximo boot retoma daquele mês.
 *  - Idempotente: meses já congelados são pulados; `materializar...` usa
 *    INSERT ON CONFLICT DO NOTHING; `marcarMesCongelado` não reescreve um
 *    `congelado_em` já existente. Rodar de novo não altera snapshots nem
 *    recongela nada.
 *  - Não cria transações.
 *
 * Retorna a lista de meses congelados nesta execução (vazia é o caso
 * normal em boots subsequentes).
 */
export async function congelarMesesEncerrados(): Promise<{ congelados: string[] }> {
  const mesAtual = mesAnoDeHoje();

  let ancora = await obterAncoraOrcamento();

  // Primeiro boot após a migration 10: fixa a âncora no mês atual. Não
  // há histórico anterior para congelar — o mês atual continua vivo.
  if (ancora == null) {
    await definirAncoraOrcamento(mesAtual);
    return { congelados: [] };
  }

  // Defensivo: relógio do dispositivo atrás da âncora — nada a fazer.
  if (ancora > mesAtual) {
    return { congelados: [] };
  }

  const congelados: string[] = [];

  for (let mes = ancora; mes < mesAtual; mes = proximoMesAno(mes)) {
    if (await mesEstaCongelado(mes)) continue;

    // (1) Materializa tudo que falta. Se lançar, propaga: o mês fica
    //     sem marca de congelado e a próxima execução retoma daqui.
    await materializarOcorrenciasDoMes(mes);

    // (2) Só agora — materialização OK — marca como congelado.
    await marcarMesCongelado(mes);
    congelados.push(mes);
  }

  return { congelados };
}

/** "aaaa-mm" do mês corrente, a partir da data local (mesmo critério do resto do app). */
function mesAnoDeHoje(): string {
  return dataHojeIso().slice(0, 7);
}

/** Próximo mês de um "aaaa-mm" (vira o ano em dezembro). Comparação de meses é lexical. */
function proximoMesAno(mesAno: string): string {
  const [ano, mes1a12] = mesAno.split("-").map(Number);
  const proximo = new Date(ano, mes1a12, 1); // mes1a12 (1-based) já é o mês seguinte em base 0
  return `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}`;
}
