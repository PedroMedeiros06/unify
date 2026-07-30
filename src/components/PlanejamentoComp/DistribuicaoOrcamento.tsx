import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useMemo } from "react";

type Categoria = {
  nome: string;
  percentual: number;
  valor: number;
  cor: string;
};

const DEBUG_CATEGORIAS: Categoria[] = [
  { nome: "Moradia", percentual: 30, valor: 1915.62, cor: "#8D51E6" },
  { nome: "Transporte", percentual: 20, valor: 1277.08, cor: "#378ADD" },
  { nome: "Alimentação", percentual: 15, valor: 957.81, cor: "#1D9E75" },
  { nome: "Lazer", percentual: 10, valor: 638.54, cor: "#EF9F27" },
  { nome: "Saúde", percentual: 8, valor: 510.83, cor: "#E24B4A" },
  { nome: "Outros", percentual: 17, valor: 1084.52, cor: "#888780" },
];

const DEBUG_TOTAL = 6385.4;
const DEBUG_MODE = true;

const RADIUS = 42;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEWBOX_SIZE = 100;
const DONUT_SIZE = 120; // tamanho fixo — evita recalcular com useWindowDimensions

// Memoizado: só recalcula as fatias se a lista de categorias mudar de verdade,
// não a cada re-render do componente pai.
function useFatias(categorias: Categoria[]) {
  return useMemo(() => {
    let offsetAcumulado = 0;
    return categorias.map((cat) => {
      const dash = (cat.percentual / 100) * CIRCUMFERENCE;
      const fatia = {
        ...cat,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -offsetAcumulado,
      };
      offsetAcumulado += dash;
      return fatia;
    });
  }, [categorias]);
}

function DistribuicaoOrcamentoBase() {
  const cardTitleSize = moderateScale(15);
  const legendTextSize = moderateScale(11);
  const centerValueSize = moderateScale(12);
  const centerLabelSize = moderateScale(9);

  const categorias = DEBUG_MODE ? DEBUG_CATEGORIAS : [];
  const total = DEBUG_MODE ? DEBUG_TOTAL : 0;
  const fatias = useFatias(categorias);

  const totalFormatado = FormatToCurrency(total);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text
        style={{ fontSize: cardTitleSize }}
        className="text-main-text font-Inter-Medium mb-3.5"
      >
        Distribuição do orçamento
      </Text>

      <View className="flex-row items-center gap-4">
        {/* DONUT — tamanho fixo, sem depender de useWindowDimensions */}
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
            <Text
              style={{ fontSize: centerValueSize }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              {totalFormatado}
            </Text>
            <Text style={{ fontSize: centerLabelSize }} className="text-desactived-text">
              Total previsto
            </Text>
          </View>
        </View>

        {/* LEGENDA */}
        <View className="flex-1 gap-2">
          {categorias.map((cat) => (
            <View key={cat.nome} className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5 flex-shrink">
                <View
                  style={{ width: 8, height: 8, backgroundColor: cat.cor }}
                  className="rounded-sm"
                />
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
  );
}

// memo() evita re-render se o componente pai atualizar sem mudar dados relevantes
export const DistribuicaoOrcamento = memo(DistribuicaoOrcamentoBase);
