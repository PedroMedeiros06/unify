import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoriaId } from "@/database/categorias";
import { FiltrosTransacao, listarTransacoesFiltradas } from "@/database/queries";
import { dataHojeIso } from "@/utils/dateUtils";

export type PeriodoPreset = "hoje" | "7dias" | "esteMes" | "personalizado" | "tudo";

// Ordem da cascata de período: começa no recorte mais estreito e vai
// abrindo até achar um intervalo com pelo menos uma transação; se
// nenhum tiver, para em "tudo". Usada pelas telas que passam
// `cascata: true` ao hook.
const CASCATA_PRESETS: PeriodoPreset[] = ["hoje", "7dias", "esteMes", "tudo"];

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
  // Preset com que o filtro nasce. Default: "esteMes". Ignorado quando
  // `cascata` é true (nesse caso nasce em "hoje" e a cascata decide).
  presetInicial?: PeriodoPreset;
  // Quando true: no primeiro mount, testa hoje → 7dias → esteMes → tudo
  // e fixa o primeiro período que tem transação (respeitando os
  // bancos/categorias já selecionados). Depois disso o usuário controla
  // o período na mão até sair da tela. Só o eixo de PERÍODO é
  // cascateado — banco e categoria não.
  cascata?: boolean;
};

export function useFiltrosTransacao(opcoes: OpcoesHook = {}) {
  const presetInicial = opcoes.cascata ? "hoje" : opcoes.presetInicial ?? PRESET_PADRAO;
  const [filtros, setFiltros] = useState<EstadoFiltros>(() => montarEstadoInicial(presetInicial));

  // Preset considerado NEUTRO para esta instância — ou seja, o ponto de
  // partida que NÃO conta como "filtro ativo" e para o qual "Limpar
  // tudo" volta. Sem cascata é sempre PRESET_PADRAO. Com cascata, é o
  // preset que a cascata fixou no mount (ex: se a tela só tinha
  // transação em "tudo", "tudo" passa a ser o neutro dela — trocar de
  // volta pra "esteMes" aí SIM é o usuário filtrando).
  const [presetNeutro, setPresetNeutro] = useState<PeriodoPreset>(presetInicial);

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

  // Cascata de período (só quando opcoes.cascata): roda uma única vez
  // no mount. Percorre CASCATA_PRESETS e fixa o primeiro que retorna ao
  // menos uma transação (considerando banco/categoria já filtrados, que
  // normalmente estão vazios no mount). Se nenhum tiver, fixa "tudo".
  const cascataResolvidaRef = useRef(false);
  useEffect(() => {
    if (!opcoes.cascata || cascataResolvidaRef.current) return;
    cascataResolvidaRef.current = true;

    let ativo = true;

    async function resolverCascata() {
      for (const preset of CASCATA_PRESETS) {
        const { inicio, fim } = resolverIntervaloPeriodo(preset);
        const linhas = await listarTransacoesFiltradas(
          {
            bancosIds: filtros.bancosSelecionados.length > 0 ? filtros.bancosSelecionados : null,
            categoriasIds:
              filtros.categoriasSelecionadas.length > 0 ? filtros.categoriasSelecionadas : null,
            dataInicio: inicio,
            dataFim: fim,
          },
          1
        );
        if (!ativo) return;
        if (linhas.length > 0) {
          // Esse preset passa a ser o neutro da tela — não conta como
          // "filtro ativo". "hoje" já é o inicial; só troca se parou
          // em outro ponto.
          setPresetNeutro(preset);
          if (preset !== "hoje") definirPeriodoPreset(preset);
          return;
        }
      }
      if (ativo) {
        setPresetNeutro("tudo");
        definirPeriodoPreset("tudo");
      }
    }

    resolverCascata();

    return () => {
      ativo = false;
    };
    // Sem deps de propósito: cascata é decisão de mount único.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Volta ao neutro DESTA instância (o que a cascata fixou, ou
    // PRESET_PADRAO sem cascata) — não força "esteMes" numa tela cujo
    // neutro é "tudo".
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
  // período diferente do neutro desta instância. É isto que liga o
  // botão "Limpar tudo". O neutro pós-cascata NÃO conta.
  const possuiFiltrosAtivos =
    filtros.bancosSelecionados.length > 0 ||
    filtros.categoriasSelecionadas.length > 0 ||
    filtros.periodoPreset !== presetNeutro;

  // "A consulta precisa de recorte?" — tem banco/categoria, OU o
  // período não é "tudo" (traz tudo). Diferente de possuiFiltrosAtivos:
  // aqui um período restrito escolhido PELA CASCATA (ex: "7dias") ainda
  // conta, porque a lista tem que respeitar essa janela mesmo sem o
  // usuário ter tocado em nada. Telas que trocam "lista completa do
  // contexto" por "query filtrada" devem usar este flag.
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
