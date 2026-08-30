import { getDatabase, executarNaFila } from "./database";
import { CategoriaId } from "./categorias";

/**
 * CRUD de LIMITE_CATEGORIA — teto de gasto de uma categoria NUM MÊS.
 *
 * O limite é histórico e específico por mês: alterar o teto de setembro
 * não toca em agosto. A chave lógica é (categoria_id, mes_ano); a UI
 * grava sempre por upsert nessa chave.
 *
 * Limite é só acompanhamento — nunca bloqueia lançamento de transação.
 * O gasto realizado NÃO fica aqui: vem de `transacoes` via
 * `listarResumoPorCategoria({ dataInicio, dataFim })`.
 */

export type LimiteCategoria = {
  id: string;
  categoriaId: CategoriaId;
  mesAno: string; // "aaaa-mm"
  valorLimite: number; // sempre > 0
  criadoEm: string;
  atualizadoEm: string;
};

const SELECT_LIMITE = `
  SELECT
    id,
    categoria_id  as categoriaId,
    mes_ano       as mesAno,
    valor_limite  as valorLimite,
    criado_em     as criadoEm,
    atualizado_em as atualizadoEm
  FROM limite_categoria
`;

/** Limites definidos para o mês "aaaa-mm". */
export async function listarLimitesCategoria(mesAno: string): Promise<LimiteCategoria[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<LimiteCategoria>(
      `${SELECT_LIMITE} WHERE mes_ano = ? ORDER BY valor_limite DESC, categoria_id ASC;`,
      [mesAno]
    );
  });
}

/**
 * Cria ou atualiza o limite de uma categoria no mês (upsert por
 * (categoria_id, mes_ano)). `id` só é usado quando a linha é nova — no
 * conflito, o id existente é mantido.
 */
export async function definirLimiteCategoria(
  id: string,
  categoriaId: CategoriaId,
  mesAno: string,
  valorLimite: number
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO limite_categoria (id, categoria_id, mes_ano, valor_limite)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (categoria_id, mes_ano) DO UPDATE SET
         valor_limite  = excluded.valor_limite,
         atualizado_em = datetime('now');`,
      [id, categoriaId, mesAno, valorLimite]
    );
  });
}

/** Remove o limite de uma categoria num mês específico. */
export async function removerLimiteCategoria(categoriaId: CategoriaId, mesAno: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM limite_categoria WHERE categoria_id = ? AND mes_ano = ?;`, [
      categoriaId,
      mesAno,
    ]);
  });
}

/** Percentual (0-100) do limite já consumido, limitado a 100 para a barra/UI. */
export function calcularPercentualLimite(gasto: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min(100, Math.round((gasto / limite) * 100));
}
