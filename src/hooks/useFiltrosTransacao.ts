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

const ESTADO_INICIAL: EstadoFiltros = {
  bancosSelecionados: [],
  categoriasSelecionadas: [],
  periodoPreset: "tudo",
  periodoInicioPersonalizado: null,
  periodoFimPersonalizado: null,
};

/**
 * Resolve um PeriodoPreset para um intervalo [inicio, fim] em ISO
 * (aaaa-mm-dd), ambos inclusive. Retorna null nos dois campos quando
 * o preset é "tudo" (sem filtro de data nenhum).
 */
function resolverIntervaloPeriodo(
  preset: PeriodoPreset,
  inicioPersonalizado: string | null,
  fimPersonalizado: string | null
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
export function useFiltrosTransacao() {
  const [filtros, setFiltros] = useState<EstadoFiltros>(ESTADO_INICIAL);

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
    setFiltros(ESTADO_INICIAL);
  }, []);

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

  const possuiFiltrosAtivos =
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
    filtrosParaQuery,
  };
}
