import { getDatabase, executarNaFila } from "./database";
import { dataHojeIso } from "@/utils/dateUtils";
import { CategoriaId } from "./categorias";

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
  categoriaId: CategoriaId | null;
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
  categoriaId: CategoriaId | null;
};

/**
 * Filtros aceitos pelas queries de agregação (listarResumoPorCategoria,
 * listarResumoPorBanco) e reaproveitáveis por qualquer query futura que
 * precise da mesma semântica. Cada campo `null`/ausente significa
 * "sem filtro nesse eixo" — é assim que o comportamento padrão pedido
 * (gráficos agrupando tudo, de todos os bancos) é obtido: chamar as
 * funções de agregação com um objeto de filtros vazio.
 */
export type FiltrosTransacao = {
  bancosIds?: string[] | null; // null/undefined/[] = todos os bancos
  categoriasIds?: (CategoriaId | null)[] | null; // inclui `null` explícito para filtrar "sem categoria"; null/undefined = todas
  dataInicio?: string | null; // ISO aaaa-mm-dd, inclusive
  dataFim?: string | null; // ISO aaaa-mm-dd, inclusive
};

/**
 * Monta a cláusula WHERE + parâmetros a partir de FiltrosTransacao.
 * Centralizado aqui para as duas queries de agregação (e qualquer
 * outra futura) nunca divergirem na forma de interpretar os filtros.
 */
function montarClausulaFiltros(filtros: FiltrosTransacao): { where: string; params: (string | null)[] } {
  const condicoes: string[] = [];
  const params: (string | null)[] = [];

  if (filtros.bancosIds && filtros.bancosIds.length > 0) {
    condicoes.push(`t.banco_id IN (${filtros.bancosIds.map(() => "?").join(", ")})`);
    params.push(...filtros.bancosIds);
  }

  if (filtros.categoriasIds && filtros.categoriasIds.length > 0) {
    // Separamos o caso "sem categoria" (null) do restante, porque
    // `IN (...)` do SQLite não casa com NULL — precisa de `IS NULL` à parte.
    const categoriasReais = filtros.categoriasIds.filter((c): c is CategoriaId => c !== null);
    const incluiSemCategoria = filtros.categoriasIds.includes(null);

    const subCondicoes: string[] = [];
    if (categoriasReais.length > 0) {
      subCondicoes.push(`t.categoria_id IN (${categoriasReais.map(() => "?").join(", ")})`);
      params.push(...categoriasReais);
    }
    if (incluiSemCategoria) {
      subCondicoes.push(`t.categoria_id IS NULL`);
    }
    if (subCondicoes.length > 0) {
      condicoes.push(`(${subCondicoes.join(" OR ")})`);
    }
  }

  if (filtros.dataInicio) {
    condicoes.push(`t.data >= ?`);
    params.push(filtros.dataInicio);
  }

  if (filtros.dataFim) {
    condicoes.push(`t.data <= ?`);
    params.push(filtros.dataFim);
  }

  return {
    where: condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "",
    params,
  };
}

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
      `INSERT INTO transacoes (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status, categoria_icone, categoria_id, identificador_externo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        transacao.categoriaId,
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
       SET nome = ?, subtitulo = ?, valor = ?, tipo = ?, data = ?, categoria_icone = ?, categoria_id = ?
       WHERE id = ?;`,
      [
        campos.nome,
        campos.subtitulo,
        campos.valor,
        campos.tipo,
        campos.data,
        campos.categoriaIcone,
        campos.categoriaId,
        id,
      ]
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
        t.status, t.categoria_icone as categoriaIcone, t.categoria_id as categoriaId,
        t.criado_em as criadoEm, t.identificador_externo as identificadorExterno,
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
      categoriaId: CategoriaId | null;
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
      categoriaId: linha.categoriaId,
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
         status, categoria_icone as categoriaIcone, categoria_id as categoriaId,
         criado_em as criadoEm, identificador_externo as identificadorExterno
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

/**
 * Conta quantas transações ainda não têm categoria definida
 * (categoria_id IS NULL). Usado para avisar o usuário depois de uma
 * importação e, futuramente, em um contador persistente na Home/Perfil.
 */
export async function contarTransacoesSemCategoria(): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const resultado = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM transacoes WHERE categoria_id IS NULL;`
    );
    return resultado?.total ?? 0;
  });
}

export type ResumoPorCategoria = {
  categoriaId: CategoriaId | null;
  totalEntradas: number;
  totalSaidas: number;
  quantidade: number;
};

/**
 * Agrega o total gasto/recebido por categoria, respeitando os filtros
 * informados (banco(s), período, categoria(s)). Uma única query com
 * GROUP BY — não itera transação por transação em JS. É o que alimenta
 * DistribuicaoOrcamento e AnaliseGrafica.
 *
 * Sem filtros (objeto vazio ou tudo null), agrega TODAS as transações
 * de TODOS os bancos — esse é o comportamento padrão pedido (gráfico
 * agrupado por categoria, independente de banco).
 */
export async function listarResumoPorCategoria(
  filtros: FiltrosTransacao = {}
): Promise<ResumoPorCategoria[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const { where, params } = montarClausulaFiltros(filtros);

    return db.getAllAsync<ResumoPorCategoria>(
      `SELECT
         t.categoria_id as categoriaId,
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as totalEntradas,
         COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as totalSaidas,
         COUNT(*) as quantidade
       FROM transacoes t
       ${where}
       GROUP BY t.categoria_id
       ORDER BY totalSaidas DESC;`,
      params
    );
  });
}

export type ResumoPorBanco = {
  bancoId: string;
  bancoNome: string;
  bancoSigla: string;
  bancoCor: string;
  totalEntradas: number;
  totalSaidas: number;
  quantidade: number;
};

/**
 * Mesma ideia de listarResumoPorCategoria, mas agrupando por banco —
 * usado para o filtro de banco saber quais bancos têm transações e
 * para qualquer visão futura de "gastos por banco".
 */
export async function listarResumoPorBanco(
  filtros: FiltrosTransacao = {}
): Promise<ResumoPorBanco[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const { where, params } = montarClausulaFiltros(filtros);

    return db.getAllAsync<ResumoPorBanco>(
      `SELECT
         b.id as bancoId, b.nome as bancoNome, b.sigla as bancoSigla, b.cor as bancoCor,
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as totalEntradas,
         COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as totalSaidas,
         COUNT(*) as quantidade
       FROM transacoes t
       INNER JOIN bancos b ON b.id = t.banco_id
       ${where}
       GROUP BY b.id
       ORDER BY b.nome ASC;`,
      params
    );
  });
}

/**
 * Lista as transações que casam com os filtros informados, com dados
 * de banco já resolvidos — usado pela lista de "Últimas transações"
 * quando os filtros de banco/período/categoria estão ativos.
 */
export async function listarTransacoesFiltradas(
  filtros: FiltrosTransacao = {},
  limite?: number
): Promise<TransacaoComBanco[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const { where, params } = montarClausulaFiltros(filtros);

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
      categoriaId: CategoriaId | null;
      criadoEm: string;
      identificadorExterno: string | null;
      banco_id: string;
      banco_nome: string;
      banco_sigla: string;
      banco_cor: string;
    };

    const linhas = await db.getAllAsync<LinhaBruta>(
      `SELECT
         t.id, t.nome, t.subtitulo, t.valor, t.tipo, t.data, t.hora,
         t.status, t.categoria_icone as categoriaIcone, t.categoria_id as categoriaId,
         t.criado_em as criadoEm, t.identificador_externo as identificadorExterno,
         b.id as banco_id, b.nome as banco_nome, b.sigla as banco_sigla, b.cor as banco_cor
       FROM transacoes t
       INNER JOIN bancos b ON b.id = t.banco_id
       ${where}
       ORDER BY t.data DESC, t.criado_em DESC
       ${limite ? `LIMIT ${limite}` : ""};`,
      params
    );

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
      categoriaId: linha.categoriaId,
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

/**
 * Calcula o saldo ACUMULADO (soma de todas as entradas menos todas as
 * saídas, desde o início dos dados) até uma data limite (inclusive),
 * opcionalmente restrito a um conjunto de bancos. Usado para a
 * variação percentual do card de Resumo: "saldo até hoje" vs
 * "saldo até o mesmo dia do mês anterior".
 *
 * Não usa FiltrosTransacao/montarClausulaFiltros porque aqui só o
 * filtro de banco é relevante (a data é sempre um teto "até X", não um
 * intervalo) — evita reaproveitar uma função pensada para outro formato
 * de filtro e criar ambiguidade sobre o que dataInicio/dataFim significam.
 */
export async function calcularSaldoAcumuladoAte(
  dataLimiteIso: string,
  bancosIds?: string[] | null
): Promise<number> {
  return executarNaFila(async () => {
    const db = await getDatabase();

    const condicoes = ["t.data <= ?"];
    const params: string[] = [dataLimiteIso];

    if (bancosIds && bancosIds.length > 0) {
      condicoes.push(`t.banco_id IN (${bancosIds.map(() => "?").join(", ")})`);
      params.push(...bancosIds);
    }

    const resultado = await db.getFirstAsync<{ saldo: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE -t.valor END), 0) as saldo
       FROM transacoes t
       WHERE ${condicoes.join(" AND ")};`,
      params
    );

    return resultado?.saldo ?? 0;
  });
}

export type PontoSaldoDiario = { data: string; saldoAcumulado: number };

/**
 * Série de saldo acumulado dia a dia, do (hoje - diasAtras) até hoje
 * (inclusive), opcionalmente restrita a um conjunto de bancos. Usada
 * pelo Sparkline do card de Resumo.
 *
 * Implementação: uma query traz o delta líquido (entradas - saídas)
 * agrupado por dia dentro da janela solicitada, mais UMA query extra
 * para o saldo acumulado até o dia anterior ao início da janela (a
 * "base" sobre a qual os deltas diários se acumulam) — não itera dia a
 * dia no banco, só em memória sobre um array pequeno (tamanho = diasAtras).
 */
export async function listarSerieSaldoDiario(
  diasAtras: number,
  bancosIds?: string[] | null
): Promise<PontoSaldoDiario[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();

    const hoje = new Date();
    const dataInicioObj = new Date(hoje);
    dataInicioObj.setDate(dataInicioObj.getDate() - (diasAtras - 1));

    const paraIso = (d: Date) => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    };

    const dataInicioIso = paraIso(dataInicioObj);
    const dataFimIso = paraIso(hoje);

    const dataAnteriorObj = new Date(dataInicioObj);
    dataAnteriorObj.setDate(dataAnteriorObj.getDate() - 1);
    const dataAnteriorIso = paraIso(dataAnteriorObj);

    const bancoCondicao = bancosIds && bancosIds.length > 0
      ? `AND t.banco_id IN (${bancosIds.map(() => "?").join(", ")})`
      : "";
    const bancoParams = bancosIds && bancosIds.length > 0 ? bancosIds : [];

    // Saldo acumulado até o dia imediatamente anterior ao início da
    // janela — é a "base" sobre a qual os deltas diários somam.
    const baseResultado = await db.getFirstAsync<{ saldo: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE -t.valor END), 0) as saldo
       FROM transacoes t
       WHERE t.data <= ? ${bancoCondicao};`,
      [dataAnteriorIso, ...bancoParams]
    );
    const saldoBase = baseResultado?.saldo ?? 0;

    // Delta líquido por dia dentro da janela — um único GROUP BY, não
    // uma query por dia.
    const deltasPorDia = await db.getAllAsync<{ data: string; delta: number }>(
      `SELECT
         t.data as data,
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE -t.valor END), 0) as delta
       FROM transacoes t
       WHERE t.data >= ? AND t.data <= ? ${bancoCondicao}
       GROUP BY t.data;`,
      [dataInicioIso, dataFimIso, ...bancoParams]
    );

    const deltaPorData = new Map(deltasPorDia.map((d) => [d.data, d.delta]));

    // Preenche TODOS os dias da janela (mesmo sem transação naquele
    // dia), acumulando a partir da base — é isso que dá uma série
    // contínua de 30 pontos para o Sparkline, em vez de só os dias com
    // movimentação.
    const serie: PontoSaldoDiario[] = [];
    let acumulado = saldoBase;
    const cursor = new Date(dataInicioObj);

    for (let i = 0; i < diasAtras; i++) {
      const dataIso = paraIso(cursor);
      acumulado += deltaPorData.get(dataIso) ?? 0;
      serie.push({ data: dataIso, saldoAcumulado: acumulado });
      cursor.setDate(cursor.getDate() + 1);
    }

    return serie;
  });
}

export type PontoEvolucaoMensal = { mesAno: string; mesLabel: string; totalSaidas: number };

/**
 * Total de saídas por mês, para os últimos `quantidadeMeses` meses
 * (incluindo o mês atual). Usado pelo gráfico EvolucaoMensal. Uma
 * única query com GROUP BY strftime — não itera mês a mês no banco.
 *
 * Meses sem nenhuma transação aparecem com totalSaidas = 0 (preenchidos
 * em memória), para o gráfico sempre ter os N pontos esperados.
 */
export async function listarEvolucaoMensal(quantidadeMeses: number = 6): Promise<PontoEvolucaoMensal[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();

    const hoje = new Date();
    const dataInicioObj = new Date(hoje.getFullYear(), hoje.getMonth() - (quantidadeMeses - 1), 1);
    const dataInicioIso = `${dataInicioObj.getFullYear()}-${String(dataInicioObj.getMonth() + 1).padStart(2, "0")}-01`;

    const linhas = await db.getAllAsync<{ mesAno: string; totalSaidas: number }>(
      `SELECT
         strftime('%Y-%m', t.data) as mesAno,
         COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as totalSaidas
       FROM transacoes t
       WHERE t.data >= ?
       GROUP BY mesAno;`,
      [dataInicioIso]
    );

    const totalPorMes = new Map(linhas.map((l) => [l.mesAno, l.totalSaidas]));
    const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const resultado: PontoEvolucaoMensal[] = [];
    for (let i = 0; i < quantidadeMeses; i++) {
      const dataMes = new Date(dataInicioObj.getFullYear(), dataInicioObj.getMonth() + i, 1);
      const mesAno = `${dataMes.getFullYear()}-${String(dataMes.getMonth() + 1).padStart(2, "0")}`;
      resultado.push({
        mesAno,
        mesLabel: NOMES_MES[dataMes.getMonth()],
        totalSaidas: totalPorMes.get(mesAno) ?? 0,
      });
    }

    return resultado;
  });
}

export type ResumoReceitasDespesas = {
  receitasMesAtual: number;
  receitasMesAnterior: number;
  despesasMesAtual: number;
  despesasMesAnterior: number;
};

/**
 * Receitas e despesas de um mês-alvo e do mês imediatamente anterior a
 * ele (mês calendário completo, não "últimos 30 dias"). Por padrão
 * (sem argumentos) usa o mês/ano atuais — é assim que ResumoMetrics e
 * AnaliseGrafica continuam funcionando sem mudança nenhuma.
 *
 * `anoAlvo`/`mesAlvo` (mesAlvo em 1-12, formato "humano") permitem
 * pedir o resumo de qualquer mês específico — usado por VisaoGeralMes
 * quando o usuário navega para outro mês no seletor.
 */
export async function calcularResumoReceitasDespesas(
  anoAlvo?: number,
  mesAlvo?: number
): Promise<ResumoReceitasDespesas> {
  return executarNaFila(async () => {
    const db = await getDatabase();

    const hoje = new Date();
    const ano = anoAlvo ?? hoje.getFullYear();
    const mes = mesAlvo ?? hoje.getMonth() + 1; // 1-12

    const inicioMesAtual = `${ano}-${String(mes).padStart(2, "0")}-01`;
    // Fim do mês alvo = último dia real do mês (dia 0 do mês seguinte).
    const fimMesAtualObj = new Date(ano, mes, 0);
    const fimMesAtualIso = `${fimMesAtualObj.getFullYear()}-${String(fimMesAtualObj.getMonth() + 1).padStart(2, "0")}-${String(fimMesAtualObj.getDate()).padStart(2, "0")}`;

    const mesAnteriorData = new Date(ano, mes - 2, 1); // mes é 1-12, então mes-2 é o mês anterior em índice 0-11
    const inicioMesAnterior = `${mesAnteriorData.getFullYear()}-${String(mesAnteriorData.getMonth() + 1).padStart(2, "0")}-01`;
    const fimMesAnterior = new Date(mesAnteriorData.getFullYear(), mesAnteriorData.getMonth() + 1, 0);
    const fimMesAnteriorIso = `${fimMesAnterior.getFullYear()}-${String(fimMesAnterior.getMonth() + 1).padStart(2, "0")}-${String(fimMesAnterior.getDate()).padStart(2, "0")}`;

    const [atual, anterior] = await Promise.all([
      db.getFirstAsync<{ entradas: number; saidas: number }>(
        `SELECT
           COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as entradas,
           COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as saidas
         FROM transacoes t
         WHERE t.data >= ? AND t.data <= ?;`,
        [inicioMesAtual, fimMesAtualIso]
      ),
      db.getFirstAsync<{ entradas: number; saidas: number }>(
        `SELECT
           COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor ELSE 0 END), 0) as entradas,
           COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor ELSE 0 END), 0) as saidas
         FROM transacoes t
         WHERE t.data >= ? AND t.data <= ?;`,
        [inicioMesAnterior, fimMesAnteriorIso]
      ),
    ]);

    return {
      receitasMesAtual: atual?.entradas ?? 0,
      receitasMesAnterior: anterior?.entradas ?? 0,
      despesasMesAtual: atual?.saidas ?? 0,
      despesasMesAnterior: anterior?.saidas ?? 0,
    };
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
      categoriaId: "transporte",
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
      categoriaId: "transferencia",
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
      categoriaId: "mercado",
      criadoEm: new Date().toISOString(),
      identificadorExterno: null,
    },
  ];

  for (const transacao of transacoesIniciais) {
    await inserirTransacao(transacao);
  }
}