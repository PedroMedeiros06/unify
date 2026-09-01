import * as SQLite from "expo-sqlite";
import { rodarMigrations } from "./migrations";

const DATABASE_NAME = "unify.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // O SQLite desliga a checagem de foreign keys por padrão, mesmo com
  // FOREIGN KEY declarada no schema — sem este pragma, ON DELETE CASCADE
  // (usado por meta_transacoes) não tem efeito nenhum e transações
  // excluídas deixariam vínculos órfãos na tabela. Precisa ser setado
  // em TODA conexão aberta (não é uma configuração persistida no
  // arquivo do banco), então roda aqui, antes de qualquer migration.
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

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
 * metasQueries.ts / compromissosQueries.ts / regrasAprendidasQueries.ts /
 * metaTransacoesQueries.ts que acessa o banco deve passar sua operação
 * por aqui, em vez de chamar db.runAsync/getAllAsync diretamente.
 */
let filaExecucao: Promise<unknown> = Promise.resolve();

export function executarNaFila<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = filaExecucao.then(operacao, operacao);
  filaExecucao = resultado.catch(() => {});
  return resultado;
}

// Apaga todas as tabelas do app e zera a versão do schema. A ordem
// respeita as dependências de foreign key (filhas antes das pais).
// Usado tanto pelo reset de dev quanto pelo "apagar dados do app"
// disponível ao usuário na tela de Perfil.
async function droparTodasAsTabelas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`DROP TABLE IF EXISTS meta_transacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS limite_categoria;`);
  await db.execAsync(`DROP TABLE IF EXISTS ocorrencia_prevista;`);
  await db.execAsync(`DROP TABLE IF EXISTS orcamento_mes;`);
  await db.execAsync(`DROP TABLE IF EXISTS recorrencias;`);
  await db.execAsync(`DROP TABLE IF EXISTS transacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS bancos;`);
  await db.execAsync(`DROP TABLE IF EXISTS metas;`);
  await db.execAsync(`DROP TABLE IF EXISTS compromissos;`);
  await db.execAsync(`DROP TABLE IF EXISTS lembretes;`);
  await db.execAsync(`DROP TABLE IF EXISTS simulacoes;`);
  await db.execAsync(`DROP TABLE IF EXISTS cotacoes_moeda;`);
  // Regras aprendidas/sistema de categorização — sem isso sobrariam
  // regras "aprendidas" para transações que não existem mais.
  await db.execAsync(`DROP TABLE IF EXISTS regras_categorizacao;`);
  // Perfil local também é apagado, para voltar ao estado de "primeiro uso".
  await db.execAsync(`DROP TABLE IF EXISTS perfil_usuario;`);
  await db.execAsync(`PRAGMA user_version = 0;`);
}

export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    console.warn("resetDatabaseForDev chamado fora de ambiente de desenvolvimento — ignorado.");
    return;
  }

  const db = await getDatabase();
  await droparTodasAsTabelas(db);

  dbInstance = null;
  await getDatabase();
}

/**
 * Apaga TODOS os dados do usuário e recria o banco vazio (schema atual
 * via migrations). Diferente de `resetDatabaseForDev`, roda também em
 * produção — é a ação "apagar dados do app" da tela de Perfil, que
 * existe porque o Unify não tem login/conta: não há "sair", só zerar
 * o app local.
 *
 * Não remonta a árvore de React nem recarrega os contextos — isso é
 * responsabilidade de quem chama (ver ResetAppContext), que força a
 * remontagem para os providers relerem o banco já vazio.
 */
export async function apagarTodosOsDados(): Promise<void> {
  const db = await getDatabase();
  await droparTodasAsTabelas(db);

  dbInstance = null;
  await getDatabase();
}