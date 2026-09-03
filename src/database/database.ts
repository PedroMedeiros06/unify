import * as SQLite from "expo-sqlite";
import { rodarMigrations } from "./migrations";

const DATABASE_NAME = "unify.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;
// Promise de inicialização em andamento. Sem isto, duas chamadas
// concorrentes a getDatabase() (comum: vários contextos montando ao
// mesmo tempo, ou uma importação que dispara recarga de metas em
// paralelo) veem `dbInstance` nulo e ambas abrem a conexão + rodam
// `rodarMigrations` — dezenas de execAsync concorrentes na mesma
// conexão física, que é exatamente o que estoura o
// `java.lang.NullPointerException` em `NativeDatabase.execAsync`.
// Guardar a promise faz a 2ª chamada esperar a 1ª terminar.
let inicializacaoEmAndamento: Promise<SQLite.SQLiteDatabase> | null = null;

async function abrirEInicializar(): Promise<SQLite.SQLiteDatabase> {
  console.log("[database] abrirEInicializar: abrindo conexão");
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  console.log("[database] conexão aberta, rodando pragma + migrations");

  // O SQLite desliga a checagem de foreign keys por padrão, mesmo com
  // FOREIGN KEY declarada no schema — sem este pragma, ON DELETE CASCADE
  // (usado por meta_transacoes) não tem efeito nenhum e transações
  // excluídas deixariam vínculos órfãos na tabela. Precisa ser setado
  // em TODA conexão aberta (não é uma configuração persistida no
  // arquivo do banco), então roda aqui, antes de qualquer migration.
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await rodarMigrations(db);
  console.log("[database] migrations concluídas");

  dbInstance = db;
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  // Se já há uma inicialização rodando, todo mundo aguarda a MESMA
  // promise — nunca abre/migra duas vezes em paralelo.
  if (inicializacaoEmAndamento) return inicializacaoEmAndamento;

  inicializacaoEmAndamento = abrirEInicializar().finally(() => {
    inicializacaoEmAndamento = null;
  });
  return inicializacaoEmAndamento;
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
  // Loga a stack real de qualquer operação que rejeitar — sem isto o
  // driver nativo só devolve "NativeDatabase.execAsync rejected /
  // NullPointerException" solto, sem dizer qual query.
  filaExecucao = resultado.catch((e) => {
    console.error("[executarNaFila] operação rejeitada:", e, new Error().stack);
  });
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

  try {
    await db.closeAsync();
  } catch (e) {
    console.warn("[database] closeAsync no reset de dev falhou (ignorado):", e);
  }

  dbInstance = null;
  inicializacaoEmAndamento = null;
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
  // Roda DENTRO da fila serializada: sem isso, uma leitura já
  // enfileirada por um contexto que está remontando (ex: Resumo
  // chamando listarResumoPorBanco) pode executar contra a conexão
  // antiga no meio do DROP — statement inconsistente, ou pior: resolve
  // com os dados de antes do reset e popula a tela recém-remontada com
  // um saldo "fantasma". Enfileirar aqui garante que todo drop/recreate
  // acontece com a fila parada.
  await executarNaFila(async () => {
    const db = await getDatabase();
    await droparTodasAsTabelas(db);

    // FECHA a conexão nativa antiga antes de reabrir. Sem
    // `closeAsync`, `openDatabaseAsync` no mesmo arquivo abre um
    // SEGUNDO handle nativo enquanto o primeiro segue aberto — no
    // Android o driver embaralha os dois e o `prepareAsync` seguinte
    // estoura `java.lang.NullPointerException`. Era exatamente o crash
    // ao importar logo após "apagar dados".
    try {
      await db.closeAsync();
    } catch (e) {
      // Se já estava fechada / erro ao fechar, seguimos — o objetivo é
      // não deixar duas conexões vivas, e a nova abertura abaixo é o
      // que importa.
      console.warn("[database] closeAsync no reset falhou (ignorado):", e);
    }

    // Zera os dois estados de cache de conexão — se sobrar uma
    // `inicializacaoEmAndamento` de antes, a recriação abaixo pegaria a
    // conexão velha e não rodaria as migrations de novo.
    dbInstance = null;
    inicializacaoEmAndamento = null;
    // Recria já com o schema atual (migrations) antes de liberar a fila,
    // para que a próxima operação enfileirada abra sobre o banco pronto.
    await getDatabase();
  });
}