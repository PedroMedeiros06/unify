import { SQLiteDatabase } from "expo-sqlite";

/**
 * Sistema de migrations versionado.
 *
 * Por que isso existe: `CREATE TABLE IF NOT EXISTS` só cria a tabela se
 * ela ainda não existe — se o schema mudar (nova coluna, novo índice),
 * um banco já criado com o schema antigo NÃO é atualizado automaticamente,
 * e a query falha com erros como "no such column".
 *
 * A solução é versionar o schema: cada mudança estrutural vira uma
 * "migration" numerada. O SQLite tem um contador embutido para isso
 * (`PRAGMA user_version`, começa em 0). Ao abrir o banco, comparamos a
 * versão atual do banco com a versão mais recente conhecida pelo app e
 * aplicamos só as migrations que faltam, em ordem — nunca recriamos ou
 * apagamos dados existentes.
 *
 * IMPORTANTE: migrations já publicadas (rodando no dispositivo de algum
 * usuário) NUNCA devem ser editadas depois — sempre adicionar uma nova
 * migration ao final da lista, mesmo para corrigir um erro em uma anterior.
 * Editar uma migration antiga faz o app achar que ela já rodou (pela
 * versão) quando na verdade rodou uma versão diferente do código.
 */

type Migration = {
  versao: number;
  descricao: string;
  executar: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    versao: 1,
    descricao: "Criação inicial: tabelas bancos e transacoes",
    async executar(db) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS bancos (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          sigla TEXT NOT NULL,
          cor TEXT NOT NULL
        );
      `);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transacoes (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          subtitulo TEXT NOT NULL,
          valor REAL NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
          data TEXT NOT NULL,
          hora TEXT,
          banco_id TEXT NOT NULL,
          status TEXT DEFAULT 'concluida' CHECK (status IN ('concluida', 'pendente', 'agendada')),
          categoria_icone TEXT,
          criado_em TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (banco_id) REFERENCES bancos(id)
        );
      `);
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transacoes_criado_em ON transacoes (criado_em DESC);
      `);
    },
  },
  {
    versao: 2,
    descricao: "Adiciona coluna identificador_externo (para deduplicação por ID do banco de origem)",
    async executar(db) {
      // Bancos que já rodaram a migration 1 têm a tabela `transacoes`
      // sem essa coluna — ALTER TABLE ADD COLUMN é seguro e não apaga
      // dados existentes. Bancos NOVOS (nunca rodaram nenhuma migration)
      // vão ter passado pela migration 1 já sem essa coluna também,
      // então essa migration roda igual para todo mundo, sempre em sequência.
      await db.execAsync(`
        ALTER TABLE transacoes ADD COLUMN identificador_externo TEXT;
      `);
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transacoes_id_externo ON transacoes (identificador_externo);
      `);
    },
  },
  {
    versao: 3,
    descricao: "Migra coluna 'data' de dd/mm/aaaa para formato ISO (aaaa-mm-dd) e recria índice",
    async executar(db) {
      // Bancos criados ANTES desta migration podem ter dados na coluna
      // `data` em formato dd/mm/aaaa (formato antigo). Convertemos in-place
      // com uma expressão SQL, sem perder nenhuma linha:
      // "05/07/2026" → substr(data,7,4) || '-' || substr(data,4,2) || '-' || substr(data,1,2)
      // Só converte linhas que ainda estão no formato antigo (contêm "/"),
      // então é seguro rodar mesmo que a tabela já tenha alguns registros
      // em ISO e outros não.
      await db.execAsync(`
        UPDATE transacoes
        SET data = substr(data, 7, 4) || '-' || substr(data, 4, 2) || '-' || substr(data, 1, 2)
        WHERE data LIKE '__/__/____';
      `);

      // O índice antigo (idx_transacoes_criado_em) continua válido, mas
      // adicionamos um índice por `data` também, já que passa a ser
      // comparável/ordenável corretamente como texto puro em formato ISO.
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes (data DESC);
      `);
    },
  },
];

/**
 * Aplica todas as migrations pendentes, em ordem, dentro de uma única
 * transação por migration (para que uma falha no meio não deixe o banco
 * em estado parcialmente migrado).
 */
export async function rodarMigrations(db: SQLiteDatabase): Promise<void> {
  const resultado = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version;`);
  const versaoAtual = resultado?.user_version ?? 0;

  const migrationsPendentes = MIGRATIONS.filter((m) => m.versao > versaoAtual).sort(
    (a, b) => a.versao - b.versao
  );

  for (const migration of migrationsPendentes) {
    console.log(`[migrations] Aplicando migration ${migration.versao}: ${migration.descricao}`);

    try {
      await migration.executar(db);
      await db.execAsync(`PRAGMA user_version = ${migration.versao};`);
    } catch (erro) {
      console.error(`[migrations] Falha ao aplicar migration ${migration.versao}:`, erro);
      throw new Error(
        `Não foi possível atualizar o banco de dados (migration ${migration.versao}). ${
          erro instanceof Error ? erro.message : ""
        }`
      );
    }
  }

  if (migrationsPendentes.length > 0) {
    console.log(`[migrations] Banco atualizado para a versão ${MIGRATIONS[MIGRATIONS.length - 1].versao}.`);
  }
}
