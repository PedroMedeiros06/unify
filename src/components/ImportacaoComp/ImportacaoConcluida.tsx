import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

type Props = {
  totalImportado: number;
  onVoltarInicio: () => void;
  onImportarOutro: () => void;
};

function ImportacaoConcluidaBase({ totalImportado, onVoltarInicio, onImportarOutro }: Props) {
  const titleSize = moderateScale(17);
  const subtitleSize = moderateScale(13);
  const buttonTextSize = moderateScale(14);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-6 items-center">
      <View className="w-16 h-16 rounded-full bg-sucess-color/20 items-center justify-center mb-3">
        <Ionicons name="checkmark" color={colors["sucess-color"]} size={32} />
      </View>

      <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold mb-1 text-center">
        Importação concluída
      </Text>
      <Text style={{ fontSize: subtitleSize }} className="text-second-text text-center mb-6">
        {totalImportado} {totalImportado === 1 ? "transação foi adicionada" : "transações foram adicionadas"} ao seu histórico.
      </Text>

      <Pressable
        onPress={onVoltarInicio}
        className="w-full py-3 rounded-xl items-center justify-center bg-active-icon active:opacity-80 mb-2.5"
        accessibilityRole="button"
        accessibilityLabel="Voltar para o início"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          Ver na página inicial
        </Text>
      </Pressable>

      <Pressable
        onPress={onImportarOutro}
        className="w-full py-3 rounded-xl items-center justify-center border border-input-border active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Importar outro arquivo"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-second-text font-Inter-Medium">
          Importar outro arquivo
        </Text>
      </Pressable>
    </View>
  );
}

export const ImportacaoConcluida = memo(ImportacaoConcluidaBase);
