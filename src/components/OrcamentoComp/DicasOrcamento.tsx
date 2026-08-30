import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo, useState } from "react";
import { DICAS_ORCAMENTO, DicaOrcamento } from "@/database/orcamentoDicas";

// Quantas dicas aparecem antes de tocar em "Ver todas".
const DICAS_VISIVEIS_INICIAL = 1;

const ItemDica = memo(function ItemDica({ dica, isLast }: { dica: DicaOrcamento; isLast: boolean }) {
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(11);

  // Conteúdo estático (educação financeira) — não navega para lugar
  // nenhum, então nada de Pressable nem chevron.
  return (
    <View
      className={`flex-row gap-3 py-3 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityLabel={`${dica.titulo}. ${dica.subtitulo}`}
    >
      <View style={{ backgroundColor: `${dica.corIcone}22` }} className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0">
        <Ionicons name={dica.icone} color={dica.corIcone} size={18} />
      </View>

      <View className="flex-1">
        <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium" numberOfLines={2}>
          {dica.titulo}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text mt-0.5" numberOfLines={4}>
          {dica.subtitulo}
        </Text>
      </View>
    </View>
  );
});

function DicasOrcamentoBase() {
  const cardTitleSize = moderateScale(15);
  const actionTextSize = moderateScale(12);
  const emptyTextSize = moderateScale(12);

  const [expandido, setExpandido] = useState(false);

  const temMaisQueOInicial = DICAS_ORCAMENTO.length > DICAS_VISIVEIS_INICIAL;
  const dicasExibidas = expandido
    ? DICAS_ORCAMENTO
    : DICAS_ORCAMENTO.slice(0, DICAS_VISIVEIS_INICIAL);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <Ionicons name="bulb-outline" color={colors["active-icon"]} size={16} />
          <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            Dicas para um bom orçamento
          </Text>
        </View>
        {temMaisQueOInicial && (
          <Pressable
            onPress={() => setExpandido((atual) => !atual)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expandido ? "Mostrar menos dicas" : "Ver todas as dicas"}
          >
            <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
              {expandido ? "Ver menos" : "Ver todas"}
            </Text>
          </Pressable>
        )}
      </View>

      {DICAS_ORCAMENTO.length === 0 ? (
        <View className="items-center py-6">
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center">
            Nenhuma dica disponível no momento.
          </Text>
        </View>
      ) : (
        dicasExibidas.map((dica, index) => (
          <ItemDica key={dica.id} dica={dica} isLast={index === dicasExibidas.length - 1} />
        ))
      )}
    </View>
  );
}

export const DicasOrcamento = memo(DicasOrcamentoBase);