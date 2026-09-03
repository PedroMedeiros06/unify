import { useCallback, useMemo, useState } from "react";
import { CategoriaId } from "@/database/categorias";
import { FiltrosTransacao } from "@/database/queries";
import { dataHojeIso } from "@/utils/dateUtils";

export type PeriodoPreset = "hoje" | "7dias" | "esteMes" | "personalizado" | "tudo";

export type EstadoFiltros = {
  bancosSelecionados: string[]; // [] = todos os bancos
  categoriasSelecionadas: (CategoriaId | null)[]; // [] = todas as categorias; inclui null = "sem categoria"
  periodoPreset: PeriodoPreset;
  periodoInicioPersonalizado: string | null; // ISO, só relevante quando periodoPreset === "personalizado"
  periodoFimPersonalizado: string | null;
};

// "esteMes" é o preset NEUTRO padrão: telas de análise e listas abrem
// já recortadas no mês corrente em vez de "tudo" (que trazia histórico
// inteiro e poluía os gráficos). Componentes que precisam de outro
// ponto de partida passam `presetInicial` para o hook.
const PRESET_PADRAO: PeriodoPreset = "esteMes";

function montarEstadoInicial(presetInicial: PeriodoPreset): EstadoFiltros {
  return {
    bancosSelecionados: [],
    categoriasSelecionadas: [],
    periodoPreset: presetInicial,
    periodoInicioPersonalizado: null,
    periodoFimPersonalizado: null,
  };
}

/**
 * Resolve um PeriodoPreset para um intervalo [inicio, fim] em ISO
 * (aaaa-mm-dd), ambos inclusive. Retorna null nos dois campos quando
 * o preset é "tudo" (sem filtro de data nenhum).
 */
export function resolverIntervaloPeriodo(
  preset: PeriodoPreset,
  inicioPersonalizado: string | null = null,
  fimPersonalizado: string | null = null
): { inicio: string | null; fim: string | null } {
  const hoje = dataHojeIso();

  switch (preset) {
    case "hoje":
      return { inicio: hoje, fim: hoje };
    case "7dias": {
      const data = new Date();
      data.setDate(data.getDate() - 6); // hoje + 6 dias atrás = 7 dias no total
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");
      return { inicio: `${ano}-${mes}-${dia}`, fim: hoje };
    }
    case "esteMes": {
      const [ano, mes] = hoje.split("-");
      return { inicio: `${ano}-${mes}-01`, fim: hoje };
    }
    case "personalizado":
      return { inicio: inicioPersonalizado, fim: fimPersonalizado };
    case "tudo":
    default:
      return { inicio: null, fim: null };
  }
}

/**
 * Hook LOCAL de filtros de transação — NÃO é um Context. Cada tela que
 * chama useFiltrosTransacao() recebe sua própria instância de estado,
 * isolada de qualquer outra tela. Isso é intencional: Home e
 * Planejamento têm gráficos com filtros independentes, sem necessidade
 * de compartilhamento de estado entre eles nesta etapa do projeto.
 *
 * Se no futuro surgir uma necessidade real de sincronizar filtros entre
 * telas, aí sim vale reavaliar promover isso a um Context — não antes.
 */
type OpcoesHook = {
  // Preset com que o filtro nasce. Default: "esteMes". Cada tela passa
  // o ponto de partida que faz sentido pra ela (a Home de transações
  // abre em "tudo", os cards de análise em "esteMes").
  presetInicial?: PeriodoPreset;
};

export function useFiltrosTransacao(opcoes: OpcoesHook = {}) {
  const presetInicial = opcoes.presetInicial ?? PRESET_PADRAO;
  const [filtros, setFiltros] = useState<EstadoFiltros>(() => montarEstadoInicial(presetInicial));

  // Preset considerado NEUTRO para esta instância — o ponto de partida
  // que NÃO conta como "filtro ativo" e para o qual "Limpar tudo"
  // volta. É sempre o presetInicial desta instância.
  const presetNeutro = presetInicial;

  const alternarBanco = useCallback((bancoId: string) => {
    setFiltros((prev) => {
      const jaSelecionado = prev.bancosSelecionados.includes(bancoId);
      return {
        ...prev,
        bancosSelecionados: jaSelecionado
          ? prev.bancosSelecionados.filter((id) => id !== bancoId)
          : [...prev.bancosSelecionados, bancoId],
      };
    });
  }, []);

  const limparFiltroBanco = useCallback(() => {
    setFiltros((prev) => ({ ...prev, bancosSelecionados: [] }));
  }, []);

  const alternarCategoria = useCallback((categoriaId: CategoriaId | null) => {
    setFiltros((prev) => {
      const jaSelecionada = prev.categoriasSelecionadas.includes(categoriaId);
      return {
        ...prev,
        categoriasSelecionadas: jaSelecionada
          ? prev.categoriasSelecionadas.filter((id) => id !== categoriaId)
          : [...prev.categoriasSelecionadas, categoriaId],
      };
    });
  }, []);

  const limparFiltroCategoria = useCallback(() => {
    setFiltros((prev) => ({ ...prev, categoriasSelecionadas: [] }));
  }, []);

  const definirPeriodoPreset = useCallback((preset: PeriodoPreset) => {
    setFiltros((prev) => ({
      ...prev,
      periodoPreset: preset,
      // Sair de "personalizado" limpa o intervalo customizado, para não
      // ficar um estado antigo escondido caso o usuário volte pra ele.
      ...(preset !== "personalizado"
        ? { periodoInicioPersonalizado: null, periodoFimPersonalizado: null }
        : {}),
    }));
  }, []);

  const definirPeriodoPersonalizado = useCallback((inicioIso: string, fimIso: string) => {
    setFiltros((prev) => ({
      ...prev,
      periodoPreset: "personalizado",
      periodoInicioPersonalizado: inicioIso,
      periodoFimPersonalizado: fimIso,
    }));
  }, []);

  const limparTodosFiltros = useCallback(() => {
    // Volta ao neutro DESTA instância (o presetInicial dela) — não
    // força "esteMes" numa tela cujo ponto de partida é "tudo".
    setFiltros(montarEstadoInicial(presetNeutro));
  }, [presetNeutro]);

  const { inicio: periodoInicio, fim: periodoFim } = resolverIntervaloPeriodo(
    filtros.periodoPreset,
    filtros.periodoInicioPersonalizado,
    filtros.periodoFimPersonalizado
  );

  const filtrosParaQuery: FiltrosTransacao = useMemo(
    () => ({
      bancosIds: filtros.bancosSelecionados.length > 0 ? filtros.bancosSelecionados : null,
      categoriasIds: filtros.categoriasSelecionadas.length > 0 ? filtros.categoriasSelecionadas : null,
      dataInicio: periodoInicio,
      dataFim: periodoFim,
    }),
    [filtros.bancosSelecionados, filtros.categoriasSelecionadas, periodoInicio, periodoFim]
  );

  // "O usuário mexeu em algum filtro?" — banco/categoria escolhidos, ou
  // período diferente do ponto de partida desta instância. É isto que
  // liga o botão "Limpar tudo".
  const possuiFiltrosAtivos =
    filtros.bancosSelecionados.length > 0 ||
    filtros.categoriasSelecionadas.length > 0 ||
    filtros.periodoPreset !== presetNeutro;

  // "A consulta precisa de recorte?" — tem banco/categoria, OU o
  // período não é "tudo". Diferente de possuiFiltrosAtivos: uma tela
  // que abre já em "esteMes" (sem o usuário tocar em nada) ainda
  // precisa filtrar a lista por essa janela. Telas que trocam "lista
  // completa do contexto" por "query filtrada" usam este flag.
  const consultaTemRecorte =
    filtros.bancosSelecionados.length > 0 ||
    filtros.categoriasSelecionadas.length > 0 ||
    filtros.periodoPreset !== "tudo";

  return {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    limparTodosFiltros,
    possuiFiltrosAtivos,
    consultaTemRecorte,
    filtrosParaQuery,
  };
}
