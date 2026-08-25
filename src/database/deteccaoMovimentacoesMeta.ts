/**
 * Detecção de "possíveis movimentações para metas" — usada SOMENTE no
 * preview de importação de CSV, para sinalizar visualmente transações
 * que talvez mereçam atenção do usuário (ex: "isso parece uma
 * transferência para uma reserva/caixinha").
 *
 * IMPORTANTE — leitura obrigatória antes de mexer neste arquivo:
 *
 * Esta é uma heurística PURAMENTE INFORMATIVA. Ela nunca:
 *   - cria um vínculo em meta_transacoes;
 *   - decide a qual meta uma transação pertence (ela nem SABE quais
 *     metas existem — não recebe nem consulta a lista de metas);
 *   - é chamada em nenhum momento além da montagem do preview
 *     (useImportacaoCsv.ts). Nunca é reconsultada depois que a
 *     transação já foi importada.
 *
 * A vinculação real de uma transação a uma meta é SEMPRE uma ação
 * explícita do usuário (ver VincularMetaModal.tsx), nunca decidida
 * aqui.
 *
 * Este arquivo é DELIBERADAMENTE separado de categorizacao.ts, mesmo
 * que a lista de palavras-chave abaixo tenha alguma sobreposição com
 * REGRAS_SISTEMA de lá (ex: "transferencia" aparece nos dois). São
 * perguntas diferentes:
 *   - categorizacao.ts responde "o que é essa transação?" (ex:
 *     Transporte, Mercado) e grava isso permanentemente em
 *     transacoes.categoria_id.
 *   - este arquivo responde "essa transação parece dinheiro sendo
 *     guardado ou retirado de uma reserva?" e NUNCA grava nada — o
 *     resultado só existe durante a sessão de preview, em memória.
 * Nunca importe uma lista de dentro da outra: isso criaria acoplamento
 * acidental entre dois sistemas que precisam poder evoluir
 * independentemente (ver ponto 5 do planejamento da feature).
 */

const PALAVRAS_MOVIMENTACAO_META = [
  "caixinha",
  "cofrinho",
  "poupanca",
  "poupança",
  "reserva",
  "reserva de emergencia",
  "reserva de emergência",
  "aplicacao",
  "aplicação",
  "aplicar",
  "resgate",
  "investimento",
  "investir",
  "cdb",
  "tesouro",
  "guardar",
  "guardado",
  "objetivo",
  "meta",
  "vaquinha",
];

/**
 * Normaliza uma descrição para comparação: minúsculas, sem acentos,
 * sem espaços duplicados. Mesma técnica usada em outros pontos do
 * app (ex: normalizarPadraoDescricao em categorizacao.ts), mas
 * implementada aqui de forma independente de propósito — este arquivo
 * não deve importar de categorizacao.ts (ver nota no topo).
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retorna true se a descrição de uma transação (ainda não importada)
 * contém algum sinal de que pode representar dinheiro entrando ou
 * saindo de uma reserva/objetivo financeiro. Puramente textual — não
 * olha valor, tipo, banco ou qualquer outro campo, porque o objetivo é
 * só chamar atenção do usuário na tela de preview, nunca decidir nada
 * por ele.
 */
export function pareceMovimentacaoParaMeta(descricao: string): boolean {
  const normalizada = normalizar(descricao);
  return PALAVRAS_MOVIMENTACAO_META.some((palavra) => normalizada.includes(palavra));
}