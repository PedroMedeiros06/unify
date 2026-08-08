import { getDatabase } from "./database";
import { dataHojeIso } from "@/utils/dateUtils";

export type TipoTransacao = "entrada" | "saida";
export type StatusTransacao = "concluida" | "pendente" | "agendada";

export type Banco = {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
};

export type Transacao = {
  id: string;
  nome: string;
  subtitulo: string;
  valor: number;
  tipo: TipoTransacao;
  data: string; // formato ISO "aaaa-mm-dd" — ver src/utils/dateUtils.ts
  hora: string | null;
  bancoId: string;
  status: StatusTransacao;
  categoriaIcone: string | null;
  criadoEm: string;
  identificadorExterno: string | null; // UUID do banco de origem, quando disponível (ex: Nubank)
};

export type TransacaoComBanco = Omit<Transacao, "bancoId"> & {
  banco: Banco;
};

export async function upsertBanco(banco: Banco): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO bancos (id, nome, sigla, cor)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, sigla = excluded.sigla, cor = excluded.cor;`,
    [banco.id, banco.nome, banco.sigla, banco.cor]
  );
}

export async function listarBancos(): Promise<Banco[]> {
  const db = await getDatabase();
  return db.getAllAsync<Banco>(`SELECT id, nome, sigla, cor FROM bancos ORDER BY nome ASC;`);
}

export async function inserirTransacao(transacao: Transacao): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO transacoes (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status, categoria_icone, identificador_externo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      transacao.id,
      transacao.nome,
      transacao.subtitulo,
      transacao.valor,
      transacao.tipo,
      transacao.data,
      transacao.hora,
      transacao.bancoId,
      transacao.status,
      transacao.categoriaIcone,
      transacao.identificadorExterno,
    ]
  );
}

export async function listarTransacoes(limite?: number): Promise<TransacaoComBanco[]> {
  const db = await getDatabase();

  const query = `
    SELECT
      t.id, t.nome, t.subtitulo, t.valor, t.tipo, t.data, t.hora,
      t.status, t.categoria_icone as categoriaIcone, t.criado_em as criadoEm,
      t.identificador_externo as identificadorExterno,
      b.id as banco_id, b.nome as banco_nome, b.sigla as banco_sigla, b.cor as banco_cor
    FROM transacoes t
    INNER JOIN bancos b ON b.id = t.banco_id
    ORDER BY t.data DESC, t.criado_em DESC
    ${limite ? `LIMIT ${limite}` : ""};
  `;

  type LinhaBruta = {
    id: string;
    nome: string;
    subtitulo: string;
    valor: number;
    tipo: TipoTransacao;
    data: string;
    hora: string | null;
    status: StatusTransacao;
    categoriaIcone: string | null;
    criadoEm: string;
    identificadorExterno: string | null;
    banco_id: string;
    banco_nome: string;
    banco_sigla: string;
    banco_cor: string;
  };

  const linhas = await db.getAllAsync<LinhaBruta>(query);

  return linhas.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    subtitulo: linha.subtitulo,
    valor: linha.valor,
    tipo: linha.tipo,
    data: linha.data,
    hora: linha.hora,
    status: linha.status,
    categoriaIcone: linha.categoriaIcone,
    criadoEm: linha.criadoEm,
    identificadorExterno: linha.identificadorExterno,
    banco: {
      id: linha.banco_id,
      nome: linha.banco_nome,
      sigla: linha.banco_sigla,
      cor: linha.banco_cor,
    },
  }));
}

/**
 * Busca transações de um banco específico dentro de um intervalo de datas
 * (ambas em ISO, inclusivas). Usada pela deduplicação: antes de importar
 * um CSV, buscamos só as transações já existentes no período coberto pelo
 * arquivo, em vez de carregar a tabela inteira — mais rápido e escalável
 * conforme o histórico do usuário cresce.
 */
export async function listarTransacoesPorPeriodo(
  bancoId: string,
  dataInicioIso: string,
  dataFimIso: string
): Promise<Transacao[]> {
  const db = await getDatabase();

  return db.getAllAsync<Transacao>(
    `SELECT
       id, nome, subtitulo, valor, tipo, data, hora, banco_id as bancoId,
       status, categoria_icone as categoriaIcone, criado_em as criadoEm,
       identificador_externo as identificadorExterno
     FROM transacoes
     WHERE banco_id = ? AND data >= ? AND data <= ?;`,
    [bancoId, dataInicioIso, dataFimIso]
  );
}

/**
 * Verifica rapidamente se um identificador externo (UUID do Nubank, por
 * exemplo) já existe no banco — comparação exata, usada quando o banco
 * de origem fornece um ID único e confiável para a transação.
 */
export async function existeIdentificadorExterno(identificadorExterno: string): Promise<boolean> {
  const db = await getDatabase();
  const resultado = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM transacoes WHERE identificador_externo = ?;`,
    [identificadorExterno]
  );
  return (resultado?.total ?? 0) > 0;
}

export async function seedDadosIniciaisSeNecessario(): Promise<void> {
  const bancosExistentes = await listarBancos();
  if (bancosExistentes.length > 0) return;

  const bancosPadrao: Banco[] = [
    { id: "nubank", nome: "Nubank", sigla: "nu", cor: "#8D11DA" },
    { id: "inter", nome: "Inter", sigla: "in", cor: "#FF7A01" },
    { id: "bb", nome: "Banco do Brasil", sigla: "BB", cor: "#FDFC30" },
  ];

  for (const banco of bancosPadrao) {
    await upsertBanco(banco);
  }
}
