import { getDatabase, executarNaFila } from "./database";
import { dataHojeIso } from "@/utils/dateUtils";

/**
 * Contas do usuário (tabela `bancos`, estendida na migration 21) e
 * transferências entre elas.
 *
 * "Conta" é qualquer lugar onde o dinheiro fica: os bancos com
 * importador de CSV (nubank/inter/bb, semeados por
 * garantirBancosSuportados) e as contas personalizadas que o usuário
 * cria ("Outro banco", carteira, cartão de crédito...).
 *
 * Transferência = duas linhas em `transacoes` com o mesmo
 * `transferencia_id`: uma SAÍDA na origem e uma ENTRADA no destino, de
 * mesmo valor e data. Ficam fora de receitas/despesas/orçamento (ver
 * `excluirTransferencias` em queries.ts) e só mexem no saldo de cada
 * conta. Toda escrita aqui mantém as duas pernas consistentes.
 */

export type TipoConta = "conta" | "cartao";

export type Conta = {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  tipo: TipoConta;
  saldoInicial: number;
  diaFechamento: number | null; // só cartão: 1..31
  diaVencimento: number | null; // só cartão: 1..31
  personalizada: boolean; // criada pelo usuário (pode editar nome/excluir)
  arquivada: boolean; // some dos seletores, mas o histórico continua
};

export type ContaComSaldo = Conta & {
  saldo: number; // saldo_inicial + entradas - saídas (com transferências)
  quantidadeTransacoes: number;
};

type LinhaConta = {
  id: string;
  nome: string;
  sigla: string;
  cor: string;
  tipo: TipoConta;
  saldo_inicial: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  personalizada: number;
  arquivada: number;
};

const COLUNAS_CONTA = `b.id, b.nome, b.sigla, b.cor, b.tipo, b.saldo_inicial, b.dia_fechamento,
  b.dia_vencimento, b.personalizada, b.arquivada`;

function mapearConta(l: LinhaConta): Conta {
  return {
    id: l.id,
    nome: l.nome,
    sigla: l.sigla,
    cor: l.cor,
    tipo: l.tipo,
    saldoInicial: l.saldo_inicial ?? 0,
    diaFechamento: l.dia_fechamento,
    diaVencimento: l.dia_vencimento,
    personalizada: l.personalizada === 1,
    arquivada: l.arquivada === 1,
  };
}

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Todas as contas (inclusive arquivadas) com saldo calculado. LEFT JOIN
 * para contas sem nenhuma transação também aparecerem (ex: conta nova
 * só com saldo inicial). Ordem: contas antes de cartões, depois nome.
 */
export async function listarContasComSaldo(): Promise<ContaComSaldo[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaConta & { movimento: number; quantidade: number }>(
      `SELECT ${COLUNAS_CONTA},
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor WHEN t.tipo = 'saida' THEN -t.valor ELSE 0 END), 0) as movimento,
         COUNT(t.id) as quantidade
       FROM bancos b
       LEFT JOIN transacoes t ON t.banco_id = b.id
       GROUP BY b.id
       ORDER BY CASE b.tipo WHEN 'conta' THEN 0 ELSE 1 END, b.nome COLLATE NOCASE ASC;`
    );
    return linhas.map((l) => ({
      ...mapearConta(l),
      saldo: (l.saldo_inicial ?? 0) + l.movimento,
      quantidadeTransacoes: l.quantidade,
    }));
  });
}

export type NovaContaInput = {
  nome: string;
  sigla: string;
  cor: string;
  tipo: TipoConta;
  saldoInicial: number;
  diaFechamento?: number | null;
  diaVencimento?: number | null;
};

export async function criarConta(input: NovaContaInput): Promise<string> {
  const id = gerarId(input.tipo === "cartao" ? "cartao" : "conta");
  await executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO bancos (id, nome, sigla, cor, tipo, saldo_inicial, dia_fechamento, dia_vencimento, personalizada, arquivada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0);`,
      [
        id,
        input.nome.trim(),
        input.sigla.trim().slice(0, 3),
        input.cor,
        input.tipo,
        input.saldoInicial,
        input.tipo === "cartao" ? input.diaFechamento ?? null : null,
        input.tipo === "cartao" ? input.diaVencimento ?? null : null,
      ]
    );
  });
  return id;
}

export type EdicaoContaInput = {
  nome: string;
  sigla: string;
  cor: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
};

/**
 * Edita os dados visuais/de cartão. Para as contas do catálogo
 * (nubank/inter/bb) nome/sigla/cor são regravados por
 * garantirBancosSuportados a cada boot — por isso a UI só deixa editar
 * esses campos em contas personalizadas.
 */
export async function atualizarConta(id: string, campos: EdicaoContaInput): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE bancos SET nome = ?, sigla = ?, cor = ?, dia_fechamento = ?, dia_vencimento = ? WHERE id = ?;`,
      [campos.nome.trim(), campos.sigla.trim().slice(0, 3), campos.cor, campos.diaFechamento, campos.diaVencimento, id]
    );
  });
}

export async function definirContaArquivada(id: string, arquivada: boolean): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE bancos SET arquivada = ? WHERE id = ?;`, [arquivada ? 1 : 0, id]);
  });
}

/**
 * Exclui uma conta personalizada SEM transações. Com transações, a UI
 * oferece arquivar — apagar o histórico junto seria destrutivo demais e
 * a FK de transacoes.banco_id bloquearia de qualquer jeito.
 */
export async function excluirConta(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM transacoes WHERE banco_id = ?;`,
      [id]
    );
    if ((r?.n ?? 0) > 0) throw new Error("A conta tem transações — arquive em vez de excluir.");
    await db.runAsync(`DELETE FROM bancos WHERE id = ? AND personalizada = 1;`, [id]);
  });
}

/**
 * "Ajustar saldo": o usuário informa quanto a conta tem DE VERDADE hoje
 * e o saldo_inicial é recalculado para o saldo exibido bater, sem criar
 * transação de ajuste (que distorceria receitas/despesas).
 */
export async function ajustarSaldoAtual(id: string, saldoReal: number): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{ movimento: number }>(
      `SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0) as movimento
       FROM transacoes WHERE banco_id = ?;`,
      [id]
    );
    const novoInicial = Math.round((saldoReal - (r?.movimento ?? 0)) * 100) / 100;
    await db.runAsync(`UPDATE bancos SET saldo_inicial = ? WHERE id = ?;`, [novoInicial, id]);
  });
}

/* ------------------------------------------------------------------ */
/* Transferências                                                       */
/* ------------------------------------------------------------------ */

export type NovaTransferenciaInput = {
  origemId: string;
  destinoId: string;
  valor: number; // positivo
  data: string; // ISO
  descricao?: string;
};

function nomesPadrao(descricao: string | undefined, nomeOrigem: string, nomeDestino: string) {
  const d = descricao?.trim();
  return {
    saida: d || `Transferência para ${nomeDestino}`,
    entrada: d || `Transferência de ${nomeOrigem}`,
  };
}

/** Cria as duas pernas numa transação SQL só. Retorna o transferencia_id. */
export async function criarTransferencia(input: NovaTransferenciaInput): Promise<string> {
  if (input.origemId === input.destinoId) throw new Error("Origem e destino precisam ser contas diferentes.");
  if (!(input.valor > 0)) throw new Error("Valor inválido.");

  const transferenciaId = gerarId("trf");
  await executarNaFila(async () => {
    const db = await getDatabase();
    const contas = await db.getAllAsync<{ id: string; nome: string }>(
      `SELECT id, nome FROM bancos WHERE id IN (?, ?);`,
      [input.origemId, input.destinoId]
    );
    const nome = (id: string) => contas.find((c) => c.id === id)?.nome ?? "outra conta";
    const nomes = nomesPadrao(input.descricao, nome(input.origemId), nome(input.destinoId));

    await db.withTransactionAsync(async () => {
      const inserir = (id: string, n: string, tipo: "entrada" | "saida", bancoId: string) =>
        db.runAsync(
          `INSERT INTO transacoes (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status, categoria_icone, categoria_id, identificador_externo, transferencia_id)
           VALUES (?, ?, 'Transferência', ?, ?, ?, NULL, ?, 'concluida', 'swap-horizontal-outline', 'transferencia', NULL, ?);`,
          [id, n, input.valor, tipo, input.data, bancoId, transferenciaId]
        );
      await inserir(`${transferenciaId}-s`, nomes.saida, "saida", input.origemId);
      await inserir(`${transferenciaId}-e`, nomes.entrada, "entrada", input.destinoId);
    });
  });
  return transferenciaId;
}

export type PernasTransferencia = {
  transferenciaId: string;
  saida: { id: string; bancoId: string; nome: string } | null;
  entrada: { id: string; bancoId: string; nome: string } | null;
  valor: number;
  data: string;
};

export async function obterTransferencia(transferenciaId: string): Promise<PernasTransferencia | null> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<{
      id: string; banco_id: string; nome: string; tipo: "entrada" | "saida"; valor: number; data: string;
    }>(
      `SELECT id, banco_id, nome, tipo, valor, data FROM transacoes WHERE transferencia_id = ?;`,
      [transferenciaId]
    );
    if (linhas.length === 0) return null;
    const s = linhas.find((l) => l.tipo === "saida");
    const e = linhas.find((l) => l.tipo === "entrada");
    return {
      transferenciaId,
      saida: s ? { id: s.id, bancoId: s.banco_id, nome: s.nome } : null,
      entrada: e ? { id: e.id, bancoId: e.banco_id, nome: e.nome } : null,
      valor: linhas[0].valor,
      data: linhas[0].data,
    };
  });
}

/** Edita valor/data (e opcionalmente o nome) das DUAS pernas juntas. */
export async function atualizarTransferencia(
  transferenciaId: string,
  campos: { valor: number; data: string; nome?: string }
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE transacoes SET valor = ?, data = ? WHERE transferencia_id = ?;`,
        [campos.valor, campos.data, transferenciaId]
      );
      if (campos.nome?.trim()) {
        await db.runAsync(`UPDATE transacoes SET nome = ? WHERE transferencia_id = ?;`, [
          campos.nome.trim(),
          transferenciaId,
        ]);
      }
    });
  });
}

/** Exclui as duas pernas. */
export async function excluirTransferencia(transferenciaId: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM transacoes WHERE transferencia_id = ?;`, [transferenciaId]);
  });
}

/**
 * Desfaz o vínculo: as duas linhas continuam existindo, mas voltam a
 * ser entrada/saída comuns (contam de novo em receitas/despesas). Usado
 * quando o app (ou o usuário) marcou como transferência por engano.
 */
export async function desfazerTransferencia(transferenciaId: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE transacoes SET transferencia_id = NULL, categoria_id = NULL, categoria_icone = NULL
       WHERE transferencia_id = ? AND categoria_id = 'transferencia';`,
      [transferenciaId]
    );
    await db.runAsync(`UPDATE transacoes SET transferencia_id = NULL WHERE transferencia_id = ?;`, [
      transferenciaId,
    ]);
  });
}

/**
 * Liga duas transações JÁ EXISTENTES como as pernas de uma
 * transferência (ex: saída no Nubank e entrada no Inter importadas de
 * extratos diferentes). Exige uma saída e uma entrada, em contas
 * diferentes, ainda não ligadas a outra transferência.
 */
export async function vincularComoTransferencia(idSaida: string, idEntrada: string): Promise<string> {
  const transferenciaId = gerarId("trf");
  await executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<{ id: string; tipo: string; banco_id: string; transferencia_id: string | null }>(
      `SELECT id, tipo, banco_id, transferencia_id FROM transacoes WHERE id IN (?, ?);`,
      [idSaida, idEntrada]
    );
    const s = linhas.find((l) => l.id === idSaida);
    const e = linhas.find((l) => l.id === idEntrada);
    if (!s || !e || s.tipo !== "saida" || e.tipo !== "entrada") throw new Error("Par inválido.");
    if (s.banco_id === e.banco_id) throw new Error("As duas pernas estão na mesma conta.");
    if (s.transferencia_id || e.transferencia_id) throw new Error("Uma das transações já é transferência.");

    await db.runAsync(
      `UPDATE transacoes SET transferencia_id = ?, categoria_id = 'transferencia', categoria_icone = 'swap-horizontal-outline'
       WHERE id IN (?, ?);`,
      [transferenciaId, idSaida, idEntrada]
    );
  });
  return transferenciaId;
}

/**
 * Transforma UMA transação existente em transferência: procura a
 * contrapartida na outra conta (tipo oposto, mesmo valor, até 3 dias de
 * diferença, ainda não ligada); se achar, liga as duas; se não, cria a
 * perna que falta.
 */
export async function converterEmTransferencia(
  transacaoId: string,
  outraContaId: string
): Promise<{ transferenciaId: string; criouContrapartida: boolean }> {
  const dados = await executarNaFila(async () => {
    const db = await getDatabase();
    const t = await db.getFirstAsync<{
      id: string; tipo: "entrada" | "saida"; valor: number; data: string; banco_id: string; transferencia_id: string | null;
    }>(`SELECT id, tipo, valor, data, banco_id, transferencia_id FROM transacoes WHERE id = ?;`, [transacaoId]);
    if (!t) throw new Error("Transação não encontrada.");
    if (t.transferencia_id) throw new Error("A transação já é uma transferência.");
    if (t.banco_id === outraContaId) throw new Error("Escolha uma conta diferente da desta transação.");

    const par = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM transacoes
       WHERE banco_id = ? AND tipo = ? AND ABS(valor - ?) < 0.005 AND transferencia_id IS NULL
         AND ABS(julianday(data) - julianday(?)) <= 3
       ORDER BY ABS(julianday(data) - julianday(?)) ASC
       LIMIT 1;`,
      [outraContaId, t.tipo === "saida" ? "entrada" : "saida", t.valor, t.data, t.data]
    );
    return { t, parId: par?.id ?? null };
  });

  const { t, parId } = dados;
  if (parId) {
    const transferenciaId =
      t.tipo === "saida"
        ? await vincularComoTransferencia(t.id, parId)
        : await vincularComoTransferencia(parId, t.id);
    return { transferenciaId, criouContrapartida: false };
  }

  const transferenciaId = gerarId("trf");
  await executarNaFila(async () => {
    const db = await getDatabase();
    const contas = await db.getAllAsync<{ id: string; nome: string }>(
      `SELECT id, nome FROM bancos WHERE id = ?;`,
      [t.banco_id]
    );
    const nomeEsta = contas.find((c) => c.id === t.banco_id)?.nome ?? "outra conta";
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE transacoes SET transferencia_id = ?, categoria_id = 'transferencia', categoria_icone = 'swap-horizontal-outline'
         WHERE id = ?;`,
        [transferenciaId, t.id]
      );
      const tipoPar = t.tipo === "saida" ? "entrada" : "saida";
      await db.runAsync(
        `INSERT INTO transacoes (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status, categoria_icone, categoria_id, identificador_externo, transferencia_id)
         VALUES (?, ?, 'Transferência', ?, ?, ?, NULL, ?, 'concluida', 'swap-horizontal-outline', 'transferencia', NULL, ?);`,
        [
          `${transferenciaId}-${tipoPar === "entrada" ? "e" : "s"}`,
          tipoPar === "entrada" ? `Transferência de ${nomeEsta}` : `Transferência para ${nomeEsta}`,
          t.valor,
          tipoPar,
          t.data,
          outraContaId,
          transferenciaId,
        ]
      );
    });
  });
  return { transferenciaId, criouContrapartida: true };
}

export type SugestaoTransferencia = {
  saida: { id: string; nome: string; bancoId: string; bancoNome: string };
  entrada: { id: string; nome: string; bancoId: string; bancoNome: string };
  valor: number;
  data: string;
};

/**
 * Pares prováveis de transferência entre contas do usuário ainda não
 * ligados: uma saída e uma entrada de MESMO valor, em contas diferentes,
 * com até 2 dias de diferença. Restrito a transações cujo id está em
 * `idsRecentes` (ex: as recém-importadas) para não varrer o histórico
 * todo. Cada transação aparece em no máximo um par (guloso, pelo par de
 * datas mais próximas).
 */
export async function sugerirTransferencias(idsRecentes: string[]): Promise<SugestaoTransferencia[]> {
  if (idsRecentes.length === 0) return [];
  return executarNaFila(async () => {
    const db = await getDatabase();
    const sugestoes: SugestaoTransferencia[] = [];
    const usados = new Set<string>();

    for (let i = 0; i < idsRecentes.length; i += 400) {
      const bloco = idsRecentes.slice(i, i + 400);
      const marcadores = bloco.map(() => "?").join(", ");
      const linhas = await db.getAllAsync<{
        s_id: string; s_nome: string; s_banco: string; s_banco_nome: string;
        e_id: string; e_nome: string; e_banco: string; e_banco_nome: string;
        valor: number; data: string; distancia: number;
      }>(
        `SELECT s.id as s_id, s.nome as s_nome, s.banco_id as s_banco, bs.nome as s_banco_nome,
                e.id as e_id, e.nome as e_nome, e.banco_id as e_banco, be.nome as e_banco_nome,
                s.valor as valor, s.data as data,
                ABS(julianday(s.data) - julianday(e.data)) as distancia
         FROM transacoes s
         JOIN transacoes e ON e.tipo = 'entrada' AND e.banco_id <> s.banco_id
           AND ABS(e.valor - s.valor) < 0.005 AND e.transferencia_id IS NULL
           AND ABS(julianday(s.data) - julianday(e.data)) <= 2
         JOIN bancos bs ON bs.id = s.banco_id
         JOIN bancos be ON be.id = e.banco_id
         WHERE s.tipo = 'saida' AND s.transferencia_id IS NULL
           AND (s.id IN (${marcadores}) OR e.id IN (${marcadores}))
         ORDER BY distancia ASC, s.data DESC
         LIMIT 200;`,
        [...bloco, ...bloco]
      );
      for (const l of linhas) {
        if (usados.has(l.s_id) || usados.has(l.e_id)) continue;
        usados.add(l.s_id);
        usados.add(l.e_id);
        sugestoes.push({
          saida: { id: l.s_id, nome: l.s_nome, bancoId: l.s_banco, bancoNome: l.s_banco_nome },
          entrada: { id: l.e_id, nome: l.e_nome, bancoId: l.e_banco, bancoNome: l.e_banco_nome },
          valor: l.valor,
          data: l.data,
        });
      }
    }
    return sugestoes;
  });
}

/* ------------------------------------------------------------------ */
/* Cartão de crédito                                                    */
/* ------------------------------------------------------------------ */

function isoDe(ano: number, mes0: number, dia: number): string {
  // Clamp ao último dia do mês (dia 31 em fevereiro -> 28/29).
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const d = new Date(ano, mes0, Math.min(dia, ultimo));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type CicloFatura = {
  inicio: string; // ISO, inclusive (dia seguinte ao fechamento anterior)
  fechamento: string; // ISO, inclusive
  vencimento: string; // ISO
};

/**
 * Ciclo da fatura ABERTA na data `hojeIso`: vai do dia seguinte ao
 * fechamento anterior até o próximo fechamento (inclusive). Vencimento:
 * no mesmo mês do fechamento se dia_vencimento > dia_fechamento, senão
 * no mês seguinte (o caso comum: fecha dia 3, vence dia 10 — mesmo mês;
 * fecha dia 25, vence dia 5 — mês seguinte).
 */
export function calcularCicloFatura(
  diaFechamento: number,
  diaVencimento: number,
  hojeIso: string = dataHojeIso()
): CicloFatura {
  const [a, m] = hojeIso.split("-").map(Number);
  const mes0 = m - 1;
  const fechamentoEsteMes = isoDe(a, mes0, diaFechamento);
  const fechamentoAtual = hojeIso <= fechamentoEsteMes ? fechamentoEsteMes : isoDe(a, mes0 + 1, diaFechamento);
  const [fa, fm] = fechamentoAtual.split("-").map(Number);
  const fechamentoAnterior = isoDe(fa, fm - 2, diaFechamento);
  const inicioObj = new Date(`${fechamentoAnterior}T12:00:00`);
  inicioObj.setDate(inicioObj.getDate() + 1);
  const inicio = `${inicioObj.getFullYear()}-${String(inicioObj.getMonth() + 1).padStart(2, "0")}-${String(inicioObj.getDate()).padStart(2, "0")}`;
  const vencimento =
    diaVencimento > diaFechamento ? isoDe(fa, fm - 1, diaVencimento) : isoDe(fa, fm, diaVencimento);
  return { inicio, fechamento: fechamentoAtual, vencimento };
}

export type ResumoFatura = CicloFatura & {
  totalCompras: number; // saídas não-transferência no ciclo, menos estornos
  pagamentosNoCiclo: number; // transferências recebidas no ciclo
  saldoDevedor: number; // dívida total do cartão hoje (>= 0)
};

export async function calcularFaturaAtual(conta: ContaComSaldo, hojeIso: string = dataHojeIso()): Promise<ResumoFatura | null> {
  if (conta.tipo !== "cartao" || !conta.diaFechamento || !conta.diaVencimento) return null;
  const ciclo = calcularCicloFatura(conta.diaFechamento, conta.diaVencimento, hojeIso);
  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{ compras: number; pagamentos: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN transferencia_id IS NULL AND tipo = 'saida' THEN valor
                           WHEN transferencia_id IS NULL AND tipo = 'entrada' THEN -valor ELSE 0 END), 0) as compras,
         COALESCE(SUM(CASE WHEN transferencia_id IS NOT NULL AND tipo = 'entrada' THEN valor ELSE 0 END), 0) as pagamentos
       FROM transacoes WHERE banco_id = ? AND data >= ? AND data <= ?;`,
      [conta.id, ciclo.inicio, ciclo.fechamento]
    );
    return {
      ...ciclo,
      totalCompras: Math.max(0, r?.compras ?? 0),
      pagamentosNoCiclo: r?.pagamentos ?? 0,
      saldoDevedor: Math.max(0, -conta.saldo),
    };
  });
}
