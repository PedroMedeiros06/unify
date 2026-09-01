/**
 * Motor de cálculo das simulações do Planejamento — funções PURAS, sem
 * estado nem acesso a banco. Cada simulador recebe os parâmetros de
 * entrada e devolve um resultado já pronto para a UI exibir (valores
 * agregados + uma série temporal para o gráfico).
 *
 * Todas as taxas de entrada são ANUAIS em porcentagem (ex: 9.5 = 9,5%
 * a.a.); a conversão para taxa mensal equivalente é feita internamente
 * por juros compostos: (1 + i_ano) ^ (1/12) - 1.
 */

export type PontoSerie = { x: number; y: number };

/** (1 + taxaAnualPct/100) ^ (1/12) - 1 */
export function taxaMensalEquivalente(taxaAnualPct: number): number {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1;
}

// ---------------------------------------------------------------------------
// FINANCIAMENTO / EMPRÉSTIMO — Tabela Price (parcela fixa)
// ---------------------------------------------------------------------------

export type ParametrosFinanciamento = {
  valorBem: number; // valor do imóvel/bem
  entrada: number; // quanto o usuário dá de entrada
  prazoMeses: number;
  taxaAnualPct: number;
};

export type ResultadoFinanciamento = {
  valorFinanciado: number;
  parcelaMensal: number;
  totalPago: number; // soma de todas as parcelas
  jurosPagos: number; // totalPago - valorFinanciado
  custoEfetivoTotalPct: number; // totalPago / valorFinanciado - 1, em %
  saldoDevedor: PontoSerie[]; // x = mês (0..prazo), y = saldo restante
};

export function simularFinanciamento(p: ParametrosFinanciamento): ResultadoFinanciamento {
  const valorFinanciado = Math.max(p.valorBem - p.entrada, 0);
  const i = taxaMensalEquivalente(p.taxaAnualPct);
  const n = Math.max(Math.round(p.prazoMeses), 1);

  // Parcela Price. Se a taxa for ~0, cai em divisão simples.
  const parcelaMensal =
    i < 1e-9 ? valorFinanciado / n : (valorFinanciado * i) / (1 - Math.pow(1 + i, -n));

  const saldoDevedor: PontoSerie[] = [{ x: 0, y: valorFinanciado }];
  let saldo = valorFinanciado;
  for (let mes = 1; mes <= n; mes++) {
    const juros = saldo * i;
    const amortizacao = parcelaMensal - juros;
    saldo = Math.max(saldo - amortizacao, 0);
    saldoDevedor.push({ x: mes, y: saldo });
  }

  const totalPago = parcelaMensal * n;
  const jurosPagos = totalPago - valorFinanciado;
  const custoEfetivoTotalPct = valorFinanciado > 0 ? (totalPago / valorFinanciado - 1) * 100 : 0;

  return {
    valorFinanciado,
    parcelaMensal,
    totalPago,
    jurosPagos,
    custoEfetivoTotalPct,
    saldoDevedor,
  };
}

// ---------------------------------------------------------------------------
// EMPRÉSTIMO — Tabela Price, sem entrada (o valor solicitado É o financiado)
// ---------------------------------------------------------------------------
//
// Mesma matemática do financiamento, mas sem o conceito de entrada: no
// empréstimo pessoal o usuário pede um valor e paga esse valor + juros.
// Reaproveita simularFinanciamento internamente (entrada = 0).

export type ParametrosEmprestimo = {
  valorSolicitado: number;
  prazoMeses: number;
  taxaAnualPct: number;
};

export type ResultadoEmprestimo = {
  parcelaMensal: number;
  totalPago: number;
  jurosPagos: number;
  custoEfetivoTotalPct: number;
  saldoDevedor: PontoSerie[];
};

export function simularEmprestimo(p: ParametrosEmprestimo): ResultadoEmprestimo {
  const base = simularFinanciamento({
    valorBem: p.valorSolicitado,
    entrada: 0,
    prazoMeses: p.prazoMeses,
    taxaAnualPct: p.taxaAnualPct,
  });
  return {
    parcelaMensal: base.parcelaMensal,
    totalPago: base.totalPago,
    jurosPagos: base.jurosPagos,
    custoEfetivoTotalPct: base.custoEfetivoTotalPct,
    saldoDevedor: base.saldoDevedor,
  };
}

// ---------------------------------------------------------------------------
// INVESTIMENTO — aporte inicial + aportes mensais, juros compostos
// ---------------------------------------------------------------------------

export type ParametrosInvestimento = {
  aporteInicial: number;
  aporteMensal: number;
  meses: number;
  taxaAnualPct: number;
};

export type ResultadoInvestimento = {
  montanteFinal: number;
  totalInvestido: number; // aporteInicial + aporteMensal * meses
  rendimento: number; // montanteFinal - totalInvestido
  rendimentoPct: number; // rendimento / totalInvestido, em %
  evolucao: PontoSerie[]; // x = mês (0..meses), y = montante acumulado
};

export function simularInvestimento(p: ParametrosInvestimento): ResultadoInvestimento {
  const i = taxaMensalEquivalente(p.taxaAnualPct);
  const n = Math.max(Math.round(p.meses), 1);

  const evolucao: PontoSerie[] = [{ x: 0, y: p.aporteInicial }];
  let montante = p.aporteInicial;
  for (let mes = 1; mes <= n; mes++) {
    // Rende sobre o saldo do mês anterior e recebe o aporte no fim do mês.
    montante = montante * (1 + i) + p.aporteMensal;
    evolucao.push({ x: mes, y: montante });
  }

  const totalInvestido = p.aporteInicial + p.aporteMensal * n;
  const rendimento = montante - totalInvestido;
  const rendimentoPct = totalInvestido > 0 ? (rendimento / totalInvestido) * 100 : 0;

  return {
    montanteFinal: montante,
    totalInvestido,
    rendimento,
    rendimentoPct,
    evolucao,
  };
}

// ---------------------------------------------------------------------------
// CÂMBIO — conversão entre moedas com IOF + spread do banco
// ---------------------------------------------------------------------------

/**
 * Câmbio de compra: o usuário tem BRL e quer saber quanto de uma moeda
 * estrangeira consegue comprar com esse valor, já descontados IOF e o
 * spread que o banco/corretora adiciona sobre a cotação de mercado.
 *
 * `cotacao` é a cotação de MERCADO (BRL por 1 unidade da moeda), vinda do
 * histórico atualizado pela Frankfurter API — não é digitada pelo usuário.
 * `moedaCodigo` é só carregado junto para a simulação salva saber a moeda.
 */
export type ParametrosCambio = {
  moedaCodigo: string; // ISO 4217, ex: "USD"
  valorBrl: number; // quanto o usuário tem para gastar, em BRL
  cotacao: number; // BRL por 1 unidade da moeda estrangeira (mercado)
  iofPct: number; // ex: 3.5 para cartão, 1.1 para espécie/remessa
  spreadPct: number; // spread do banco sobre a cotação (ex: 4)
};

export type ResultadoCambio = {
  cotacaoEfetiva: number; // cotação de mercado + spread — o que você paga de fato por unidade
  valorConvertido: number; // quanto da moeda estrangeira você recebe
  custoIof: number; // em BRL
  custoSpread: number; // em BRL — o quanto o spread encareceu a compra
  custoTotal: number; // custoIof + custoSpread, em BRL
  custoTotalPct: number; // custoTotal sobre o valor em BRL, em %
};

export function simularCambio(p: ParametrosCambio): ResultadoCambio {
  const fatorSpread = p.spreadPct / 100;
  const fatorIof = p.iofPct / 100;

  // Usuário gasta `valorBrl`. O IOF incide sobre esse valor; o que sobra
  // é convertido pela cotação já encarecida pelo spread.
  const cotacaoEfetiva = p.cotacao * (1 + fatorSpread);
  const custoIof = p.valorBrl * fatorIof;
  const valorBrlLiquido = p.valorBrl - custoIof;

  const valorConvertido = cotacaoEfetiva > 0 ? valorBrlLiquido / cotacaoEfetiva : 0;

  // Quanto essa mesma quantia compraria sem o spread — a diferença (em
  // BRL) é o custo do spread.
  const semSpread = p.cotacao > 0 ? valorBrlLiquido / p.cotacao : 0;
  const custoSpread = (semSpread - valorConvertido) * p.cotacao;
  const custoTotal = custoIof + custoSpread;

  return {
    cotacaoEfetiva,
    valorConvertido,
    custoIof,
    custoSpread,
    custoTotal,
    custoTotalPct: p.valorBrl > 0 ? (custoTotal / p.valorBrl) * 100 : 0,
  };
}
