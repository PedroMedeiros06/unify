import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

type Props = {
  totalImportado: number;
  totalSemCategoria: number;
  totalVinculadasMeta: number;
  onVoltarInicio: () => void;
  onImportarOutro: () => void;
};

function ImportacaoConcluidaBase({
  totalImportado,
  totalSemCategoria,
  totalVinculadasMeta,
  onVoltarInicio,
  onImportarOutro,
}: Props) {
  const titleSize = moderateScale(17);
  const subtitleSize = moderateScale(13);
  const avisoSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-6 items-center">
      <View className="w-16 h-16 rounded-full bg-sucess-color/20 items-center justify-center mb-3">
        <Ionicons name="checkmark" color={colors["sucess-color"]} size={32} />
      </View>

      <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold mb-1 text-center">
        Importação concluída
      </Text>
      <Text style={{ fontSize: subtitleSize }} className="text-second-text text-center mb-4">
        {totalImportado} {totalImportado === 1 ? "transação foi adicionada" : "transações foram adicionadas"} ao seu histórico.
      </Text>

      {totalVinculadasMeta > 0 && (
        <View className="w-full flex-row items-start gap-2 bg-active-icon/10 rounded-lg p-3 mb-3">
          <Text style={{ fontSize: avisoSize }} className="text-active-icon flex-1">
            🎯 {totalVinculadasMeta} {totalVinculadasMeta === 1 ? "transação foi vinculada" : "transações foram vinculadas"} a metas
            — o progresso já foi atualizado.
          </Text>
        </View>
      )}

      {totalSemCategoria > 0 && (
        <View className="w-full flex-row items-start gap-2 bg-warn-color/10 rounded-lg p-3 mb-4">
          <Ionicons name="pricetag-outline" color={colors["warn-color"]} size={16} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: avisoSize }} className="text-second-text flex-1">
            {totalSemCategoria} {totalSemCategoria === 1 ? "transação ficou" : "transações ficaram"} sem categoria.
            Você pode categorizá-las a qualquer momento tocando e segurando o item na lista de transações.
          </Text>
        </View>
      )}

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