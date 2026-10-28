import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import {
  listarTransacoesFiltradas,
  listarResumoPorCategoria,
  FiltrosTransacao,
  TransacaoComBanco,
} from "@/database/queries";
import { obterCategoriaPorId } from "@/database/categorias";
import { dataHojeIso, dataIsoParaBR } from "@/utils/dateUtils";

/**
 * Exporta as transações que casam com os filtros da tela Transações —
 * para o contador, para o IR ou para abrir numa planilha.
 *
 *  - CSV: uma linha por transação, separador ";" e vírgula decimal (o
 *    que o Excel/LibreOffice em pt-BR abrem direto), com BOM UTF-8.
 *  - PDF: relatório com período, totais (sem transferências), resumo
 *    por categoria e a lista de transações.
 *
 * Os dois abrem a folha de compartilhamento do sistema (salvar em
 * arquivos, mandar por e-mail/WhatsApp...).
 */

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numeroBR = (n: number) => n.toFixed(2).replace(".", ",");

function nomeCategoria(t: Pick<TransacaoComBanco, "categoriaId" | "transferenciaId">): string {
  if (t.transferenciaId) return "Transferência entre contas";
  return obterCategoriaPorId(t.categoriaId)?.nome ?? "Sem categoria";
}

function descricaoPeriodo(filtros: FiltrosTransacao): string {
  if (filtros.dataInicio && filtros.dataFim) return `${dataIsoParaBR(filtros.dataInicio)} a ${dataIsoParaBR(filtros.dataFim)}`;
  if (filtros.dataInicio) return `desde ${dataIsoParaBR(filtros.dataInicio)}`;
  if (filtros.dataFim) return `até ${dataIsoParaBR(filtros.dataFim)}`;
  return "todo o período";
}

function nomeArquivo(extensao: string): string {
  return `unify-transacoes-${dataHojeIso()}.${extensao}`;
}

async function compartilhar(arquivoUri: string, mimeType: string, titulo: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Compartilhamento não disponível neste aparelho.");
  }
  await Sharing.shareAsync(arquivoUri, { mimeType, dialogTitle: titulo, UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text" });
}

/** Campo CSV: aspas se tiver separador, aspas ou quebra de linha. */
function celula(valor: string): string {
  return /[;"\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export async function exportarCsv(filtros: FiltrosTransacao): Promise<number> {
  const transacoes = await listarTransacoesFiltradas(filtros);
  if (transacoes.length === 0) throw new Error("Nenhuma transação com os filtros atuais.");

  const linhas = [
    ["Data", "Descrição", "Detalhe", "Categoria", "Conta", "Tipo", "Valor"].join(";"),
    ...transacoes.map((t) =>
      [
        dataIsoParaBR(t.data),
        celula(t.nome),
        celula(t.subtitulo ?? ""),
        celula(nomeCategoria(t)),
        celula(t.banco.nome),
        t.transferenciaId ? "Transferência" : t.tipo === "entrada" ? "Entrada" : "Saída",
        // Saída negativa: soma direto na planilha.
        numeroBR(t.tipo === "entrada" ? t.valor : -t.valor),
      ].join(";")
    ),
  ];

  const arquivo = new File(Paths.cache, nomeArquivo("csv"));
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  arquivo.write("﻿" + linhas.join("\r\n"));
  await compartilhar(arquivo.uri, "text/csv", "Exportar transações (CSV)");
  return transacoes.length;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function exportarPdf(filtros: FiltrosTransacao, nomeUsuario: string): Promise<number> {
  const transacoes = await listarTransacoesFiltradas(filtros);
  if (transacoes.length === 0) throw new Error("Nenhuma transação com os filtros atuais.");
  const porCategoria = await listarResumoPorCategoria(filtros);

  const semTransferencia = transacoes.filter((t) => !t.transferenciaId);
  const entradas = semTransferencia.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const saidas = semTransferencia.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);

  const linhasCategoria = porCategoria
    .filter((c) => c.totalSaidas > 0 || c.totalEntradas > 0)
    .map(
      (c) =>
        `<tr><td>${escaparHtml(obterCategoriaPorId(c.categoriaId)?.nome ?? "Sem categoria")}</td>` +
        `<td class="n">${c.totalEntradas ? moeda(c.totalEntradas) : "—"}</td>` +
        `<td class="n">${c.totalSaidas ? moeda(c.totalSaidas) : "—"}</td><td class="n">${c.quantidade}</td></tr>`
    )
    .join("");

  const linhasTransacao = transacoes
    .map(
      (t) =>
        `<tr><td>${dataIsoParaBR(t.data)}</td><td>${escaparHtml(t.nome)}</td>` +
        `<td>${escaparHtml(nomeCategoria(t))}</td><td>${escaparHtml(t.banco.nome)}</td>` +
        `<td class="n ${t.tipo === "entrada" ? "e" : "s"}">${t.tipo === "entrada" ? "" : "−"}${moeda(t.valor)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1a1f29; margin: 28px; font-size: 11px; }
  h1 { font-size: 20px; margin: 0 0 2px; color: #5b2bbf; }
  .sub { color: #6b778c; margin-bottom: 18px; }
  .tot { display: flex; gap: 12px; margin-bottom: 18px; }
  .tot div { flex: 1; border: 1px solid #e3e7ee; border-radius: 8px; padding: 10px; }
  .tot b { display: block; font-size: 15px; margin-top: 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #eef1f5; }
  th { background: #f4f6f9; font-weight: 600; }
  .n { text-align: right; white-space: nowrap; }
  .e { color: #10894f; } .s { color: #c0392b; }
  .rod { margin-top: 18px; color: #8a94a3; font-size: 9px; }
</style></head><body>
  <h1>Unify — Relatório de transações</h1>
  <div class="sub">${escaparHtml(nomeUsuario)} · ${descricaoPeriodo(filtros)} · ${transacoes.length} transações</div>
  <div class="tot">
    <div>Entradas<b class="e">${moeda(entradas)}</b></div>
    <div>Saídas<b class="s">${moeda(saidas)}</b></div>
    <div>Saldo<b>${moeda(entradas - saidas)}</b></div>
  </div>
  <h2>Por categoria</h2>
  <table><tr><th>Categoria</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Qtd.</th></tr>${linhasCategoria}</table>
  <h2>Transações</h2>
  <table><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th class="n">Valor</th></tr>${linhasTransacao}</table>
  <div class="rod">Gerado pelo Unify em ${dataIsoParaBR(dataHojeIso())}. Transferências entre contas aparecem na lista, mas não entram nos totais.</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  // Renomeia para um nome legível (o expo-print gera um nome aleatório).
  const destino = new File(Paths.cache, nomeArquivo("pdf"));
  if (destino.exists) destino.delete();
  await new File(uri).move(destino);
  await compartilhar(destino.uri, "application/pdf", "Exportar transações (PDF)");
  return transacoes.length;
}
