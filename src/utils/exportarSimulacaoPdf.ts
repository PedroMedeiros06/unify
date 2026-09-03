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

type Linha = { rotulo: string; valor: string };

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

/** Blocos de "parâmetros informados" e "resultado" para cada tipo. */
function blocosDaSimulacao(s: SimulacaoSalva): { parametros: Linha[]; resultado: Linha[] } {
  if (s.tipo === "financiamento") {
    return {
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
        { rotulo: "Custo efetivo total", valor: pct(s.resultado.custoEfetivoTotalPct) },
      ],
    };
  }

  if (s.tipo === "emprestimo") {
    return {
      parametros: [
        { rotulo: "Valor do empréstimo", valor: moeda(s.parametros.valorSolicitado) },
        { rotulo: "Prazo", valor: `${s.parametros.prazoMeses} meses` },
        { rotulo: "Taxa de juros", valor: `${s.parametros.taxaAnualPct}% a.a.` },
      ],
      resultado: [
        { rotulo: "Parcela mensal", valor: moeda(s.resultado.parcelaMensal) },
        { rotulo: "Total pago", valor: moeda(s.resultado.totalPago) },
        { rotulo: "Juros pagos", valor: moeda(s.resultado.jurosPagos) },
        { rotulo: "Custo efetivo total", valor: pct(s.resultado.custoEfetivoTotalPct) },
      ],
    };
  }

  if (s.tipo === "investimento") {
    return {
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
        { rotulo: "Rendimento (%)", valor: pct(s.resultado.rendimentoPct) },
      ],
    };
  }

  // câmbio
  return {
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
      { rotulo: "Custo total", valor: `${moeda(s.resultado.custoTotal)} (${pct(s.resultado.custoTotalPct)})` },
    ],
  };
}

function linhasHtml(linhas: Linha[]): string {
  return linhas
    .map(
      (l) => `
      <tr>
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
  const { parametros, resultado } = blocosDaSimulacao(s);
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
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1B1B2F;
    margin: 0;
    padding: 40px;
  }
  .marca { font-size: 13px; letter-spacing: 2px; color: #6C5CE7; font-weight: 700; text-transform: uppercase; }
  h1 { font-size: 24px; margin: 6px 0 2px; }
  .subtitulo { font-size: 13px; color: #6b7280; margin-bottom: 28px; }
  h2 {
    font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
    color: #6b7280; margin: 24px 0 8px;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 0; border-bottom: 1px solid #ececf2; font-size: 14px; }
  td.rotulo { color: #4b5563; }
  td.valor { text-align: right; font-weight: 600; }
  .destaque td { border-bottom: none; }
  .destaque td.valor { color: #6C5CE7; font-size: 18px; }
  .rodape { margin-top: 40px; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
  <div class="marca">Unify</div>
  <h1>${escaparHtml(s.titulo)}</h1>
  <div class="subtitulo">Simulação de ${NOMES_TIPO[s.tipo].toLowerCase()} · gerada em ${dataFormatada}</div>

  <h2>Parâmetros informados</h2>
  <table>${linhasHtml(parametros)}</table>

  <h2>Resultado</h2>
  <table>${linhasHtml(resultado)}</table>

  <div class="rodape">
    Os valores são estimativas e podem variar de acordo com as condições reais de mercado.
    Documento gerado pelo aplicativo Unify.
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
