import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useEffect, useMemo, useState } from "react";
import { EvolucaoMensal } from "@/components/HomeComp/EvolucaoMensal";
import { ResumoMetrics, MetricasResumo } from "@/components/HomeComp/ResumoMetrics";
import {
  listarResumoPorCategoria,
  listarEvolucaoMensal,
  calcularResumoReceitasDespesas,
  FiltrosTransacao,
} from "@/database/queries";
import { obterMetaDeMaiorProgresso } from "@/database/metasQueries";
import { obterCategoriaPorId } from "@/database/categorias";

type Props = {
  filtrosParaQuery: FiltrosTransacao;
};

type FatiaExibicao = { nome: string; cor: string; valor: number; percentual: number };

const RADIUS = 42;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEWBOX_SIZE = 100;
const DONUT_SIZE = 120;

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
}

function useFatiasComOffset(fatias: FatiaExibicao[]) {
  return useMemo(() => {
    let offsetAcumulado = 0;
    return fatias.map((fatia) => {
      const dash = (fatia.percentual / 100) * CIRCUMFERENCE;
      const resultado = { ...fatia, dashArray: `${dash} ${CIRCUMFERENCE - dash}`, dashOffset: -offsetAcumulado };
      offsetAcumulado += dash;
      return resultado;
    });
  }, [fatias]);
}

function AnaliseGraficaBase({ filtrosParaQuery }: Props) {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

  const cardTitleSize = moderateScale(18);
  const sectionTitleSize = moderateScale(13);
  const legendTextSize = moderateScale(11);
  const centerValueSize = moderateScale(13);
  const centerLabelSize = moderateScale(9);
  const actionTextSize = moderateScale(12);
  const emptyTextSize = moderateScale(12);

  const [carregandoCategoria, setCarregandoCategoria] = useState(true);
  const [fatias, setFatias] = useState<FatiaExibicao[]>([]);
  const [totalGastos, setTotalGastos] = useState(0);

  const [evolucao, setEvolucao] = useState<{ mes: string; valor: number }[]>([]);
  const [metricas, setMetricas] = useState<MetricasResumo | null>(null);

  // Donut de categoria — respeita os filtros da BarraFiltros da tela
  // (banco/período/categoria), igual já estava.
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregandoCategoria(true);
      try {
        const resumo = await listarResumoPorCategoria(filtrosParaQuery);
        const comSaida = resumo.filter((r) => r.totalSaidas > 0);
        const totalGeral = comSaida.reduce((acc, r) => acc + r.totalSaidas, 0);

        const fatiasCalculadas: FatiaExibicao[] = comSaida.map((r) => {
          const categoria = obterCategoriaPorId(r.categoriaId);
          return {
            nome: categoria?.nome ?? "Sem categoria",
            cor: categoria?.cor ?? colors["desactived-text"],
            valor: r.totalSaidas,
            percentual: totalGeral > 0 ? (r.totalSaidas / totalGeral) * 100 : 0,
          };
        });

        fatiasCalculadas.sort((a, b) => b.valor - a.valor);

        if (ativo) {
          setFatias(fatiasCalculadas);
          setTotalGastos(totalGeral);
        }
      } finally {
        if (ativo) setCarregandoCategoria(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [filtrosParaQuery]);

  // Evolução mensal e métricas (receitas/despesas/economia/meta) NÃO
  // respeitam a BarraFiltros — são sempre "visão geral", igual ao Resumo
  // consolidado do topo da Home. Filtrar isso junto misturaria duas
  // semânticas diferentes (análise por categoria filtrada vs panorama
  // geral do mês), o que não foi pedido.
  useEffect(() => {
    let ativo = true;

    async function carregarPanoramaGeral() {
      const [pontosEvolucao, receitasDespesas, metaTop] = await Promise.all([
        listarEvolucaoMensal(6),
        calcularResumoReceitasDespesas(),
        obterMetaDeMaiorProgresso(),
      ]);

      if (!ativo) return;

      setEvolucao(pontosEvolucao.map((p) => ({ mes: p.mesLabel, valor: p.totalSaidas })));

      const economiaAtual = receitasDespesas.receitasMesAtual - receitasDespesas.despesasMesAtual;
      const economiaAnterior = receitasDespesas.receitasMesAnterior - receitasDespesas.despesasMesAnterior;

      const metaPercentual = metaTop && metaTop.valorMeta > 0
        ? Math.min(100, Math.round((metaTop.progressoAtual / metaTop.valorMeta) * 100))
        : 0;

      setMetricas({
        receitas: receitasDespesas.receitasMesAtual,
        receitasVariacao: calcularVariacao(receitasDespesas.receitasMesAtual, receitasDespesas.receitasMesAnterior),
        despesas: receitasDespesas.despesasMesAtual,
        despesasVariacao: calcularVariacao(receitasDespesas.despesasMesAtual, receitasDespesas.despesasMesAnterior),
        economia: economiaAtual,
        economiaVariacao: calcularVariacao(economiaAtual, economiaAnterior),
        metaNome: metaTop?.nome ?? null,
        metaValor: metaTop?.valorMeta ?? 0,
        metaProgresso: metaTop?.progressoAtual ?? 0,
        metaPercentual,
      });
    }

    carregarPanoramaGeral();

    return () => {
      ativo = false;
    };
  }, []);

  const fatiasComOffset = useFatiasComOffset(fatias);
  const totalFormatado = FormatToCurrency(totalGastos);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-SemiBold">
          Análise gráfica
        </Text>
        <Pressable
          className="flex-row items-center gap-1 bg-input-background border border-input-border px-2.5 py-1.5 rounded-lg active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Ver relatórios completos"
        >
          <Ionicons name="stats-chart-outline" color={colors["active-icon"]} size={13} />
          <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
            Ver relatórios
          </Text>
        </Pressable>
      </View>

      {/* GASTOS POR CATEGORIA */}
      <View className="mt-3 mb-4">
        <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-3">
          Gastos por categoria
        </Text>

        {carregandoCategoria ? (
          <View className="items-center py-6">
            <ActivityIndicator color={colors["active-icon"]} />
          </View>
        ) : fatias.length === 0 ? (
          <View className="items-center py-4">
            <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center">
              Nenhuma despesa encontrada para os filtros atuais.
            </Text>
          </View>
        ) : (
          <View className={isSmallDevice ? "flex-col items-center gap-4" : "flex-row items-center gap-4"}>
            <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }} className="items-center justify-center flex-shrink-0">
              <Svg
                viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                width={DONUT_SIZE}
                height={DONUT_SIZE}
                style={{ transform: [{ rotate: "-90deg" }] }}
              >
                <Circle
                  cx={VIEWBOX_SIZE / 2}
                  cy={VIEWBOX_SIZE / 2}
                  r={RADIUS}
                  stroke={colors["lines-divisions"]}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                {fatiasComOffset.map((fatia, index) => (
                  <Circle
                    key={`${fatia.nome}-${index}`}
                    cx={VIEWBOX_SIZE / 2}
                    cy={VIEWBOX_SIZE / 2}
                    r={RADIUS}
                    stroke={fatia.cor}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={fatia.dashArray}
                    strokeDashoffset={fatia.dashOffset}
                    fill="none"
                  />
                ))}
              </Svg>
              <View className="absolute items-center justify-center px-1">
                <Text style={{ fontSize: centerValueSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
                  {totalFormatado}
                </Text>
                <Text style={{ fontSize: centerLabelSize }} className="text-desactived-text">
                  Total de gastos
                </Text>
              </View>
            </View>

            <View className={isSmallDevice ? "w-full gap-2" : "flex-1 gap-2"}>
              {fatias.map((fatia) => (
                <View key={fatia.nome} className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-1.5 flex-shrink">
                    <View style={{ width: 8, height: 8, backgroundColor: fatia.cor }} className="rounded-sm" />
                    <Text style={{ fontSize: legendTextSize }} className="text-main-text" numberOfLines={1}>
                      {fatia.nome}
                    </Text>
                  </View>
                  <Text style={{ fontSize: legendTextSize }} className="text-second-text">
                    {fatia.percentual.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* EVOLUÇÃO MENSAL — dados reais via listarEvolucaoMensal */}
      <View className="mb-4 items-center">
        <View className="w-full flex-row justify-between items-center mb-3">
          <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium">
            Evolução mensal
          </Text>
          <Text style={{ fontSize: moderateScale(10) }} className="text-desactived-text">
            Últimos 6 meses
          </Text>
        </View>
        {evolucao.length > 0 && <EvolucaoMensal data={evolucao} />}
      </View>

      {/* METRICS — dados reais via calcularResumoReceitasDespesas + obterMetaDeMaiorProgresso */}
      {metricas && <ResumoMetrics metricas={metricas} />}
    </View>
  );
}

export const AnaliseGrafica = memo(AnaliseGraficaBase);