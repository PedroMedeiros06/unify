import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useMemo } from "react";
import { EvolucaoMensal } from "@/components/HomeComp/EvolucaoMensal";
import { ResumoMetrics } from "@/components/HomeComp/ResumoMetrics";

type Categoria = { nome: string; percentual: number; cor: string };

const DEBUG_CATEGORIAS: Categoria[] = [
  { nome: "Transporte", percentual: 35, cor: "#8D51E6" },
  { nome: "Mercado", percentual: 25, cor: "#1D9E75" },
  { nome: "Casa", percentual: 15, cor: "#378ADD" },
  { nome: "Lazer", percentual: 10, cor: "#EF9F27" },
  { nome: "Saúde", percentual: 8, cor: "#E24B4A" },
  { nome: "Outros", percentual: 7, cor: "#888780" },
];

const DEBUG_TOTAL_GASTOS = 2356.78;

const DEBUG_EVOLUCAO = [
  { mes: "Jan", valor: 3200 },
  { mes: "Fev", valor: 3600 },
  { mes: "Mar", valor: 4100 },
  { mes: "Abr", valor: 5400 },
  { mes: "Mai", valor: 6300 },
  { mes: "Jun", valor: 7800 },
];

const DEBUG_MODE = true;

const RADIUS = 42;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEWBOX_SIZE = 100;
const DONUT_SIZE = 120;

function useFatias(categorias: Categoria[]) {
  return useMemo(() => {
    let offsetAcumulado = 0;
    return categorias.map((cat) => {
      const dash = (cat.percentual / 100) * CIRCUMFERENCE;
      const fatia = { ...cat, dashArray: `${dash} ${CIRCUMFERENCE - dash}`, dashOffset: -offsetAcumulado };
      offsetAcumulado += dash;
      return fatia;
    });
  }, [categorias]);
}

function AnaliseGraficaBase() {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

  const cardTitleSize = moderateScale(18);
  const sectionTitleSize = moderateScale(13);
  const legendTextSize = moderateScale(11);
  const centerValueSize = moderateScale(13);
  const centerLabelSize = moderateScale(9);
  const actionTextSize = moderateScale(12);

  const categorias = DEBUG_MODE ? DEBUG_CATEGORIAS : [];
  const totalGastos = DEBUG_MODE ? DEBUG_TOTAL_GASTOS : 0;
  const evolucao = DEBUG_MODE ? DEBUG_EVOLUCAO : [];
  const fatias = useFatias(categorias);
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
              {fatias.map((fatia) => (
                <Circle
                  key={fatia.nome}
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
            {categorias.map((cat) => (
              <View key={cat.nome} className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1.5 flex-shrink">
                  <View style={{ width: 8, height: 8, backgroundColor: cat.cor }} className="rounded-sm" />
                  <Text style={{ fontSize: legendTextSize }} className="text-main-text" numberOfLines={1}>
                    {cat.nome}
                  </Text>
                </View>
                <Text style={{ fontSize: legendTextSize }} className="text-second-text">
                  {cat.percentual}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* EVOLUÇÃO MENSAL */}
      <View className="mb-4 items-center">
        <View className="w-full flex-row justify-between items-center mb-3">
          <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium">
            Evolução mensal
          </Text>
          <Text style={{ fontSize: moderateScale(10) }} className="text-desactived-text">
            Últimos 6 meses
          </Text>
        </View>
        <EvolucaoMensal data={evolucao} />
      </View>

      {/* METRICS */}
      <ResumoMetrics />
    </View>
  );
}

export const AnaliseGrafica = memo(AnaliseGraficaBase);
