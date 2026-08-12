import { SQLiteDatabase } from "expo-sqlite";

/**
 * Sistema de migrations versionado. Ver documentação completa no topo
 * deste arquivo em versões anteriores do projeto — resumo: cada mudança
 * de schema é uma migration numerada, aplicada uma única vez por
 * dispositivo, nunca editada retroativamente após publicada.
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
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN identificador_externo TEXT;`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_transacoes_id_externo ON transacoes (identificador_externo);`);
    },
  },
  {
    versao: 3,
    descricao: "Migra coluna 'data' de dd/mm/aaaa para formato ISO (aaaa-mm-dd) e recria índice",
    async executar(db) {
      await db.execAsync(`
        UPDATE transacoes
        SET data = substr(data, 7, 4) || '-' || substr(data, 4, 2) || '-' || substr(data, 1, 2)
        WHERE data LIKE '__/__/____';
      `);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes (data DESC);`);
    },
  },
  {
    versao: 4,
    descricao: "Cria tabelas metas e compromissos",
    async executar(db) {
      // `progresso_atual` começa em 0 e, nesta versão, só é alterado
      // manualmente por edição da meta (sem vínculo automático com
      // transações ainda — isso fica para uma versão futura).
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS metas (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          valor_meta REAL NOT NULL,
          progresso_atual REAL NOT NULL DEFAULT 0,
          icone TEXT NOT NULL,
          cor TEXT NOT NULL,
          criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // `data_vencimento` em ISO (aaaa-mm-dd), mesma convenção usada em
      // transacoes.data. `notificado` evita reagendar/reenviar a mesma
      // notificação local toda vez que a lista é recarregada.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS compromissos (
          id TEXT PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL,
          valor REAL NOT NULL,
          data_vencimento TEXT NOT NULL,
          icone TEXT NOT NULL,
          cor TEXT NOT NULL,
          pago INTEGER NOT NULL DEFAULT 0 CHECK (pago IN (0, 1)),
          notificacao_id TEXT,
          criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_compromissos_vencimento ON compromissos (data_vencimento ASC);
      `);
    },
  },
];

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
