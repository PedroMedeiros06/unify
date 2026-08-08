/**
 * Todo o app guarda datas internamente em formato ISO ("aaaa-mm-dd"),
 * porque isso ordena e compara corretamente como texto puro, sem
 * precisar de parsing. A conversão para "dd/mm/aaaa" (como o usuário
 * brasileiro espera ver) acontece só na hora de exibir na tela.
 */

/** "aaaa-mm-dd" → "dd/mm/aaaa" */
export function dataIsoParaBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  if (!ano || !mes || !dia) return dataIso; // fallback defensivo se vier em formato inesperado
  return `${dia}/${mes}/${ano}`;
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" */
export function dataBRParaIso(dataBR: string): string {
  const match = dataBR.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return dataBR; // fallback defensivo
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje já em formato ISO, pronta para salvar no banco */
export function dataHojeIso(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
