import * as SQLite from "expo-sqlite";
import { rodarMigrations } from "./migrations";

const DATABASE_NAME = "unify.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await rodarMigrations(db);

  dbInstance = db;
  return db;
}

/**
 * Fila serializada de execução de queries.
 *
 * Por que isso existe: o driver nativo do expo-sqlite não lida bem com
 * múltiplas chamadas concorrentes de `runAsync`/`getAllAsync`/etc. na
 * mesma conexão — quando o usuário interage rápido (ex: tocar "marcar
 * como pago" várias vezes seguidas), várias promises disparam ao mesmo
 * tempo e o `prepareAsync` nativo pode receber um ponteiro de statement
 * nulo/inconsistente, gerando NullPointerException.
 *
 * `executarNaFila` garante que cada operação só começa depois que a
 * anterior terminou por completo, mesmo que várias sejam disparadas
 * "ao mesmo tempo" do lado do JavaScript. Toda função em queries.ts /
 * metasQueries.ts / compromissosQueries.ts / regrasAprendidasQueries.ts
 * que acessa o banco deve passar sua operação por aqui, em vez de
 * chamar db.runAsync/getAllAsync diretamente.
 */
let filaExecucao: Promise<unknown> = Promise.resolve();

export function executarNaFila<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = filaExecucao.then(operacao, operacao);
  filaExecucao = resultado.catch(() => {});
  return resultado;
}

export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    console.warn("resetDatabaseForDev chamado fora de ambiente de desenvolvimento — ignorado.");
    return;
  }

  const db = await getDatabase();
  await db.execAsync(`DROP TABLE IF EXISTS transacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS bancos;`);
  await db.execAsync(`DROP TABLE IF EXISTS metas;`);
  await db.execAsync(`DROP TABLE IF EXISTS compromissos;`);
  // Tabela de regras aprendidas/sistema de categorização — precisa ser
  // apagada junto no reset de dev, senão sobram regras órfãs (regras
  // "aprendidas" para transações que não existem mais depois do reset).
  await db.execAsync(`DROP TABLE IF EXISTS regras_categorizacao;`);
  // Perfil local também é resetado em dev, para simular "primeiro uso"
  // consistentemente com o resto do banco.
  await db.execAsync(`DROP TABLE IF EXISTS perfil_usuario;`);
  await db.execAsync(`PRAGMA user_version = 0;`);

  dbInstance = null;
  await getDatabase();
}