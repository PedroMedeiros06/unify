import { getDatabase, executarNaFila } from "./database";
import { CategoriaId } from "./categorias";

export type OrigemRegra = "usuario" | "sistema";

export type RegraCategorizacao = {
  id: string;
  padraoNormalizado: string;
  categoriaId: CategoriaId;
  origem: OrigemRegra;
  criadoEm: string;
  atualizadoEm: string;
};

type LinhaBrutaRegra = {
  id: string;
  padrao_normalizado: string;
  categoria_id: string;
  origem: OrigemRegra;
  criado_em: string;
  atualizado_em: string;
};

function mapearLinha(linha: LinhaBrutaRegra): RegraCategorizacao {
  return {
    id: linha.id,
    padraoNormalizado: linha.padrao_normalizado,
    categoriaId: linha.categoria_id as CategoriaId,
    origem: linha.origem,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

/**
 * Busca a regra de categorização (aprendida ou padrão do sistema)
 * cadastrada para um padrão de descrição já normalizado. Retorna null
 * se não houver nenhuma regra salva para esse padrão exato — não faz
 * match parcial/aproximado (isso é responsabilidade de categorizacao.ts,
 * na camada de regras de sistema por palavra-chave).
 */
export async function buscarRegraPorPadrao(
  padraoNormalizado: string
): Promise<RegraCategorizacao | null> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<LinhaBrutaRegra>(
      `SELECT id, padrao_normalizado, categoria_id, origem, criado_em, atualizado_em
       FROM regras_categorizacao
       WHERE padrao_normalizado = ?;`,
      [padraoNormalizado]
    );
    return linha ? mapearLinha(linha) : null;
  });
}

/**
 * Busca em lote as regras para vários padrões normalizados de uma vez
 * (usado durante a importação de um CSV inteiro, para evitar N queries
 * sequenciais — uma por transação — no fluxo de importação).
 * Retorna um Map padrao -> regra, contendo apenas os padrões encontrados.
 */
export async function buscarRegrasPorPadroes(
  padroesNormalizados: string[]
): Promise<Map<string, RegraCategorizacao>> {
  const padroesUnicos = Array.from(new Set(padroesNormalizados)).filter(Boolean);
  if (padroesUnicos.length === 0) return new Map();

  return executarNaFila(async () => {
    const db = await getDatabase();
    const placeholders = padroesUnicos.map(() => "?").join(", ");
    const linhas = await db.getAllAsync<LinhaBrutaRegra>(
      `SELECT id, padrao_normalizado, categoria_id, origem, criado_em, atualizado_em
       FROM regras_categorizacao
       WHERE padrao_normalizado IN (${placeholders});`,
      padroesUnicos
    );

    const mapa = new Map<string, RegraCategorizacao>();
    for (const linha of linhas) {
      const regra = mapearLinha(linha);
      mapa.set(regra.padraoNormalizado, regra);
    }
    return mapa;
  });
}

/**
 * Grava (cria ou substitui) a regra para um padrão normalizado.
 *
 * Usa UPSERT: se já existir uma regra para esse padrão exato, ela é
 * atualizada (categoria + origem + atualizado_em) em vez de duplicada —
 * a UNIQUE constraint em padrao_normalizado garante isso no nível do
 * banco. É assim que uma correção manual do usuário sempre prevalece
 * sobre uma regra de sistema (ou uma regra manual anterior) para o
 * mesmo padrão, sem precisar de lógica de conflito no código.
 */
export async function salvarRegraCategorizacao(
  padraoNormalizado: string,
  categoriaId: CategoriaId,
  origem: OrigemRegra
): Promise<void> {
  if (!padraoNormalizado) return;

  return executarNaFila(async () => {
    const db = await getDatabase();
    const id = `regra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await db.runAsync(
      `INSERT INTO regras_categorizacao (id, padrao_normalizado, categoria_id, origem)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(padrao_normalizado) DO UPDATE SET
         categoria_id = excluded.categoria_id,
         origem = excluded.origem,
         atualizado_em = datetime('now');`,
      [id, padraoNormalizado, categoriaId, origem]
    );
  });
}

/** Lista todas as regras aprendidas pelo usuário (não as de sistema). Útil para telas de gerenciamento futuras. */
export async function listarRegrasDoUsuario(): Promise<RegraCategorizacao[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBrutaRegra>(
      `SELECT id, padrao_normalizado, categoria_id, origem, criado_em, atualizado_em
       FROM regras_categorizacao
       WHERE origem = 'usuario'
       ORDER BY atualizado_em DESC;`
    );
    return linhas.map(mapearLinha);
  });
}

export async function excluirRegraCategorizacao(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM regras_categorizacao WHERE id = ?;`, [id]);
  });
}