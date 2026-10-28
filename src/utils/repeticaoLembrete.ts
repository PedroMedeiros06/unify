/**
 * Datas de lembretes que se repetem (migration 23).
 *
 * Num lembrete repetido, `lembretes.data` é sempre a PRÓXIMA ocorrência
 * (a que ainda vai disparar). Quando ela passa, o LembretesContext
 * avança `data` para a seguinte e reagenda. `dia_base` guarda o dia do
 * mês escolhido na criação — sem ele, um lembrete mensal do dia 31
 * cairia para 30 em abril e ficaria preso no 30 dali em diante.
 */

export type RepeticaoLembrete = "nenhuma" | "semanal" | "mensal" | "anual";

export const ROTULO_REPETICAO: Record<RepeticaoLembrete, string> = {
  nenhuma: "Não repete",
  semanal: "Toda semana",
  mensal: "Todo mês",
  anual: "Todo ano",
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dia `dia` do mês (ano, mes0), limitado ao último dia do mês. */
function diaNoMes(ano: number, mes0: number, dia: number): Date {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  return new Date(ano, mes0, Math.min(dia, ultimo));
}

/** Ocorrência seguinte a `dataIso` (null se não repete). */
export function proximaData(dataIso: string, repeticao: RepeticaoLembrete, diaBase: number | null): string | null {
  const [a, m, d] = dataIso.split("-").map(Number);
  const dia = diaBase ?? d;
  switch (repeticao) {
    case "semanal":
      return iso(new Date(a, m - 1, d + 7));
    case "mensal":
      return iso(diaNoMes(a, m, dia));
    case "anual":
      return iso(diaNoMes(a + 1, m - 1, dia));
    default:
      return null;
  }
}

/**
 * Avança `dataIso` até a primeira ocorrência cujo horário ainda não
 * passou (agora local). Se a data já está no futuro, devolve ela mesma.
 * Para "nenhuma", também devolve a mesma data (mesmo no passado).
 */
export function primeiraOcorrenciaFutura(
  dataIso: string,
  horaHHMM: string,
  repeticao: RepeticaoLembrete,
  diaBase: number | null,
  agora: Date = new Date()
): string {
  if (repeticao === "nenhuma") return dataIso;
  const agoraTexto = `${iso(agora)}T${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  let atual = dataIso;
  // Limite de segurança: 10 anos de semanas.
  for (let i = 0; i < 600 && `${atual}T${horaHHMM}` <= agoraTexto; i++) {
    const prox = proximaData(atual, repeticao, diaBase);
    if (!prox) break;
    atual = prox;
  }
  return atual;
}

/** As próximas `n` ocorrências a partir de `dataIso` (inclusive). */
export function proximasOcorrencias(
  dataIso: string,
  repeticao: RepeticaoLembrete,
  diaBase: number | null,
  n: number
): string[] {
  const datas = [dataIso];
  while (repeticao !== "nenhuma" && datas.length < n) {
    const prox = proximaData(datas[datas.length - 1], repeticao, diaBase);
    if (!prox) break;
    datas.push(prox);
  }
  return datas;
}

/** Ocorrências dentro de [inicioIso, fimIso], começando em `dataIso` (a próxima). */
export function ocorrenciasNoPeriodo(
  dataIso: string,
  repeticao: RepeticaoLembrete,
  diaBase: number | null,
  inicioIso: string,
  fimIso: string
): string[] {
  const datas: string[] = [];
  let atual: string | null = dataIso;
  for (let i = 0; atual && atual <= fimIso && i < 600; i++) {
    if (atual >= inicioIso) datas.push(atual);
    if (repeticao === "nenhuma") break;
    atual = proximaData(atual, repeticao, diaBase);
  }
  return datas;
}
