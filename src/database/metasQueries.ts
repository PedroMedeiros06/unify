import { getDatabase, executarNaFila } from "./database";
import { calcularProgressoDeTodasAsMetas, calcularProgressoMeta } from "./metaTransacoesQueries";

export type Meta = {
  id: string;
  nome: string;
  valorMeta: number;
  // Derivado de SUM(valor_vinculado) em meta_transacoes — nunca lido
  // diretamente da coluna `progresso_atual` do banco (que existe só
  // como resquício de schema; ver metaTransacoesQueries.ts). Toda
  // função que retorna Meta abaixo já popula este campo calculado, o
  // resto do app (MetasFinanceiras, MinhasMetas, calcularPercentualMeta
  // etc.) continua consumindo normalmente sem saber da mudança.
  progressoAtual: number;
  icone: string;
  cor: string;
  dataAlvo: string | null; // ISO "aaaa-mm-dd" — prazo final da meta, não um depósito específico
  criadoEm: string;
};

/**
 * Campos aceitos ao criar/editar uma meta. NÃO inclui progressoAtual —
 * o progresso nunca é um input direto do usuário desde a introdução da
 * relação meta_transacoes; ele só muda através de vincular/desvincular
 * transações. Uma meta sempre nasce com progresso 0 (sem vínculos).
 */
export type CamposMeta = {
  nome: string;
  valorMeta: number;
  icone: string;
  cor: string;
  dataAlvo: string | null;
};

type LinhaBrutaMeta = {
  id: string;
  nome: string;
  valorMeta: number;
  icone: string;
  cor: string;
  dataAlvo: string | null;
  criadoEm: string;
};

export async function listarMetas(): Promise<Meta[]> {
  const linhas = await executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<LinhaBrutaMeta>(
      `SELECT
         id, nome, valor_meta as valorMeta,
         icone, cor, data_alvo as dataAlvo, criado_em as criadoEm
       FROM metas
       ORDER BY criado_em DESC;`
    );
  });

  // Uma única query agregada para todas as metas de uma vez (evita
  // N+1 — ver calcularProgressoDeTodasAsMetas), depois combinada em
  // memória com a lista já carregada.
  const progressoPorMeta = await calcularProgressoDeTodasAsMetas();

  return linhas.map((linha) => ({
    ...linha,
    progressoAtual: progressoPorMeta.get(linha.id) ?? 0,
  }));
}

export async function inserirMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    // progresso_atual sempre nasce em 0 — a coluna continua existindo
    // no schema (não vale a pena uma migration de remoção agora), mas
    // nenhuma escrita além deste 0 inicial passa por ela nunca mais;
    // o valor real do progresso é sempre lido via meta_transacoes.
    await db.runAsync(
      `INSERT INTO metas (id, nome, valor_meta, progresso_atual, icone, cor, data_alvo)
       VALUES (?, ?, ?, 0, ?, ?, ?);`,
      [id, campos.nome, campos.valorMeta, campos.icone, campos.cor, campos.dataAlvo]
    );
  });
}

export async function atualizarMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    // Note que progresso_atual NÃO está nesta cláusula SET — editar
    // uma meta nunca toca no progresso, que só muda via vincular/
    // desvincular transações.
    await db.runAsync(
      `UPDATE metas
       SET nome = ?, valor_meta = ?, icone = ?, cor = ?, data_alvo = ?
       WHERE id = ?;`,
      [campos.nome, campos.valorMeta, campos.icone, campos.cor, campos.dataAlvo, id]
    );
  });
}

export async function excluirMeta(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    // ON DELETE CASCADE em meta_transacoes.meta_id remove os vínculos
    // relacionados automaticamente (depende de PRAGMA foreign_keys =
    // ON, ativado em database.ts).
    await db.runAsync(`DELETE FROM metas WHERE id = ?;`, [id]);
  });
}

/**
 * Retorna a meta com maior percentual de progresso (progressoAtual /
 * valorMeta), ou null se não houver nenhuma meta cadastrada. Usado por
 * ResumoMetrics e PerfilCard para "% de meta atingida" quando o
 * usuário tem várias metas — critério definido: sempre a de maior progresso.
 */
export async function obterMetaDeMaiorProgresso(): Promise<Meta | null> {
  const metas = await listarMetas();
  if (metas.length === 0) return null;

  return metas.reduce((melhor, atual) => {
    const progressoMelhor = melhor.valorMeta > 0 ? melhor.progressoAtual / melhor.valorMeta : 0;
    const progressoAtualCalc = atual.valorMeta > 0 ? atual.progressoAtual / atual.valorMeta : 0;
    return progressoAtualCalc > progressoMelhor ? atual : melhor;
  });
}

/**
 * Lista apenas as metas com prazo (data_alvo) dentro do intervalo
 * [inicioIso, fimIso] (ambos inclusive) — usado pela Agenda para
 * plotar no calendário. Metas sem data_alvo nunca aparecem aqui
 * (ficam só na lista normal de Metas do Planejamento).
 */
export async function listarMetasComPrazoNoPeriodo(
  inicioIso: string,
  fimIso: string
): Promise<Meta[]> {
  const linhas = await executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<LinhaBrutaMeta>(
      `SELECT
         id, nome, valor_meta as valorMeta,
         icone, cor, data_alvo as dataAlvo, criado_em as criadoEm
       FROM metas
       WHERE data_alvo IS NOT NULL AND data_alvo >= ? AND data_alvo <= ?
       ORDER BY data_alvo ASC;`,
      [inicioIso, fimIso]
    );
  });

  // Poucas metas tendem a cair num período específico, então uma
  // query de progresso por item aqui é aceitável (diferente de
  // listarMetas(), que carrega TODAS as metas de uma vez).
  const comProgresso = await Promise.all(
    linhas.map(async (linha) => ({
      ...linha,
      progressoAtual: await calcularProgressoMeta(linha.id),
    }))
  );

  return comProgresso;
}

/**
 * Calcula quanto guardar por dia e por mês para atingir o valor
 * restante da meta até sua data_alvo. Retorna null se a meta não tiver
 * data_alvo, se o prazo já passou, ou se a meta já foi atingida —
 * nesses casos não há "quanto guardar" a calcular.
 *
 * Cálculo simples (valor_restante / dias_restantes) — sem juros,
 * sem considerar rendimento; é uma estimativa de ritmo de poupança,
 * não uma simulação financeira.
 */
export function calcularRitmoNecessario(meta: Meta): { porDia: number; porMes: number } | null {
  if (!meta.dataAlvo) return null;

  const valorRestante = meta.valorMeta - meta.progressoAtual;
  if (valorRestante <= 0) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = meta.dataAlvo.split("-").map(Number);
  const alvo = new Date(ano, mes - 1, dia);

  const diasRestantes = Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes <= 0) return null;

  const porDia = valorRestante / diasRestantes;
  const porMes = porDia * 30;

  return { porDia, porMes };
}

/**
 * Percentual de progresso de uma meta (0-100), sempre limitado a 100
 * mesmo que progressoAtual ultrapasse valorMeta — evita barras de
 * progresso e textos como "127% concluído".
 */
export function calcularPercentualMeta(meta: Meta): number {
  if (meta.valorMeta <= 0) return 0;
  return Math.min(100, Math.round((meta.progressoAtual / meta.valorMeta) * 100));
}

/**
 * Uma meta é "concluída" quando o progresso atinge (ou ultrapassa) o
 * valor objetivo. Isso é sempre CALCULADO a partir de progressoAtual/
 * valorMeta, nunca um campo próprio no banco.
 */
export function metaEstaConcluida(meta: Meta): boolean {
  return meta.valorMeta > 0 && meta.progressoAtual >= meta.valorMeta;
}