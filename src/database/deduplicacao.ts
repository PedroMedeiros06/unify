import { listarTransacoesPorPeriodo, existeIdentificadorExterno } from "@/database/queries";
import { TransacaoImportada } from "@/database/parsers/TransacaoImportada";

export type TransacaoComStatusDuplicata = TransacaoImportada & {
  possivelDuplicata: boolean;
  motivoDuplicata: string | null;
};

/**
 * Normaliza uma descrição para comparação "aproximada": minúsculas,
 * sem acentos, sem espaços duplicados/extras. Isso evita falso-negativo
 * quando a mesma transação aparece com capitalização ou espaçamento
 * levemente diferente entre importações (algo comum em extratos).
 */
function normalizarDescricaoParaComparacao(descricao: string): string {
  return descricao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compara duas descrições de forma "próxima o suficiente": iguais após
 * normalização, OU uma contém a outra (cobre casos onde um extrato trunca
 * a descrição e outro não). Suficiente para o volume e padrão de dados
 * observado nos extratos reais testados (Inter, BB) — não é comparação
 * fuzzy sofisticada (ex: distância de Levenshtein), que seria over-engineering
 * para este estágio do projeto.
 */
function descricoesSaoParecidas(a: string, b: string): boolean {
  const normA = normalizarDescricaoParaComparacao(a);
  const normB = normalizarDescricaoParaComparacao(b);
  if (normA === normB) return true;
  if (normA.length > 10 && normB.length > 10) {
    return normA.includes(normB) || normB.includes(normA);
  }
  return false;
}

/**
 * Analisa uma lista de transações recém-importadas (de um parser de CSV)
 * e marca quais são possíveis duplicatas de transações já existentes no
 * banco para aquele mesmo banco de origem.
 *
 * Estratégia por banco de origem:
 * - Nubank (tem `identificadorExterno`): comparação EXATA por esse ID.
 *   Confiável — se o ID bate, é certamente a mesma transação.
 * - Inter/BB (sem ID externo): comparação APROXIMADA por
 *   data + valor + descrição parecida. Pode ter falso positivo raro
 *   (duas compras idênticas no mesmo dia, mesmo valor, mesmo estabelecimento),
 *   por isso a decisão final fica com o usuário na tela de preview —
 *   nunca bloqueamos automaticamente.
 */
export async function marcarPossiveisDuplicatas(
  transacoes: TransacaoImportada[],
  bancoId: string
): Promise<TransacaoComStatusDuplicata[]> {
  if (transacoes.length === 0) return [];

  const temIdentificadorExterno = transacoes.some((t) => t.extra?.identificadorExterno);

  if (temIdentificadorExterno) {
    return marcarDuplicatasPorIdExterno(transacoes);
  }

  return marcarDuplicatasPorSimilaridade(transacoes, bancoId);
}

async function marcarDuplicatasPorIdExterno(
  transacoes: TransacaoImportada[]
): Promise<TransacaoComStatusDuplicata[]> {
  const resultado: TransacaoComStatusDuplicata[] = [];

  for (const transacao of transacoes) {
    const id = transacao.extra?.identificadorExterno;

    if (!id) {
      resultado.push({ ...transacao, possivelDuplicata: false, motivoDuplicata: null });
      continue;
    }

    const jaExiste = await existeIdentificadorExterno(id);
    resultado.push({
      ...transacao,
      possivelDuplicata: jaExiste,
      motivoDuplicata: jaExiste ? "Esta transação já foi importada anteriormente" : null,
    });
  }

  return resultado;
}

async function marcarDuplicatasPorSimilaridade(
  transacoes: TransacaoImportada[],
  bancoId: string
): Promise<TransacaoComStatusDuplicata[]> {
  const datas = transacoes.map((t) => t.data).sort();
  const dataInicio = datas[0];
  const dataFim = datas[datas.length - 1];

  // Busca só as transações do período coberto pelo arquivo importado,
  // em vez de carregar todo o histórico — mais eficiente conforme o
  // banco de dados do usuário cresce ao longo do tempo.
  const transacoesExistentes = await listarTransacoesPorPeriodo(bancoId, dataInicio, dataFim);

  return transacoes.map((transacao) => {
    const duplicataEncontrada = transacoesExistentes.find(
      (existente) =>
        existente.data === transacao.data &&
        Math.abs(existente.valor - transacao.valor) < 0.01 && // tolerância para arredondamento de ponto flutuante
        existente.tipo === transacao.tipo &&
        descricoesSaoParecidas(existente.nome, transacao.descricao)
    );

    return {
      ...transacao,
      possivelDuplicata: !!duplicataEncontrada,
      motivoDuplicata: duplicataEncontrada
        ? "Encontramos uma transação parecida na mesma data e valor"
        : null,
    };
  });
}
