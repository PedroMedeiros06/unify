import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { DICAS_ORCAMENTO_MOCK, DicaOrcamento } from "@/database/orcamentoMock";

const ItemDica = memo(function ItemDica({ dica, isLast }: { dica: DicaOrcamento; isLast: boolean }) {
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(11);

  return (
    <Pressable
      className={`flex-row items-center gap-3 py-3 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={dica.titulo}
    >
      <View style={{ backgroundColor: `${dica.corIcone}22` }} className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0">
        <Ionicons name={dica.icone} color={dica.corIcone} size={18} />
      </View>

      <View className="flex-1">
        <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium" numberOfLines={2}>
          {dica.titulo}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text mt-0.5" numberOfLines={2}>
          {dica.subtitulo}
        </Text>
      </View>

      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
    </Pressable>
  );
});

type Props = {
  onVerTodas?: () => void;
};

function DicasOrcamentoBase({ onVerTodas }: Props) {
  const cardTitleSize = moderateScale(15);
  const actionTextSize = moderateScale(12);
  const emptyTextSize = moderateScale(12);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2">
          <Ionicons name="bulb-outline" color={colors["active-icon"]} size={16} />
          <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
            Dicas para otimizar seu orçamento
          </Text>
        </View>
        <Pressable onPress={onVerTodas} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ver todas as dicas">
          <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
            Ver todas
          </Text>
        </Pressable>
      </View>

      {DICAS_ORCAMENTO_MOCK.length === 0 ? (
        <View className="items-center py-6">
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center">
            Nenhuma dica disponível no momento.
          </Text>
        </View>
      ) : (
        DICAS_ORCAMENTO_MOCK.map((dica, index) => (
          <ItemDica key={dica.id} dica={dica} isLast={index === DICAS_ORCAMENTO_MOCK.length - 1} />
        ))
      )}
    </View>
  );
}

export const DicasOrcamento = memo(DicasOrcamentoBase);