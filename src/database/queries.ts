import { getDatabase, executarNaFila } from "./database";
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
  data: string;
  hora: string | null;
  bancoId: string;
  status: StatusTransacao;
  categoriaIcone: string | null;
  criadoEm: string;
  identificadorExterno: string | null;
};

export type TransacaoComBanco = Omit<Transacao, "bancoId"> & {
  banco: Banco;
};

export type CamposEditaveisTransacao = {
  nome: string;
  subtitulo: string;
  valor: number;
  tipo: TipoTransacao;
  data: string;
  categoriaIcone: string | null;
};

export async function upsertBanco(banco: Banco): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO bancos (id, nome, sigla, cor)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, sigla = excluded.sigla, cor = excluded.cor;`,
      [banco.id, banco.nome, banco.sigla, banco.cor]
    );
  });
}

export async function listarBancos(): Promise<Banco[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Banco>(`SELECT id, nome, sigla, cor FROM bancos ORDER BY nome ASC;`);
  });
}

export async function inserirTransacao(transacao: Transacao): Promise<void> {
  return executarNaFila(async () => {
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
  });
}

export async function atualizarTransacao(
  id: string,
  campos: CamposEditaveisTransacao
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE transacoes
       SET nome = ?, subtitulo = ?, valor = ?, tipo = ?, data = ?, categoria_icone = ?
       WHERE id = ?;`,
      [campos.nome, campos.subtitulo, campos.valor, campos.tipo, campos.data, campos.categoriaIcone, id]
    );
  });
}

export async function excluirTransacao(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM transacoes WHERE id = ?;`, [id]);
  });
}

export async function listarTransacoes(limite?: number): Promise<TransacaoComBanco[]> {
  return executarNaFila(async () => {
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
  });
}

export async function listarTransacoesPorPeriodo(
  bancoId: string,
  dataInicioIso: string,
  dataFimIso: string
): Promise<Transacao[]> {
  return executarNaFila(async () => {
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
  });
}

export async function existeIdentificadorExterno(identificadorExterno: string): Promise<boolean> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const resultado = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM transacoes WHERE identificador_externo = ?;`,
      [identificadorExterno]
    );
    return (resultado?.total ?? 0) > 0;
  });
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

  const hoje = dataHojeIso();

  const transacoesIniciais: Transacao[] = [
    {
      id: "seed-1",
      nome: "UBER",
      subtitulo: "Transporte",
      valor: 25.5,
      tipo: "saida",
      data: hoje,
      hora: null,
      bancoId: "nubank",
      status: "concluida",
      categoriaIcone: "car-outline",
      criadoEm: new Date().toISOString(),
      identificadorExterno: null,
    },
    {
      id: "seed-2",
      nome: "Transferência recebida",
      subtitulo: "Transferência",
      valor: 2500,
      tipo: "entrada",
      data: hoje,
      hora: null,
      bancoId: "inter",
      status: "concluida",
      categoriaIcone: "swap-horizontal-outline",
      criadoEm: new Date().toISOString(),
      identificadorExterno: null,
    },
    {
      id: "seed-3",
      nome: "Pão de Açúcar",
      subtitulo: "Mercado",
      valor: 140.9,
      tipo: "saida",
      data: hoje,
      hora: null,
      bancoId: "bb",
      status: "concluida",
      categoriaIcone: "cart-outline",
      criadoEm: new Date().toISOString(),
      identificadorExterno: null,
    },
  ];

  for (const transacao of transacoesIniciais) {
    await inserirTransacao(transacao);
  }
}
