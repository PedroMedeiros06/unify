import * as SQLite from "expo-sqlite";
import { rodarMigrations } from "./migrations";

const DATABASE_NAME = "unify.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Retorna a instância do banco, abrindo e aplicando as migrations
 * pendentes apenas na primeira chamada (padrão singleton). Chamadas
 * seguintes reaproveitam a mesma conexão, sem rodar migrations de novo.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await rodarMigrations(db);

  dbInstance = db;
  return db;
}

/**
 * Utilitário para resetar o banco durante desenvolvimento/testes.
 * NUNCA chamar isso em produção — apaga todos os dados do usuário.
 * Útil quando o schema muda de forma incompatível com dados de teste
 * já existentes, ou para simular a experiência de um usuário novo.
 */
export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    console.warn("resetDatabaseForDev chamado fora de ambiente de desenvolvimento — ignorado.");
    return;
  }

  const db = await getDatabase();
  await db.execAsync(`DROP TABLE IF EXISTS transacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS bancos;`);
  await db.execAsync(`PRAGMA user_version = 0;`);

  // Fecha a conexão em cache para forçar reabertura + remigração do zero
  dbInstance = null;
  await getDatabase();
}
