import { getDatabase, executarNaFila } from "./database";
import { CategoriaId } from "./categorias";

/**
 * CRUD de RECORRÊNCIAS — regras de planejamento (receita ou despesa que
 * "normalmente acontece" todo mês). Uma recorrência NÃO é uma transação
 * e NÃO gera movimentação financeira: ela só alimenta a geração de
 * ocorrências previstas (ver gerarOcorrenciasPrevistas.ts, etapa 4) que,
 * por sua vez, alimenta o Orçamento.
 *
 * Ícone/cor não são guardados aqui — a UI deriva da categoria
 * (obterCategoriaPorId), com fallback genérico quando categoria_id é null.
 *
 * MVP: periodicidade sempre 'mensal' (nem entra em CamposRecorrencia —
 * é o DEFAULT da coluna). Datas em ISO "aaaa-mm-dd", como no resto do app.
 */

export type TipoRecorrencia = "entrada" | "saida";

/**
 * Como o dia de vencimento do mês é resolvido:
 *  - 'dia_fixo'        -> diaVencimento = 1..31 (dia corrido; se o mês
 *                         não tiver esse dia, usa o último dia do mês)
 *  - 'dia_util'        -> diaVencimento = k-ésimo dia útil do mês
 *                         (seg-sex; feriados fora de escopo)
 *  - 'ultimo_dia_util' -> diaVencimento é null; usa o último dia útil
 */
export type TipoVencimento = "dia_fixo" | "dia_util" | "ultimo_dia_util";

export type Recorrencia = {
  id: string;
  nome: string;
  valor: number; // sempre > 0; o sinal vem de `tipo`
  tipo: TipoRecorrencia;
  categoriaId: CategoriaId | null;
  periodicidade: "mensal";
  tipoVencimento: TipoVencimento;
  diaVencimento: number | null;
  dataInicio: string; // ISO — 1º mês em que a regra passa a valer
  dataFim: string | null; // ISO ou null (sem fim)
  ativa: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

/**
 * Campos que a UI fornece ao criar/editar. `periodicidade` fica de fora
 * (sempre 'mensal' no MVP, via DEFAULT da coluna); `criadoEm`/
 * `atualizadoEm` são controlados pelo banco.
 */
export type CamposRecorrencia = {
  nome: string;
  valor: number;
  tipo: TipoRecorrencia;
  categoriaId: CategoriaId | null;
  tipoVencimento: TipoVencimento;
  diaVencimento: number | null;
  dataInicio: string;
  dataFim: string | null;
  ativa: boolean;
};

type LinhaBrutaRecorrencia = Omit<Recorrencia, "ativa"> & { ativa: number };

function mapearLinha(linha: LinhaBrutaRecorrencia): Recorrencia {
  return { ...linha, ativa: linha.ativa === 1 };
}

const SELECT_RECORRENCIA = `
  SELECT
    id, nome, valor, tipo,
    categoria_id    as categoriaId,
    periodicidade,
    tipo_vencimento as tipoVencimento,
    dia_vencimento  as diaVencimento,
    data_inicio     as dataInicio,
    data_fim        as dataFim,
    ativa,
    criado_em       as criadoEm,
    atualizado_em   as atualizadoEm
  FROM recorrencias
`;

export async function listarRecorrencias(): Promise<Recorrencia[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaRecorrencia>(
      `${SELECT_RECORRENCIA} ORDER BY tipo ASC, nome ASC;`
    );
    return linhas.map(mapearLinha);
  });
}

export async function inserirRecorrencia(id: string, campos: CamposRecorrencia): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO recorrencias
         (id, nome, valor, tipo, categoria_id, tipo_vencimento, dia_vencimento, data_inicio, data_fim, ativa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        campos.nome,
        campos.valor,
        campos.tipo,
        campos.categoriaId,
        campos.tipoVencimento,
        campos.diaVencimento,
        campos.dataInicio,
        campos.dataFim,
        campos.ativa ? 1 : 0,
      ]
    );
  });
}

export async function atualizarRecorrencia(id: string, campos: CamposRecorrencia): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE recorrencias SET
         nome = ?, valor = ?, tipo = ?, categoria_id = ?,
         tipo_vencimento = ?, dia_vencimento = ?, data_inicio = ?, data_fim = ?, ativa = ?,
         atualizado_em = datetime('now')
       WHERE id = ?;`,
      [
        campos.nome,
        campos.valor,
        campos.tipo,
        campos.categoriaId,
        campos.tipoVencimento,
        campos.diaVencimento,
        campos.dataInicio,
        campos.dataFim,
        campos.ativa ? 1 : 0,
        id,
      ]
    );
  });
}

/** Atalho para o toggle ativar/desativar sem passar por todos os campos. */
export async function definirRecorrenciaAtiva(id: string, ativa: boolean): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE recorrencias SET ativa = ?, atualizado_em = datetime('now') WHERE id = ?;`,
      [ativa ? 1 : 0, id]
    );
  });
}

/**
 * Exclui a regra. As ocorrências previstas de meses JÁ CONGELADOS
 * permanecem (recorrencia_id vira NULL via ON DELETE SET NULL) — o
 * histórico não é afetado. Meses vivos simplesmente deixam de gerar
 * essa ocorrência.
 */
export async function excluirRecorrencia(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM recorrencias WHERE id = ?;`, [id]);
  });
}
