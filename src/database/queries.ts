import { getDatabase } from "./database";

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
  data: string;
  hora: string | null;
  bancoId: string;
  status: StatusTransacao;
  categoriaIcone: string | null;
  criadoEm: string;
};

// Formato "achatado" que a UI já espera (banco embutido no objeto,
// igual ao TransacoesContext original) — evita reescrever as telas.
export type TransacaoComBanco = Omit<Transacao, "bancoId"> & {
  banco: Banco;
};

/**
 * Insere um banco (instituição financeira) se ele ainda não existir.
 * Usar ON CONFLICT para permitir chamar isso repetidamente sem erro
 * (por exemplo, toda vez que o app carrega os bancos "padrão").
 */
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

/**
 * Insere uma nova transação. O `id` deve ser gerado antes de chamar
 * (ex: com um UUID), para manter a camada de banco "burra" — ela só
 * grava o que recebe, sem gerar identificadores por conta própria.
 */
export async function inserirTransacao(transacao: Transacao): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO transacoes (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status, categoria_icone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
    ]
  );
}

/**
 * Lista transações já com os dados do banco embutidos (JOIN),
 * ordenadas da mais recente para a mais antiga.
 * `limite` é opcional — útil para telas que só mostram as N mais recentes (Home).
 */
export async function listarTransacoes(limite?: number): Promise<TransacaoComBanco[]> {
  const db = await getDatabase();

  const query = `
    SELECT
      t.id, t.nome, t.subtitulo, t.valor, t.tipo, t.data, t.hora,
      t.status, t.categoria_icone as categoriaIcone, t.criado_em as criadoEm,
      b.id as banco_id, b.nome as banco_nome, b.sigla as banco_sigla, b.cor as banco_cor
    FROM transacoes t
    INNER JOIN bancos b ON b.id = t.banco_id
    ORDER BY t.criado_em DESC
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
    banco: {
      id: linha.banco_id,
      nome: linha.banco_nome,
      sigla: linha.banco_sigla,
      cor: linha.banco_cor,
    },
  }));
}

/**
 * Popula o banco com dados iniciais na primeira execução do app —
 * útil tanto para demonstração (TCC) quanto para o usuário não abrir
 * o app em um estado totalmente vazio. Seguro para chamar sempre:
 * só insere se a tabela de bancos estiver vazia.
 */
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

  const transacoesIniciais: Transacao[] = [
    {
      id: "seed-1",
      nome: "UBER",
      subtitulo: "Transporte",
      valor: 25.5,
      tipo: "saida",
      data: "05/06/2026",
      hora: null,
      bancoId: "nubank",
      status: "concluida",
      categoriaIcone: "car-outline",
      criadoEm: new Date().toISOString(),
    },
    {
      id: "seed-2",
      nome: "Transferência recebida",
      subtitulo: "Transferência",
      valor: 2500,
      tipo: "entrada",
      data: "05/06/2026",
      hora: null,
      bancoId: "inter",
      status: "concluida",
      categoriaIcone: "swap-horizontal-outline",
      criadoEm: new Date().toISOString(),
    },
    {
      id: "seed-3",
      nome: "Pão de Açúcar",
      subtitulo: "Mercado",
      valor: 140.9,
      tipo: "saida",
      data: "05/06/2026",
      hora: null,
      bancoId: "bb",
      status: "concluida",
      categoriaIcone: "cart-outline",
      criadoEm: new Date().toISOString(),
    },
  ];

  for (const transacao of transacoesIniciais) {
    await inserirTransacao(transacao);
  }
}
