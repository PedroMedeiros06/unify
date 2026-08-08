/**
 * Este arquivo documenta o schema FINAL (resultado de todas as migrations
 * aplicadas), como referência rápida — não é executado diretamente.
 *
 * A fonte de verdade real do schema é `src/database/migrations.ts`, onde
 * cada mudança estrutural é versionada e aplicada incrementalmente.
 * Ao adicionar uma coluna/tabela nova, sempre criar uma nova migration
 * ali — nunca editar as migrations existentes nem este arquivo como se
 * fosse o `CREATE TABLE` real.
 *
 * Schema atual (após migration 3):
 *
 * CREATE TABLE bancos (
 *   id TEXT PRIMARY KEY NOT NULL,
 *   nome TEXT NOT NULL,
 *   sigla TEXT NOT NULL,
 *   cor TEXT NOT NULL
 * );
 *
 * CREATE TABLE transacoes (
 *   id TEXT PRIMARY KEY NOT NULL,
 *   nome TEXT NOT NULL,
 *   subtitulo TEXT NOT NULL,
 *   valor REAL NOT NULL,
 *   tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
 *   data TEXT NOT NULL,               -- formato ISO "aaaa-mm-dd" (ver src/utils/dateUtils.ts)
 *   hora TEXT,
 *   banco_id TEXT NOT NULL,
 *   status TEXT DEFAULT 'concluida' CHECK (status IN ('concluida', 'pendente', 'agendada')),
 *   categoria_icone TEXT,
 *   identificador_externo TEXT,       -- adicionada na migration 2
 *   criado_em TEXT NOT NULL DEFAULT (datetime('now')),
 *   FOREIGN KEY (banco_id) REFERENCES bancos(id)
 * );
 *
 * Índices: idx_transacoes_criado_em, idx_transacoes_id_externo, idx_transacoes_data
 */

export {};
