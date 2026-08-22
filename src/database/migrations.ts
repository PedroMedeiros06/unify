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
  {
    versao: 5,
    descricao: "Adiciona categoria_id em transacoes e cria tabela regras_categorizacao (categorização automática + aprendida)",
    async executar(db) {
      // `categoria_id` guarda o slug definido em src/database/categorias.ts
      // (ex: "transporte", "mercado"). Nullable de propósito: uma
      // transação pode ficar "sem categoria" quando nenhuma regra bate
      // com confiança suficiente — nunca inventamos uma categoria por
      // aproximação. Não há FOREIGN KEY porque a lista de categorias é
      // fixa em código (não em tabela própria), então a validação do
      // valor é responsabilidade da camada de aplicação (categorias.ts).
      await db.execAsync(`ALTER TABLE transacoes ADD COLUMN categoria_id TEXT;`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes (categoria_id);`);

      // Regras "aprendidas": guardam o mapeamento entre um padrão de
      // descrição normalizado (ver normalizarPadraoDescricao em
      // categorizacao.ts) e a categoria escolhida para ele. É uma
      // tabela separada — e não um campo na transação — porque o
      // aprendizado é sobre o PADRÃO da descrição, reutilizável em
      // qualquer transação futura (inclusive de importações que ainda
      // nem aconteceram), não sobre um registro específico.
      //
      // UNIQUE em padrao_normalizado garante, no nível do banco, que
      // nunca existam duas regras ativas para o mesmo padrão — uma
      // categorização manual nova sempre substitui (UPSERT) a regra
      // anterior daquele padrão, nunca duplica.
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
      // App é single-user local, sem login/autenticação — não há
      // necessidade de múltiplas linhas. `id` fixo em 1 garante que só
      // existe um registro de perfil por dispositivo (via UPSERT nas
      // queries que escrevem aqui, nunca INSERT solto).
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
      // Nullable: uma meta pode existir sem prazo definido — nesse caso
      // ela simplesmente não aparece no calendário da Agenda, só na
      // lista de Metas do Planejamento (comportamento já existente, sem
      // mudança). Quando preenchida, representa o PRAZO FINAL da meta
      // (não um depósito específico) em formato ISO "aaaa-mm-dd", mesma
      // convenção do resto do app — é a base para, futuramente, calcular
      // quanto guardar por dia/mês até essa data (valor_meta - progresso_atual
      // dividido pelo tempo restante).
      await db.execAsync(`ALTER TABLE metas ADD COLUMN data_alvo TEXT;`);
      await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_metas_data_alvo ON metas (data_alvo);`);
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