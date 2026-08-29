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
  {
    versao: 5,
    descricao: "Adiciona categoria_id em transacoes e cria tabela regras_categorizacao (categorização automática + aprendida)",
    async executar(db) {
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN categoria_id TEXT;`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes (categoria_id);`);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS regras_categorizacao (
          id TEXT PRIMARY KEY NOT NULL,
          padrao_normalizado TEXT NOT NULL UNIQUE,
          categoria_id TEXT NOT NULL,
          origem TEXT NOT NULL CHECK (origem IN ('usuario', 'sistema')),
          criado_em TEXT NOT NULL DEFAULT (datetime('now')),
          atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_regras_padrao ON regras_categorizacao (padrao_normalizado);
      `);
    },
  },
  {
    versao: 6,
    descricao: "Cria tabela perfil_usuario (cadastro local simples, single-row)",
    async executar(db) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS perfil_usuario (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          nome TEXT NOT NULL DEFAULT '',
          email TEXT,
          criado_em TEXT NOT NULL DEFAULT (datetime('now')),
          atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
  {
    versao: 7,
    descricao: "Adiciona data_alvo em metas (prazo final da meta — permite plotar na Agenda e futuramente calcular quanto guardar por dia/mês)",
    async executar(db) {
      await db.execAsync(`ALTER TABLE metas ADD COLUMN data_alvo TEXT;`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_metas_data_alvo ON metas (data_alvo);`);
    },
  },
  {
    versao: 8,
    descricao: "Cria tabela meta_transacoes (relação manual entre metas e transações; progresso da meta passa a ser derivado desta tabela)",
    async executar(db) {
      // Tabela de relação N:N entre metas e transações. Cada linha
      // representa uma decisão EXPLÍCITA do usuário de que uma
      // transação (ou parte dela) deve contar para o progresso de uma
      // meta — nunca é criada automaticamente por categorização,
      // palavra-chave ou qualquer heurística.
      //
      // `valor_vinculado` carrega o SINAL: positivo aumenta o
      // progresso da meta (ex: transferência para uma "caixinha"),
      // negativo diminui (ex: retirada da reserva). Não precisa ser
      // igual ao `valor` da transação — o usuário pode escolher
      // vincular só uma parte dela (vínculo parcial), mas nunca pode
      // ultrapassar o valor absoluto da transação em módulo; essa
      // invariante é garantida pela camada de aplicação
      // (metaTransacoesQueries.ts), não pelo schema.
      //
      // UNIQUE(meta_id, transacao_id): no MVP uma transação só pode
      // estar vinculada a UMA meta por vez. "Alterar meta" (mover o
      // vínculo de uma meta para outra) é implementado como
      // desvincular + vincular, não como uma segunda linha.
      //
      // ON DELETE CASCADE em ambas as FKs: excluir a transação OU a
      // meta remove a relação automaticamente — depende de
      // `PRAGMA foreign_keys = ON` estar ativo na conexão (ver
      // database.ts), senão o SQLite ignora silenciosamente o CASCADE.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS meta_transacoes (
          id TEXT PRIMARY KEY NOT NULL,
          meta_id TEXT NOT NULL,
          transacao_id TEXT NOT NULL,
          valor_vinculado REAL NOT NULL,
          criado_em TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (meta_id) REFERENCES metas(id) ON DELETE CASCADE,
          FOREIGN KEY (transacao_id) REFERENCES transacoes(id) ON DELETE CASCADE,
          UNIQUE (meta_id, transacao_id)
        );
      `);

      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_meta_transacoes_meta ON meta_transacoes (meta_id);
      `);
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_meta_transacoes_transacao ON meta_transacoes (transacao_id);
      `);
    },
  },
  {
    versao: 9,
    descricao:
      "Adiciona transacao_id em compromissos — um compromisso só é 'pago' quando existe uma transação real vinculada (nunca uma movimentação fictícia). O realizado do orçamento vem exclusivamente das transações.",
    async executar(db) {
      // FK com ON DELETE SET NULL: se a transação vinculada for
      // excluída, o compromisso volta a ficar 'não pago' (transacao_id
      // NULL), em vez de sumir junto (que seria o caso com CASCADE).
      // Depende de PRAGMA foreign_keys = ON na conexão (ver database.ts).
      //
      // A coluna `pago` (0/1) da migration 4 fica DEPRECADA a partir
      // daqui: nada mais escreve nela além do 0 inicial do INSERT, e a
      // leitura passa a derivar `pago = transacao_id IS NOT NULL`
      // (ver compromissosQueries.ts). Não vale uma migration de
      // remoção agora — mesmo tratamento dado a metas.progresso_atual.
      await db.execAsync(
        `ALTER TABLE compromissos ADD COLUMN transacao_id TEXT REFERENCES transacoes(id) ON DELETE SET NULL;`
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS idx_compromissos_transacao ON compromissos (transacao_id);`
      );
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