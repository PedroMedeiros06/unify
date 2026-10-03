import { getDatabase, executarNaFila } from "./database";
import { Categoria, CategoriaPersonalizadaId } from "./categorias";

/**
 * CRUD das categorias personalizadas (migration 22). As do sistema
 * continuam fixas em categorias.ts — aqui só as criadas pelo usuário.
 */

type LinhaCategoria = {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  arquivada: number;
};

export async function listarCategoriasPersonalizadas(): Promise<Categoria[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaCategoria>(
      `SELECT id, nome, icone, cor, arquivada FROM categorias_personalizadas ORDER BY nome COLLATE NOCASE ASC;`
    );
    return linhas.map((l) => ({
      id: l.id as CategoriaPersonalizadaId,
      nome: l.nome,
      icone: l.icone as Categoria["icone"],
      cor: l.cor,
      personalizada: true,
      arquivada: l.arquivada === 1,
    }));
  });
}

export type DadosCategoria = { nome: string; icone: Categoria["icone"]; cor: string };

export async function criarCategoriaPersonalizada(dados: DadosCategoria): Promise<CategoriaPersonalizadaId> {
  const id: CategoriaPersonalizadaId = `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO categorias_personalizadas (id, nome, icone, cor) VALUES (?, ?, ?, ?);`,
      [id, dados.nome.trim(), dados.icone, dados.cor]
    );
  });
  return id;
}

/**
 * Renomeia/troca ícone ou cor. Transações guardam também
 * `categoria_icone` (cópia do ícone no momento em que foram
 * categorizadas) — atualiza junto para a lista não ficar com o ícone velho.
 */
export async function atualizarCategoriaPersonalizada(id: string, dados: DadosCategoria): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE categorias_personalizadas SET nome = ?, icone = ?, cor = ? WHERE id = ?;`,
        [dados.nome.trim(), dados.icone, dados.cor, id]
      );
      await db.runAsync(`UPDATE transacoes SET categoria_icone = ? WHERE categoria_id = ?;`, [dados.icone, id]);
    });
  });
}

export async function definirCategoriaArquivada(id: string, arquivada: boolean): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE categorias_personalizadas SET arquivada = ? WHERE id = ?;`, [arquivada ? 1 : 0, id]);
  });
}

export type UsoCategoria = { transacoes: number; recorrencias: number; limites: number };

/** Quantos registros usam a categoria — mostrado antes de excluir. */
export async function contarUsoCategoria(id: string): Promise<UsoCategoria> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.getFirstAsync<UsoCategoria>(
      `SELECT
         (SELECT COUNT(*) FROM transacoes WHERE categoria_id = ?) as transacoes,
         (SELECT COUNT(*) FROM recorrencias WHERE categoria_id = ?) as recorrencias,
         (SELECT COUNT(*) FROM limite_categoria WHERE categoria_id = ?) as limites;`,
      [id, id, id]
    );
    return r ?? { transacoes: 0, recorrencias: 0, limites: 0 };
  });
}

/**
 * Exclui a categoria. Não há FK para categorias (o id é texto livre em
 * várias tabelas), então a limpeza é explícita: transações e
 * recorrências ficam "sem categoria", limites e regras aprendidas que
 * apontavam para ela são removidos. Meses congelados do orçamento
 * (ocorrencia_prevista) mantêm o snapshot.
 */
export async function excluirCategoriaPersonalizada(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE transacoes SET categoria_id = NULL, categoria_icone = NULL WHERE categoria_id = ?;`,
        [id]
      );
      await db.runAsync(`UPDATE recorrencias SET categoria_id = NULL WHERE categoria_id = ?;`, [id]);
      await db.runAsync(`DELETE FROM limite_categoria WHERE categoria_id = ?;`, [id]);
      await db.runAsync(`DELETE FROM regras_categorizacao WHERE categoria_id = ?;`, [id]);
      await db.runAsync(`DELETE FROM categorias_personalizadas WHERE id = ?;`, [id]);
    });
  });
}
