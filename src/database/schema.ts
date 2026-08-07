/**
 * Schema do banco de dados local (SQLite).
 *
 * Por que essas tabelas:
 * - `bancos`: cada instituição conectada (Nubank, Inter, BB...). Guardamos
 *   sigla e cor aqui para não repetir esses dados em toda transação.
 * - `transacoes`: o histórico financeiro em si, referenciando um banco.
 *
 * Tipos ficam como TEXT/INTEGER/REAL porque SQLite não tem tipo enum nativo;
 * a validação de valores permitidos (ex: tipo = "entrada" | "saida") fica
 * a cargo do TypeScript na camada de cima (queries.ts).
 */

export const CREATE_TABLE_BANCOS = `
  CREATE TABLE IF NOT EXISTS bancos (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    sigla TEXT NOT NULL,
    cor TEXT NOT NULL
  );
`;

export const CREATE_TABLE_TRANSACOES = `
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
`;

// Índice para acelerar a query mais comum: listar transações por data (mais recente primeiro)
export const CREATE_INDEX_TRANSACOES_DATA = `
  CREATE INDEX IF NOT EXISTS idx_transacoes_criado_em ON transacoes (criado_em DESC);
`;

export const ALL_MIGRATIONS = [
  CREATE_TABLE_BANCOS,
  CREATE_TABLE_TRANSACOES,
  CREATE_INDEX_TRANSACOES_DATA,
];
