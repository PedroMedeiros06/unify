import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { memo } from "react";

export type MetricasResumo = {
  receitas: number;
  receitasVariacao: number | null; // null = sem base de comparação (mês anterior zerado)
  despesas: number;
  despesasVariacao: number | null;
  economia: number;
  economiaVariacao: number | null;
  metaNome: string | null; // null = nenhuma meta cadastrada
  metaValor: number;
  metaProgresso: number;
  metaPercentual: number;
};

type Metric = {
  id: string;
  label: string;
  valor: number;
  variacao: number | null;
  icone: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  isProgress?: boolean;
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
        {FormatToCurrency(metric.valor)}
      </Text>

      {metric.isProgress ? (
        <>
          <Text style={{ fontSize: variationSize }} className="text-desactived-text mb-1.5">
            {metric.progressoPercentual !== undefined ? `${metric.progressoPercentual}% atingido` : "Nenhuma meta cadastrada"}
          </Text>
          <View className="h-1 bg-lines-divisions rounded-full overflow-hidden">
            <View
              style={{ width: `${Math.min(100, metric.progressoPercentual ?? 0)}%` }}
              className="h-full bg-active-icon rounded-full"
            />
          </View>
        </>
      ) : (
        <Text style={{ fontSize: variationSize }} className="text-desactived-text" numberOfLines={1}>
          {metric.variacao === null
            ? "Sem dado do mês anterior"
            : `${metric.variacao >= 0 ? "+" : ""}${metric.variacao}% vs mês anterior`}
        </Text>
      )}
    </View>
  );
});

type Props = {
  metricas: MetricasResumo;
};

function ResumoMetricsBase({ metricas }: Props) {
  const metrics: Metric[] = [
    {
      id: "receitas",
      label: "Receitas",
      valor: metricas.receitas,
      variacao: metricas.receitasVariacao,
      icone: "arrow-down-outline",
      iconColor: colors["sucess-color"],
    },
    {
      id: "despesas",
      label: "Despesas",
      valor: metricas.despesas,
      variacao: metricas.despesasVariacao,
      icone: "arrow-up-outline",
      iconColor: colors["error-color"],
    },
    {
      id: "economia",
      label: "Economia",
      valor: metricas.economia,
      variacao: metricas.economiaVariacao,
      icone: "card-outline",
      iconColor: "#378ADD",
    },
    {
      id: "meta",
      label: metricas.metaNome ?? "Meta mensal",
      valor: metricas.metaProgresso,
      variacao: null,
      icone: "radio-button-on-outline",
      iconColor: colors["active-icon"],
      isProgress: true,
      progressoPercentual: metricas.metaNome ? metricas.metaPercentual : undefined,
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </View>
  );
}

export const ResumoMetrics = memo(ResumoMetricsBase);