import { Recorrencia } from "./recorrenciasQueries";

/**
 * Resolução de datas de recorrência — módulo PURO (só usa `Date` local,
 * sem timezone/UTC, igual ao resto do app). Nenhum acesso a banco.
 *
 * Regras (ver TipoVencimento em recorrenciasQueries.ts):
 *  - 'dia_fixo'        dia corrido 1..31; se o mês não tiver esse dia,
 *                      usa o último dia do mês. NÃO move quando cai no
 *                      fim de semana.
 *  - 'dia_util'        k-ésimo dia útil (segunda a sexta). Se k for
 *                      maior que a quantidade de dias úteis do mês,
 *                      usa o último dia útil.
 *  - 'ultimo_dia_util' último dia útil do mês.
 *
 * Feriados NÃO são considerados nesta versão — "dia útil" = qualquer
 * segunda a sexta.
 */

/** Só os campos que importam para resolver a data — evita exigir uma Recorrencia inteira nos testes. */
export type RegraVencimento = Pick<Recorrencia, "tipoVencimento" | "diaVencimento">;

const DIAS_SEMANA_UTEIS = new Set([1, 2, 3, 4, 5]); // getDay(): 0=domingo ... 6=sábado

function paraIso(ano: number, mes0a11: number, dia: number): string {
  const mes = String(mes0a11 + 1).padStart(2, "0");
  const diaStr = String(dia).padStart(2, "0");
  return `${ano}-${mes}-${diaStr}`;
}

/** Último dia (28-31) do mês dado. `mes0a11` no padrão de Date (0 = janeiro). */
export function ultimoDiaDoMes(ano: number, mes0a11: number): number {
  return new Date(ano, mes0a11 + 1, 0).getDate();
}

/** true se `dia` (1..ultimoDia) do mês dado cai numa segunda a sexta. */
export function ehDiaUtil(ano: number, mes0a11: number, dia: number): boolean {
  return DIAS_SEMANA_UTEIS.has(new Date(ano, mes0a11, dia).getDay());
}

/** Dia (1..ultimoDia) do último dia útil do mês. */
export function diaDoUltimoDiaUtil(ano: number, mes0a11: number): number {
  for (let dia = ultimoDiaDoMes(ano, mes0a11); dia >= 1; dia--) {
    if (ehDiaUtil(ano, mes0a11, dia)) return dia;
  }
  // Mês sem nenhum dia útil não existe no calendário gregoriano — mas o
  // fallback evita retornar undefined caso algo muito estranho aconteça.
  return 1;
}

/**
 * Dia (1..ultimoDia) do k-ésimo dia útil do mês. Se `k` passar da
 * quantidade de dias úteis do mês, cai no último dia útil.
 */
export function diaDoKesimoDiaUtil(ano: number, mes0a11: number, k: number): number {
  const alvo = Math.max(1, Math.floor(k));
  let contador = 0;
  const total = ultimoDiaDoMes(ano, mes0a11);
  for (let dia = 1; dia <= total; dia++) {
    if (ehDiaUtil(ano, mes0a11, dia)) {
      contador++;
      if (contador === alvo) return dia;
    }
  }
  return diaDoUltimoDiaUtil(ano, mes0a11);
}

/**
 * Data (ISO "aaaa-mm-dd") em que a recorrência vence no mês dado.
 * `mes0a11` no padrão de Date. Esta é a data que a ocorrência prevista
 * guarda como snapshot (ver etapa 4).
 */
export function resolverDataNoMes(regra: RegraVencimento, ano: number, mes0a11: number): string {
  const ultimoDia = ultimoDiaDoMes(ano, mes0a11);

  let dia: number;
  switch (regra.tipoVencimento) {
    case "dia_fixo": {
      const alvo = regra.diaVencimento ?? 1;
      dia = Math.min(Math.max(1, alvo), ultimoDia);
      break;
    }
    case "dia_util": {
      dia = diaDoKesimoDiaUtil(ano, mes0a11, regra.diaVencimento ?? 1);
      break;
    }
    case "ultimo_dia_util": {
      dia = diaDoUltimoDiaUtil(ano, mes0a11);
      break;
    }
    default: {
      // Exaustividade: se um TipoVencimento novo entrar sem tratamento aqui,
      // o TypeScript acusa em build.
      const _exhaustivo: never = regra.tipoVencimento;
      throw new Error(`tipoVencimento não suportado: ${String(_exhaustivo)}`);
    }
  }

  return paraIso(ano, mes0a11, dia);
}

/** "aaaa-mm" -> { inicioIso, fimIso } (primeiro e último dia do mês). */
export function intervaloDoMes(mesAno: string): { inicioIso: string; fimIso: string } {
  const [ano, mes1a12] = mesAno.split("-").map(Number);
  const mes0a11 = (mes1a12 ?? 1) - 1;
  return {
    inicioIso: paraIso(ano, mes0a11, 1),
    fimIso: paraIso(ano, mes0a11, ultimoDiaDoMes(ano, mes0a11)),
  };
}

/** Só os campos de vigência — mesma ideia de RegraVencimento. */
export type VigenciaRecorrencia = Pick<Recorrencia, "dataInicio" | "dataFim" | "ativa">;

/**
 * true se a recorrência está ATIVA e sua vigência (dataInicio..dataFim)
 * intersecta o mês "aaaa-mm". Comparação por string ISO (ordena
 * corretamente sem parsing).
 */
export function recorrenciaAtivaNoMes(regra: VigenciaRecorrencia, mesAno: string): boolean {
  if (!regra.ativa) return false;
  const { inicioIso, fimIso } = intervaloDoMes(mesAno);
  const comecouAteOFimDoMes = regra.dataInicio <= fimIso;
  const naoTerminouAntesDoMes = regra.dataFim == null || regra.dataFim >= inicioIso;
  return comecouAteOFimDoMes && naoTerminouAntesDoMes;
}

/** Texto curto da regra para a UI: "Todo dia 10" / "5º dia útil" / "Último dia útil". */
export function formatarRegraVencimento(regra: RegraVencimento): string {
  switch (regra.tipoVencimento) {
    case "dia_fixo":
      return `Todo dia ${regra.diaVencimento ?? 1}`;
    case "dia_util":
      return `${regra.diaVencimento ?? 1}º dia útil`;
    case "ultimo_dia_util":
      return "Último dia útil";
    default:
      return "";
  }
}

/**
 * Próxima data de vencimento da recorrência a partir de `dataRefIso`
 * (inclusive), respeitando dataInicio/dataFim. Retorna null se a
 * recorrência já terminou. Usado no preview do modal de edição.
 */
export function proximaDataVencimento(
  regra: RegraVencimento & VigenciaRecorrencia,
  dataRefIso: string
): string | null {
  const [refAno, refMes1] = dataRefIso.split("-").map(Number);
  let ano = refAno;
  let mes0a11 = (refMes1 ?? 1) - 1;

  // Limite de segurança: no máximo 24 meses à frente.
  for (let i = 0; i < 24; i++) {
    const dataMes = resolverDataNoMes(regra, ano, mes0a11);

    const dentroDaVigencia =
      dataMes >= regra.dataInicio && (regra.dataFim == null || dataMes <= regra.dataFim);
    const noFuturoOuHoje = dataMes >= dataRefIso;

    if (dentroDaVigencia && noFuturoOuHoje) return dataMes;

    // Passou da dataFim: não há próxima.
    if (regra.dataFim != null && dataMes > regra.dataFim) return null;

    mes0a11++;
    if (mes0a11 > 11) {
      mes0a11 = 0;
      ano++;
    }
  }

  return null;
}
