import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

type Meta = {
  id: string;
  nome: string;
  metaValor: number;
  valorAtual: number;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
};

const DEBUG_METAS: Meta[] = [
  { id: "1", nome: "Viagem férias", metaValor: 5000, valorAtual: 3250, icone: "airplane-outline", cor: colors["active-icon"] },
  { id: "2", nome: "Curso", metaValor: 2000, valorAtual: 1400, icone: "school-outline", cor: colors["sucess-color"] },
  { id: "3", nome: "Novo notebook", metaValor: 4500, valorAtual: 2025, icone: "laptop-outline", cor: colors["warn-color"] },
];

const DEBUG_MODE = true;

// Componente de item extraído e memoizado: cada meta só re-renderiza
// se os seus próprios dados mudarem, não quando a lista inteira renderiza.
const MetaItem = memo(function MetaItem({ meta }: { meta: Meta }) {
  const metaTitleSize = moderateScale(13);
  const metaSubtitleSize = moderateScale(10);
  const valueSize = moderateScale(12);

  const percentual = meta.metaValor > 0
    ? Math.min(100, Math.round((meta.valorAtual / meta.metaValor) * 100))
    : 0;

  return (
    <View className="bg-input-background border border-lines-divisions rounded-xl p-3">
      <View className="flex-row items-center gap-2.5 mb-2.5">
        <View
          style={{ width: 34, height: 34, backgroundColor: `${meta.cor}22` }}
          className="rounded-full items-center justify-center"
        >
          <Ionicons name={meta.icone} color={meta.cor} size={16} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: metaTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {meta.nome}
          </Text>
          <Text style={{ fontSize: metaSubtitleSize }} className="text-desactived-text" numberOfLines={1}>
            Meta de {FormatToCurrency(meta.metaValor)}
          </Text>
        </View>
      </View>

      <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden mb-1.5">
        <View style={{ width: `${percentual}%`, backgroundColor: meta.cor }} className="h-full rounded-full" />
      </View>

      <Text style={{ fontSize: valueSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
        {FormatToCurrency(meta.valorAtual)}
        <Text className="text-desactived-text font-Inter-Regular"> · {percentual}% concluído</Text>
      </Text>
    </View>
  );
});

function MetasFinanceirasBase() {
  const cardTitleSize = moderateScale(15);
  const metas = DEBUG_MODE ? DEBUG_METAS : [];

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Metas financeiras
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Ver todas as metas">
          <Text style={{ fontSize: moderateScale(12) }} className="text-active-icon font-Inter-Medium">
            Ver todas
          </Text>
        </Pressable>
      </View>

      <View className="gap-2.5">
        {metas.map((meta) => (
          <MetaItem key={meta.id} meta={meta} />
        ))}
      </View>
    </View>
  );
}

export const MetasFinanceiras = memo(MetasFinanceirasBase);
