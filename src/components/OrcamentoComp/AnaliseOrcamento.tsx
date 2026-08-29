import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { memo } from "react";
import { ANALISE_ORCAMENTO_MOCK } from "@/database/orcamentoMock";

const CardAnalise = memo(function CardAnalise({
  icone,
  corIcone,
  label,
  valor,
  subtitulo,
  corValor,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  label: string;
  valor: string;
  subtitulo: string;
  // Cor do valor em destaque. Por padrão acompanha a cor do ícone,
  // mas alguns cards (ex: "Maior gasto") destacam o valor numa cor
  // diferente da do ícone — nesse caso passa-se `corValor` explícito.
  corValor?: string;
}) {
  const labelSize = moderateScale(11);
  const valorSize = moderateScale(15);
  const subtituloSize = moderateScale(10);

  return (
    <View className="flex-1 min-w-[30%] bg-input-background border border-lines-divisions rounded-xl p-3">
      <View style={{ backgroundColor: `${corIcone}22` }} className="w-8 h-8 rounded-lg items-center justify-center mb-2.5">
        <Ionicons name={icone} color={corIcone} size={16} />
      </View>
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1" numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: valorSize, color: corValor ?? corIcone }} className="font-Inter-SemiBold mb-0.5" numberOfLines={1}>
        {valor}
      </Text>
      <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
        {subtitulo}
      </Text>
    </View>
  );
});

function AnaliseOrcamentoBase() {
  const cardTitleSize = moderateScale(15);

  const {
    economiaNoMes,
    economiaPercentualDaReceita,
    maiorGastoCategoriaNome,
    maiorGastoValor,
    maiorGastoPercentual,
    reducaoGastosPercentual,
  } = ANALISE_ORCAMENTO_MOCK;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium mb-3">
        Análise do orçamento
      </Text>

      <View className="flex-row flex-wrap gap-2.5">
        <CardAnalise
          icone="trending-up-outline"
          corIcone={colors["sucess-color"]}
          label="Economia no mês"
          valor={FormatToCurrency(economiaNoMes)}
          subtitulo={`${economiaPercentualDaReceita}% da receita`}
        />
        <CardAnalise
          icone="pie-chart-outline"
          corIcone="#378ADD"
          corValor={colors["active-icon"]}
          label="Maior gasto"
          valor={maiorGastoCategoriaNome}
          subtitulo={`${FormatToCurrency(maiorGastoValor)} (${maiorGastoPercentual}%)`}
        />
        <CardAnalise
          icone="trending-down-outline"
          corIcone={colors["warn-color"]}
          label="Redução de gastos"
          valor={`${reducaoGastosPercentual}%`}
          subtitulo="vs mês anterior"
        />
      </View>
    </View>
  );
}

export const AnaliseOrcamento = memo(AnaliseOrcamentoBase);