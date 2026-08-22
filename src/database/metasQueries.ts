import { getDatabase, executarNaFila } from "./database";

export type Meta = {
  id: string;
  nome: string;
  valorMeta: number;
  progressoAtual: number;
  icone: string;
  cor: string;
  dataAlvo: string | null; // ISO "aaaa-mm-dd" — prazo final da meta, não um depósito específico
  criadoEm: string;
};

export type CamposMeta = {
  nome: string;
  valorMeta: number;
  progressoAtual: number;
  icone: string;
  cor: string;
  dataAlvo: string | null;
};

export async function listarMetas(): Promise<Meta[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Meta>(
      `SELECT
         id, nome, valor_meta as valorMeta, progresso_atual as progressoAtual,
         icone, cor, data_alvo as dataAlvo, criado_em as criadoEm
       FROM metas
       ORDER BY criado_em DESC;`
    );
  });
}

export async function inserirMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO metas (id, nome, valor_meta, progresso_atual, icone, cor, data_alvo)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [id, campos.nome, campos.valorMeta, campos.progressoAtual, campos.icone, campos.cor, campos.dataAlvo]
    );
  });
}

export async function atualizarMeta(id: string, campos: CamposMeta): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE metas
       SET nome = ?, valor_meta = ?, progresso_atual = ?, icone = ?, cor = ?, data_alvo = ?
       WHERE id = ?;`,
      [campos.nome, campos.valorMeta, campos.progressoAtual, campos.icone, campos.cor, campos.dataAlvo, id]
    );
  });
}

export async function excluirMeta(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
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
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Meta>(
      `SELECT
         id, nome, valor_meta as valorMeta, progresso_atual as progressoAtual,
         icone, cor, data_alvo as dataAlvo, criado_em as criadoEm
       FROM metas
       WHERE data_alvo IS NOT NULL AND data_alvo >= ? AND data_alvo <= ?
       ORDER BY data_alvo ASC;`,
      [inicioIso, fimIso]
    );
  });
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
 * valorMeta, nunca um campo próprio no banco — não existe estado
 * "concluída" independente do progresso numérico, então guardar isso
 * como coluna só criaria uma segunda fonte de verdade para manter
 * sincronizada. Qualquer tela que precise separar "em andamento" de
 * "concluídas" deve filtrar a lista de listarMetas() com esta função.
 */
export function metaEstaConcluida(meta: Meta): boolean {
  return meta.valorMeta > 0 && meta.progressoAtual >= meta.valorMeta;
}