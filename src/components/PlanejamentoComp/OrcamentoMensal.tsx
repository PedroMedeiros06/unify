import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

const DEBUG = {
  valorUtilizado: 4534.23,
  valorTotal: 6385.40,
};

const DEBUG_MODE = true;

function OrcamentoMensalBase() {
  const cardTitleSize = moderateScale(15);
  const labelSize = moderateScale(12);
  const percentSize = moderateScale(14);
  const subtitleSize = moderateScale(11);

  const data = DEBUG_MODE ? DEBUG : null;
  const valorUtilizado = data?.valorUtilizado ?? 0;
  const valorTotal = data?.valorTotal ?? 0;

  const percentual = valorTotal > 0
    ? Math.min(100, Math.round((valorUtilizado / valorTotal) * 100))
    : 0;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Orçamento mensal
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Editar orçamento">
          <Text style={{ fontSize: moderateScale(12) }} className="text-active-icon font-Inter-Medium">
            Editar orçamento
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="w-9 h-9 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
          <Ionicons name="wallet-outline" color={colors["active-icon"]} size={17} />
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-baseline mb-1">
            <Text style={{ fontSize: labelSize }} className="text-main-text">
              Orçamento utilizado
            </Text>
            <Text style={{ fontSize: percentSize }} className="text-active-icon font-Inter-SemiBold">
              {percentual}%
            </Text>
          </View>

          <Text style={{ fontSize: subtitleSize }} className="text-desactived-text mb-2" numberOfLines={1}>
            {FormatToCurrency(valorUtilizado)} de {FormatToCurrency(valorTotal)}
          </Text>

          <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden">
            <View style={{ width: `${percentual}%` }} className="h-full bg-active-icon rounded-full" />
          </View>
        </View>
      </View>
    </View>
  );
}

export const OrcamentoMensal = memo(OrcamentoMensalBase);
