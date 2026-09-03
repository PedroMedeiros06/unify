import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SimulacaoSalva } from "@/database/simulacoesQueries";
import { FormatToCurrency } from "@/utils/formatNumber";

/**
 * Exporta uma simulação salva como PDF de 1 página e abre a folha de
 * compartilhamento do sistema. O PDF é gerado a partir de um HTML
 * montado aqui (expo-print) — não é captura de tela, então independe
 * do layout atual do app.
 */

type Linha = { rotulo: string; valor: string; forte?: boolean };

// Número-chave que ganha o cartão de destaque no topo do documento,
// mais o rótulo que o descreve. É o dado que a pessoa normalmente quer
// olhar primeiro em cada tipo de simulação.
type Destaque = { rotulo: string; valor: string; nota?: string };

const NOMES_TIPO: Record<SimulacaoSalva["tipo"], string> = {
  financiamento: "Financiamento",
  emprestimo: "Empréstimo",
  investimento: "Investimento",
  cambio: "Câmbio",
};

function pct(n: number, casas = 1): string {
  return `${n.toFixed(casas)}%`;
}

function moeda(n: number): string {
  return FormatToCurrency(n);
}

/** Destaque + blocos de "parâmetros" e "resultado" para cada tipo. */
function blocosDaSimulacao(s: SimulacaoSalva): {
  destaque: Destaque;
  parametros: Linha[];
  resultado: Linha[];
} {
  if (s.tipo === "financiamento") {
    return {
      destaque: {
        rotulo: "Parcela mensal",
        valor: moeda(s.resultado.parcelaMensal),
        nota: `${s.parametros.prazoMeses} parcelas · ${s.parametros.taxaAnualPct}% a.a.`,
      },
      parametros: [
        { rotulo: "Valor do bem", valor: moeda(s.parametros.valorBem) },
        { rotulo: "Entrada", valor: moeda(s.parametros.entrada) },
        { rotulo: "Prazo", valor: `${s.parametros.prazoMeses} meses` },
        { rotulo: "Taxa de juros", valor: `${s.parametros.taxaAnualPct}% a.a.` },
      ],
      resultado: [
        { rotulo: "Valor financiado", valor: moeda(s.resultado.valorFinanciado) },
        { rotulo: "Parcela mensal", valor: moeda(s.resultado.parcelaMensal) },
        { rotulo: "Total pago", valor: moeda(s.resultado.totalPago) },
        { rotulo: "Juros pagos", valor: moeda(s.resultado.jurosPagos) },
        { rotulo: "Custo efetivo total", valor: pct(s.resultado.custoEfetivoTotalPct), forte: true },
      ],
    };
  }

  if (s.tipo === "emprestimo") {
    return {
      destaque: {
        rotulo: "Parcela mensal",
        valor: moeda(s.resultado.parcelaMensal),
        nota: `${s.parametros.prazoMeses} parcelas · ${s.parametros.taxaAnualPct}% a.a.`,
      },
      parametros: [
        { rotulo: "Valor do empréstimo", valor: moeda(s.parametros.valorSolicitado) },
        { rotulo: "Prazo", valor: `${s.parametros.prazoMeses} meses` },
        { rotulo: "Taxa de juros", valor: `${s.parametros.taxaAnualPct}% a.a.` },
      ],
      resultado: [
        { rotulo: "Parcela mensal", valor: moeda(s.resultado.parcelaMensal) },
        { rotulo: "Total pago", valor: moeda(s.resultado.totalPago) },
        { rotulo: "Juros pagos", valor: moeda(s.resultado.jurosPagos) },
        { rotulo: "Custo efetivo total", valor: pct(s.resultado.custoEfetivoTotalPct), forte: true },
      ],
    };
  }

  if (s.tipo === "investimento") {
    return {
      destaque: {
        rotulo: "Montante final",
        valor: moeda(s.resultado.montanteFinal),
        nota: `em ${s.parametros.meses} meses · ${s.parametros.taxaAnualPct}% a.a.`,
      },
      parametros: [
        { rotulo: "Aporte inicial", valor: moeda(s.parametros.aporteInicial) },
        { rotulo: "Aporte mensal", valor: moeda(s.parametros.aporteMensal) },
        { rotulo: "Período", valor: `${s.parametros.meses} meses` },
        { rotulo: "Rentabilidade", valor: `${s.parametros.taxaAnualPct}% a.a.` },
      ],
      resultado: [
        { rotulo: "Montante final", valor: moeda(s.resultado.montanteFinal) },
        { rotulo: "Total investido", valor: moeda(s.resultado.totalInvestido) },
        { rotulo: "Rendimento", valor: moeda(s.resultado.rendimento) },
        { rotulo: "Rendimento (%)", valor: pct(s.resultado.rendimentoPct), forte: true },
      ],
    };
  }

  // câmbio
  return {
    destaque: {
      rotulo: `Você recebe`,
      valor: `${s.resultado.valorConvertido.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${s.parametros.moedaCodigo}`,
      nota: `câmbio efetivo ${moeda(s.resultado.cotacaoEfetiva)}`,
    },
    parametros: [
      { rotulo: "Moeda", valor: s.parametros.moedaCodigo },
      { rotulo: "Valor em reais", valor: moeda(s.parametros.valorBrl) },
      { rotulo: "Cotação de mercado", valor: moeda(s.parametros.cotacao) },
      { rotulo: "IOF", valor: pct(s.parametros.iofPct) },
      { rotulo: "Spread do banco", valor: pct(s.parametros.spreadPct) },
    ],
    resultado: [
      {
        rotulo: `Você recebe (${s.parametros.moedaCodigo})`,
        valor: s.resultado.valorConvertido.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
      },
      { rotulo: "Cotação efetiva", valor: moeda(s.resultado.cotacaoEfetiva) },
      { rotulo: "Custo de IOF", valor: moeda(s.resultado.custoIof) },
      { rotulo: "Custo de spread", valor: moeda(s.resultado.custoSpread) },
      {
        rotulo: "Custo total",
        valor: `${moeda(s.resultado.custoTotal)} (${pct(s.resultado.custoTotalPct)})`,
        forte: true,
      },
    ],
  };
}

function linhasHtml(linhas: Linha[]): string {
  return linhas
    .map(
      (l) => `
      <tr${l.forte ? ' class="forte"' : ""}>
        <td class="rotulo">${escaparHtml(l.rotulo)}</td>
        <td class="valor">${escaparHtml(l.valor)}</td>
      </tr>`
    )
    .join("");
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function montarHtml(s: SimulacaoSalva): string {
  const { destaque, parametros, resultado } = blocosDaSimulacao(s);
  const dataFormatada = new Date(s.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --tinta: #141821;
    --rotulo: #5B6675;
    --hairline: #E4E7EC;
    --roxo: #8D51E6;
    --roxo-fundo: #F7F3FE;
    --roxo-borda: #E3D4F8;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--tinta);
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .folha { padding: 44px 46px 40px; max-width: 720px; margin: 0 auto; }

  /* Cabeçalho */
  .eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--roxo);
    display: flex; align-items: center; gap: 8px;
  }
  .eyebrow::before {
    content: ""; width: 22px; height: 2px; background: var(--roxo);
    display: inline-block;
  }
  h1 {
    font-size: 25px; font-weight: 700; letter-spacing: -0.4px;
    margin: 12px 0 3px; text-wrap: balance;
  }
  .subtitulo { font-size: 12px; color: var(--rotulo); }

  /* Cartão de destaque */
  .destaque {
    margin: 26px 0 8px; padding: 16px 20px;
    background: var(--roxo-fundo); border: 1px solid var(--roxo-borda);
    border-radius: 10px;
  }
  .destaque .rot {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--rotulo);
  }
  .destaque .val {
    font-size: 28px; font-weight: 700; color: var(--roxo);
    letter-spacing: -0.5px; margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .destaque .nota { font-size: 11px; color: var(--rotulo); margin-top: 2px; }

  /* Seções */
  h2 {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1.8px; color: var(--rotulo);
    margin: 30px 0 4px; padding-bottom: 7px;
    border-bottom: 1px solid var(--hairline);
  }
  table { width: 100%; border-collapse: collapse; }
  td {
    padding: 8px 0; font-size: 13px;
    border-bottom: 1px solid var(--hairline);
  }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #FAFAFB; }
  td.rotulo { color: var(--rotulo); padding-left: 4px; }
  td.valor {
    text-align: right; font-weight: 600; padding-right: 4px;
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  tr.forte td { padding-top: 11px; padding-bottom: 11px; }
  tr.forte td.rotulo { color: var(--tinta); font-weight: 600; }
  tr.forte td.valor { color: var(--roxo); font-size: 15px; }

  /* Rodapé */
  .rodape {
    margin-top: 34px; padding-top: 12px;
    border-top: 1px solid var(--hairline);
    font-size: 10px; color: #9AA3AF; line-height: 1.6;
  }
  .rodape strong { color: var(--rotulo); font-weight: 600; }
</style>
</head>
<body>
  <div class="folha">
    <div class="eyebrow">Unify · Simulação</div>
    <h1>${escaparHtml(s.titulo)}</h1>
    <div class="subtitulo">${escaparHtml(NOMES_TIPO[s.tipo])} · gerada em ${dataFormatada}</div>

    <div class="destaque">
      <div class="rot">${escaparHtml(destaque.rotulo)}</div>
      <div class="val">${escaparHtml(destaque.valor)}</div>
      ${destaque.nota ? `<div class="nota">${escaparHtml(destaque.nota)}</div>` : ""}
    </div>

    <h2>Parâmetros informados</h2>
    <table>${linhasHtml(parametros)}</table>

    <h2>Resultado</h2>
    <table>${linhasHtml(resultado)}</table>

    <div class="rodape">
      <strong>Estimativa.</strong> Os valores usam juros compostos e as taxas informadas na
      simulação; as condições reais de crédito, tributos e mercado podem diferir.
      Documento gerado pelo aplicativo Unify.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Gera o PDF e abre o compartilhamento. Retorna false (sem lançar) se
 * o compartilhamento não estiver disponível no dispositivo.
 */
export async function compartilharSimulacaoPdf(s: SimulacaoSalva): Promise<boolean> {
  const html = montarHtml(s);
  const { uri } = await Print.printToFileAsync({ html });

  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `Compartilhar "${s.titulo}"`,
    UTI: "com.adobe.pdf",
  });
  return true;
}
