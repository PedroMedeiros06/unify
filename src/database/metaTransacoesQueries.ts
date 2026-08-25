import { getDatabase, executarNaFila } from "./database";

/**
 * Relação MANUAL entre uma transação e uma meta. Nunca criada
 * automaticamente por categorização, palavra-chave, regra aprendida,
 * similaridade ou qualquer heurística — a única forma de existir uma
 * linha aqui é o usuário escolher explicitamente "Vincular à meta" em
 * uma transação e confirmar o valor.
 *
 * `valorVinculado` carrega o SINAL: positivo aumenta o progresso da
 * meta (ex: transferência para uma reserva), negativo diminui (ex:
 * retirada da reserva). Não precisa ser igual ao valor da transação —
 * o usuário pode vincular só uma parte dela — mas nunca pode
 * ultrapassar |valor da transação| em módulo (garantido pelas funções
 * abaixo, não pelo schema).
 */
export type VinculoMetaTransacao = {
  id: string;
  metaId: string;
  transacaoId: string;
  valorVinculado: number;
  criadoEm: string;
};

/** Resumo do vínculo de uma transação específica, com o nome da meta já resolvido — usado por EditarTransacaoModal para exibir "🎯 Meta: X". */
export type VinculoDaTransacao = {
  metaId: string;
  metaNome: string;
  metaIcone: string;
  metaCor: string;
  valorVinculado: number;
};

/** Um item do histórico de uma meta — o vínculo com os dados relevantes da transação de origem já resolvidos via JOIN. */
export type ItemHistoricoMeta = {
  id: string;
  transacaoId: string;
  valorVinculado: number;
  transacaoNome: string;
  transacaoData: string; // ISO
  criadoEm: string;
};

/**
 * Cria (ou substitui, se já existisse) o vínculo entre uma transação e
 * uma meta. UNIQUE(meta_id, transacao_id) no schema garante que nunca
 * há duas linhas para o mesmo par — por isso o UPSERT aqui é seguro
 * mesmo que o chamador tente vincular de novo por engano.
 *
 * Não faz NENHUMA validação de "essa transação parece combinar com
 * essa meta" — é puramente mecânico. A decisão de qual meta e qual
 * valor é sempre do usuário, resolvida antes desta chamada (ver
 * VincularMetaModal).
 */
export async function vincularTransacaoAMeta(
  metaId: string,
  transacaoId: string,
  valorVinculado: number
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const id = `vinculo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.runAsync(
      `INSERT INTO meta_transacoes (id, meta_id, transacao_id, valor_vinculado)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(meta_id, transacao_id) DO UPDATE SET
         valor_vinculado = excluded.valor_vinculado;`,
      [id, metaId, transacaoId, valorVinculado]
    );
  });
}

/**
 * Remove o vínculo de uma transação com uma meta específica. A
 * transação em si nunca é afetada — só a linha de relação some, e o
 * progresso da meta reflete isso automaticamente na próxima leitura
 * (não há nada para "recalcular manualmente", já que o progresso é
 * sempre derivado via SUM).
 */
export async function desvincularTransacao(metaId: string, transacaoId: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM meta_transacoes WHERE meta_id = ? AND transacao_id = ?;`,
      [metaId, transacaoId]
    );
  });
}

/**
 * Remove QUALQUER vínculo existente para uma transação, independente
 * da meta — usado quando o usuário troca o tipo (entrada/saída) de
 * uma transação vinculada e decide "remover vínculo e salvar" em vez
 * de cancelar a edição (ver regra de mudança de sinal em
 * EditarTransacaoModal). Como uma transação só pode ter um vínculo por
 * vez no MVP (UNIQUE por par, e a UI nunca oferece vincular a uma
 * segunda meta), isso na prática remove no máximo uma linha.
 */
export async function desvincularTodosDaTransacao(transacaoId: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM meta_transacoes WHERE transacao_id = ?;`, [transacaoId]);
  });
}

/**
 * "Alterar meta": move o vínculo de uma transação de uma meta para
 * outra, preservando o valor vinculado. Implementado como
 * desvincular + vincular (não como UPDATE direto de meta_id) para
 * reaproveitar as mesmas garantias de UNIQUE e manter a lógica em um
 * único lugar — não é uma operação nova de schema, é a composição das
 * duas funções acima.
 */
export async function alterarMetaDoVinculo(
  transacaoId: string,
  metaIdAntiga: string,
  metaIdNova: string,
  valorVinculado: number
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM meta_transacoes WHERE meta_id = ? AND transacao_id = ?;`,
      [metaIdAntiga, transacaoId]
    );
    const id = `vinculo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      `INSERT INTO meta_transacoes (id, meta_id, transacao_id, valor_vinculado)
       VALUES (?, ?, ?, ?);`,
      [id, metaIdNova, transacaoId, valorVinculado]
    );
  });
}

/**
 * Ajusta o valor vinculado de uma transação já vinculada, sem trocar
 * de meta — usado pelo clamp automático quando o valor da transação é
 * editado para algo menor (ver regra de edição em
 * TransacoesContext/queries.ts). Nunca cria um vínculo novo; se não
 * existir vínculo para o par, não faz nada.
 */
export async function ajustarValorVinculado(
  metaId: string,
  transacaoId: string,
  novoValorVinculado: number
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE meta_transacoes SET valor_vinculado = ? WHERE meta_id = ? AND transacao_id = ?;`,
      [novoValorVinculado, metaId, transacaoId]
    );
  });
}

/**
 * Progresso ATUAL de uma meta — sempre calculado, nunca lido de uma
 * coluna cacheada. É a soma de todos os valores vinculados (com
 * sinal), então entradas somam e saídas subtraem naturalmente.
 * Chamada por listarMetas() em metasQueries.ts para popular
 * Meta.progressoAtual; o resto do app nunca deveria chamar isso
 * diretamente, só ler o campo já resolvido no objeto Meta.
 */
export async function calcularProgressoMeta(metaId: string): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const resultado = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(valor_vinculado), 0) as total FROM meta_transacoes WHERE meta_id = ?;`,
      [metaId]
    );
    return resultado?.total ?? 0;
  });
}

/**
 * Progresso de TODAS as metas de uma vez, como um Map metaId -> total.
 * Usado por listarMetas() para popular a lista inteira sem disparar
 * uma query por meta (evita N+1) — uma única GROUP BY cobre todas.
 */
export async function calcularProgressoDeTodasAsMetas(): Promise<Map<string, number>> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<{ meta_id: string; total: number }>(
      `SELECT meta_id, COALESCE(SUM(valor_vinculado), 0) as total
       FROM meta_transacoes
       GROUP BY meta_id;`
    );
    return new Map(linhas.map((l) => [l.meta_id, l.total]));
  });
}

/**
 * Retorna o vínculo de uma transação específica, já com o nome/ícone/
 * cor da meta resolvidos via JOIN — usado por EditarTransacaoModal
 * para saber se deve mostrar "Vincular à meta" ou "🎯 Meta: X". Retorna
 * null se a transação não tiver nenhum vínculo (caso comum).
 */
export async function obterVinculoDaTransacao(transacaoId: string): Promise<VinculoDaTransacao | null> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<{
      meta_id: string;
      meta_nome: string;
      meta_icone: string;
      meta_cor: string;
      valor_vinculado: number;
    }>(
      `SELECT
         mt.meta_id as meta_id, m.nome as meta_nome, m.icone as meta_icone, m.cor as meta_cor,
         mt.valor_vinculado as valor_vinculado
       FROM meta_transacoes mt
       INNER JOIN metas m ON m.id = mt.meta_id
       WHERE mt.transacao_id = ?
       LIMIT 1;`,
      [transacaoId]
    );

    if (!linha) return null;

    return {
      metaId: linha.meta_id,
      metaNome: linha.meta_nome,
      metaIcone: linha.meta_icone,
      metaCor: linha.meta_cor,
      valorVinculado: linha.valor_vinculado,
    };
  });
}

/**
 * Histórico de vínculos de uma meta, mais recentes primeiro, já com
 * nome/data da transação de origem resolvidos — base para a futura
 * seção "Histórico" na tela de detalhe da meta (ver item 11 do
 * planejamento). Não é consumida por nenhuma tela ainda nesta rodada,
 * mas a query já fica pronta para uso.
 */
export async function listarHistoricoDaMeta(metaId: string): Promise<ItemHistoricoMeta[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<{
      id: string;
      transacao_id: string;
      valor_vinculado: number;
      transacao_nome: string;
      transacao_data: string;
      criado_em: string;
    }>(
      `SELECT
         mt.id as id, mt.transacao_id as transacao_id, mt.valor_vinculado as valor_vinculado,
         t.nome as transacao_nome, t.data as transacao_data, mt.criado_em as criado_em
       FROM meta_transacoes mt
       INNER JOIN transacoes t ON t.id = mt.transacao_id
       WHERE mt.meta_id = ?
       ORDER BY t.data DESC, mt.criado_em DESC;`,
      [metaId]
    );

    return linhas.map((l) => ({
      id: l.id,
      transacaoId: l.transacao_id,
      valorVinculado: l.valor_vinculado,
      transacaoNome: l.transacao_nome,
      transacaoData: l.transacao_data,
      criadoEm: l.criado_em,
    }));
  });
}

/**
 * Aplica a regra de clamp quando o VALOR de uma transação vinculada é
 * editado para um valor menor (em módulo), mantendo o MESMO sinal:
 *
 *   - se |novoValor| < |valorVinculado atual| → reduz valorVinculado
 *     para caber dentro do novo valor da transação (nunca ultrapassa);
 *   - se |novoValor| >= |valorVinculado atual| → não faz nada (o valor
 *     extra da transação NÃO é atribuído automaticamente à meta).
 *
 * Não deve ser chamada quando o SINAL da transação muda (entrada vira
 * saída ou vice-versa) — esse caso exige confirmação explícita do
 * usuário e é tratado à parte em EditarTransacaoModal, nunca por
 * clamp automático (ver regra de edição no planejamento da feature).
 *
 * Seguro chamar sempre depois de editar uma transação, mesmo que na
 * maioria das vezes não haja vínculo — nesse caso é um no-op barato
 * (uma única leitura que retorna null).
 */
export async function ajustarVinculoAposEdicaoDeValor(
  transacaoId: string,
  novoValorTransacao: number
): Promise<void> {
  const vinculo = await obterVinculoDaTransacao(transacaoId);
  if (!vinculo) return;

  const sinal = vinculo.valorVinculado >= 0 ? 1 : -1;
  const novoValorVinculadoMaximo = novoValorTransacao * sinal;

  // Só reduz — nunca aumenta o valor vinculado sozinho, mesmo que a
  // transação tenha crescido de valor.
  if (Math.abs(novoValorVinculadoMaximo) < Math.abs(vinculo.valorVinculado)) {
    await ajustarValorVinculado(vinculo.metaId, transacaoId, novoValorVinculadoMaximo);
  }
}