import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { memo } from "react";

type Metric = {
  id: string;
  label: string;
  valor: number;
  variacao: number;
  icone: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  isProgress?: boolean; // caso "Meta mensal", que mostra barra em vez de variação
  progressoPercentual?: number;
};

const MetricCard = memo(function MetricCard({ metric }: { metric: Metric }) {
  const labelSize = moderateScale(11);
  const valueSize = moderateScale(14);
  const variationSize = moderateScale(10);

  return (
    <View className="flex-1 min-w-[47%] bg-card-background border border-lines-divisions rounded-xl p-3">
      <View className="flex-row items-center gap-2 mb-2">
        <View
          style={{ backgroundColor: `${metric.iconColor}22` }}
          className="w-7 h-7 rounded-lg items-center justify-center flex-shrink-0"
        >
          <Ionicons name={metric.icone} color={metric.iconColor} size={14} />
        </View>
        <Text style={{ fontSize: labelSize }} className="text-second-text flex-1" numberOfLines={1}>
          {metric.label}
        </Text>
      </View>

      <Text
        style={{ fontSize: valueSize }}
        className="text-main-text font-Inter-SemiBold mb-1"
        numberOfLines={1}
      >
        {metric.isProgress ? FormatToCurrency(metric.valor) : FormatToCurrency(metric.valor)}
      </Text>

      {metric.isProgress ? (
        <>
          <Text style={{ fontSize: variationSize }} className="text-desactived-text mb-1.5">
            {metric.progressoPercentual}% atingido
          </Text>
          <View className="h-1 bg-lines-divisions rounded-full overflow-hidden">
            <View
              style={{ width: `${metric.progressoPercentual}%` }}
              className="h-full bg-active-icon rounded-full"
            />
          </View>
        </>
      ) : (
        <Text style={{ fontSize: variationSize }} className="text-desactived-text" numberOfLines={1}>
          {metric.variacao >= 0 ? "+" : ""}
          {metric.variacao}% vs mês anterior
        </Text>
      )}
    </View>
  );
});

const DEBUG_METRICS: Metric[] = [
  { id: "receitas", label: "Receitas", valor: 8942.10, variacao: 15.2, icone: "arrow-down-outline", iconColor: colors["sucess-color"] },
  { id: "despesas", label: "Despesas", valor: 2356.78, variacao: 8.7, icone: "arrow-up-outline", iconColor: colors["error-color"] },
  { id: "economia", label: "Economia", valor: 6585.32, variacao: 20.1, icone: "card-outline", iconColor: "#378ADD" },
  { id: "meta", label: "Meta mensal", valor: 10000, variacao: 0, icone: "radio-button-on-outline", iconColor: colors["active-icon"], isProgress: true, progressoPercentual: 66 },
];

const DEBUG_MODE = true;

function ResumoMetricsBase() {
  const metrics = DEBUG_MODE ? DEBUG_METRICS : [];

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </View>
  );
}

export const ResumoMetrics = memo(ResumoMetricsBase);
