import * as SQLite from "expo-sqlite";
import { ALL_MIGRATIONS } from "./schema";

const DATABASE_NAME = "unify.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Retorna a instância do banco, abrindo e rodando as migrations
 * apenas na primeira chamada (padrão singleton). Chamadas seguintes
 * reaproveitam a mesma conexão.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Roda cada CREATE TABLE/INDEX em sequência. Usar execAsync porque
  // são comandos DDL (estrutura), não precisam de parâmetros.
  for (const migration of ALL_MIGRATIONS) {
    await db.execAsync(migration);
  }

  dbInstance = db;
  return db;
}

/**
 * Utilitário para resetar o banco durante desenvolvimento/testes.
 * NUNCA chamar isso em produção — apaga todos os dados do usuário.
 */
export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    console.warn("resetDatabaseForDev chamado fora de ambiente de desenvolvimento — ignorado.");
    return;
  }

  const db = await getDatabase();
  await db.execAsync(`DROP TABLE IF EXISTS transacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS bancos;`);

  for (const migration of ALL_MIGRATIONS) {
    await db.execAsync(migration);
  }
}
