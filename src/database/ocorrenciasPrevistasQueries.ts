import { getDatabase, executarNaFila } from "./database";
import { CategoriaId } from "./categorias";
import { TipoRecorrencia } from "./recorrenciasQueries";

/**
 * Leitura/escrita da tabela `ocorrencia_prevista` — a instância de uma
 * recorrência num mês específico.
 *
 * IMPORTANTE (ver comentário da migration 10):
 *  - Uma ocorrência prevista NÃO é uma transação e NÃO gera movimentação
 *    financeira. É planejamento.
 *  - Para meses VIVOS sem ajuste, a ocorrência normalmente NÃO tem linha
 *    aqui — é calculada dinamicamente (ver gerarOcorrenciasPrevistas.ts).
 *  - Uma linha só nasce quando: (a) o usuário ajusta aquele mês (ex:
 *    pular/alterar valor), ou (b) o mês é congelado (etapa 5).
 *  - Os campos nome/valor_previsto/tipo/data_prevista/categoria_id são
 *    SNAPSHOT: depois de gravados, alterar/excluir a recorrência não
 *    muda a linha. `recorrencia_id` vira NULL (ON DELETE SET NULL) se a
 *    regra for excluída — a linha permanece.
 */

export type OcorrenciaPrevista = {
  id: string;
  recorrenciaId: string | null;
  mesAno: string; // "aaaa-mm"
  nome: string;
  valorPrevisto: number;
  tipo: TipoRecorrencia;
  dataPrevista: string; // ISO "aaaa-mm-dd"
  categoriaId: CategoriaId | null;
  pulado: boolean;
  criadoEm: string;
};

/**
 * Campos gravados numa linha de ocorrência. `id`/`criadoEm` ficam de
 * fora (id gerado por quem chama; criado_em é DEFAULT do banco).
 */
export type CamposOcorrenciaPrevista = {
  recorrenciaId: string | null;
  mesAno: string;
  nome: string;
  valorPrevisto: number;
  tipo: TipoRecorrencia;
  dataPrevista: string;
  categoriaId: CategoriaId | null;
  pulado: boolean;
};

type LinhaBrutaOcorrencia = Omit<OcorrenciaPrevista, "pulado"> & { pulado: number };

function mapearLinha(linha: LinhaBrutaOcorrencia): OcorrenciaPrevista {
  return { ...linha, pulado: linha.pulado === 1 };
}

const SELECT_OCORRENCIA = `
  SELECT
    id,
    recorrencia_id as recorrenciaId,
    mes_ano        as mesAno,
    nome,
    valor_previsto as valorPrevisto,
    tipo,
    data_prevista  as dataPrevista,
    categoria_id   as categoriaId,
    pulado,
    criado_em      as criadoEm
  FROM ocorrencia_prevista
`;

/** Linhas JÁ MATERIALIZADAS do mês (ajustes do usuário + snapshots de mês congelado). */
export async function listarOcorrenciasPersistidasDoMes(mesAno: string): Promise<OcorrenciaPrevista[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaOcorrencia>(
      `${SELECT_OCORRENCIA} WHERE mes_ano = ? ORDER BY data_prevista ASC, nome ASC;`,
      [mesAno]
    );
    return linhas.map(mapearLinha);
  });
}

/** true se o mês está congelado (encerrado) — leitura passa a ser só destas linhas. */
export async function mesEstaCongelado(mesAno: string): Promise<boolean> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<{ congelado_em: string | null }>(
      `SELECT congelado_em FROM orcamento_mes WHERE mes_ano = ?;`,
      [mesAno]
    );
    return linha != null && linha.congelado_em != null;
  });
}

/**
 * Âncora de início de uso: o mês mais antigo que o usuário teve acesso
 * ao orçamento. É o menor `mes_ano` em `orcamento_mes` (seja ele o marco
 * "mês vivo" inicial — congelado_em NULL — ou o primeiro mês já
 * congelado). Retorna null antes do primeiro boot que fixa a âncora.
 *
 * Nada anterior à âncora deve gerar ou congelar ocorrências: são meses
 * que o usuário nunca acompanhou.
 */
export async function obterAncoraOrcamento(): Promise<string | null> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<{ mes_ano: string | null }>(
      `SELECT MIN(mes_ano) as mes_ano FROM orcamento_mes;`
    );
    return linha?.mes_ano ?? null;
  });
}

/**
 * Fixa a âncora no `mesAno` dado, se ainda não houver nenhuma linha em
 * `orcamento_mes`. `congelado_em` fica NULL (marco "mês vivo"). Chamado
 * uma única vez, no primeiro boot após a migration 10.
 */
export async function definirAncoraOrcamento(mesAno: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO orcamento_mes (mes_ano, congelado_em) VALUES (?, NULL)
       ON CONFLICT (mes_ano) DO NOTHING;`,
      [mesAno]
    );
  });
}

/**
 * Marca o mês como congelado. Idempotente: se já está congelado, o
 * `congelado_em` original NÃO é reescrito (WHERE congelado_em IS NULL no
 * DO UPDATE). Deve ser chamado SÓ depois de todas as ocorrências do mês
 * terem sido materializadas com sucesso.
 */
export async function marcarMesCongelado(mesAno: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO orcamento_mes (mes_ano, congelado_em) VALUES (?, datetime('now'))
       ON CONFLICT (mes_ano) DO UPDATE SET congelado_em = datetime('now')
         WHERE congelado_em IS NULL;`,
      [mesAno]
    );
  });
}

/**
 * Materializa UMA ocorrência — INSERT idempotente. Se já existe linha
 * para (recorrencia_id, mes_ano), não faz nada (não duplica nem
 * sobrescreve o snapshot). Usado ao congelar um mês (etapa 5) e como
 * base de qualquer ajuste que precise garantir a existência da linha.
 *
 * ON CONFLICT só dispara quando recorrencia_id NÃO é NULL (SQLite trata
 * NULL como distinto em UNIQUE) — linhas órfãs (regra já excluída) nunca
 * são recriadas por aqui de qualquer forma.
 */
export async function materializarOcorrencia(
  id: string,
  campos: CamposOcorrenciaPrevista
): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const resultado = await db.runAsync(
      `INSERT INTO ocorrencia_prevista
         (id, recorrencia_id, mes_ano, nome, valor_previsto, tipo, data_prevista, categoria_id, pulado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (recorrencia_id, mes_ano) DO NOTHING;`,
      [
        id,
        campos.recorrenciaId,
        campos.mesAno,
        campos.nome,
        campos.valorPrevisto,
        campos.tipo,
        campos.dataPrevista,
        campos.categoriaId,
        campos.pulado ? 1 : 0,
      ]
    );
    // 0 quando o ON CONFLICT dispara (linha já existia) — deixa o
    // chamador contar só o que realmente entrou.
    return resultado.changes;
  });
}

/**
 * Cria OU atualiza a linha de ajuste de uma recorrência num mês VIVO
 * (ex: marcar como pulada, alterar o valor previsto só naquele mês).
 * Não deve ser chamado para mês congelado — o snapshot lá é imutável.
 *
 * Diferente de `materializarOcorrencia`: aqui o ON CONFLICT SOBRESCREVE
 * de propósito, porque é uma edição explícita do usuário sobre aquele
 * mês específico.
 */
export async function upsertAjusteOcorrencia(id: string, campos: CamposOcorrenciaPrevista): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO ocorrencia_prevista
         (id, recorrencia_id, mes_ano, nome, valor_previsto, tipo, data_prevista, categoria_id, pulado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (recorrencia_id, mes_ano) DO UPDATE SET
         nome           = excluded.nome,
         valor_previsto = excluded.valor_previsto,
         tipo           = excluded.tipo,
         data_prevista  = excluded.data_prevista,
         categoria_id   = excluded.categoria_id,
         pulado         = excluded.pulado;`,
      [
        id,
        campos.recorrenciaId,
        campos.mesAno,
        campos.nome,
        campos.valorPrevisto,
        campos.tipo,
        campos.dataPrevista,
        campos.categoriaId,
        campos.pulado ? 1 : 0,
      ]
    );
  });
}
