import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, FlatList } from "react-native";
import { memo } from "react";

type Compromisso = {
  id: string;
  nome: string;
  vencimento: string;
  diasRestantes: number;
  valor: number;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
};

const DEBUG_COMPROMISSOS: Compromisso[] = [
  { id: "1", nome: "Aluguel", vencimento: "05/06/2026", diasRestantes: 3, valor: 1500, icone: "home-outline", cor: colors["active-icon"] },
  { id: "2", nome: "Conta de água", vencimento: "07/06/2026", diasRestantes: 5, valor: 120.35, icone: "water-outline", cor: "#378ADD" },
  { id: "3", nome: "Conta de luz", vencimento: "10/06/2026", diasRestantes: 8, valor: 210.40, icone: "flash-outline", cor: colors["warn-color"] },
];

const DEBUG_MODE = true;

const CompromissoItem = memo(function CompromissoItem({
  item,
  isLast,
}: {
  item: Compromisso;
  isLast: boolean;
}) {
  const itemTitleSize = moderateScale(13);
  const itemSubtitleSize = moderateScale(10);
  const valueSize = moderateScale(13);
  const badgeSize = moderateScale(9);

  return (
    <View className={`flex-row justify-between items-center py-2.5 ${isLast ? "" : "border-b border-lines-divisions"}`}>
      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
        <View
          style={{ width: 34, height: 34, backgroundColor: `${item.cor}22` }}
          className="rounded-full items-center justify-center flex-shrink-0"
        >
          <Ionicons name={item.icone} color={item.cor} size={15} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={{ fontSize: itemSubtitleSize }} className="text-desactived-text" numberOfLines={1}>
            Vencimento: {item.vencimento}
          </Text>
        </View>
      </View>

      <View className="items-end flex-shrink-0">
        <Text style={{ fontSize: valueSize }} className="text-main-text font-Inter-Medium mb-1" numberOfLines={1}>
          {FormatToCurrency(item.valor)}
        </Text>
        <View className="bg-active-icon/20 px-2 py-0.5 rounded-full">
          <Text style={{ fontSize: badgeSize }} className="text-active-icon font-Inter-Medium">
            Em {item.diasRestantes} dias
          </Text>
        </View>
      </View>
    </View>
  );
});

function ProximosCompromissosBase() {
  const cardTitleSize = moderateScale(15);
  const compromissos = DEBUG_MODE ? DEBUG_COMPROMISSOS : [];

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Próximos compromissos
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Ver todos os compromissos">
          <Text style={{ fontSize: moderateScale(12) }} className="text-active-icon font-Inter-Medium">
            Ver todos
          </Text>
        </Pressable>
      </View>

      {/* FlatList em vez de .map(): dentro de listas maiores no futuro isso
          evita montar tudo de uma vez. Com poucos itens o ganho é pequeno,
          mas já deixa a base pronta para crescer sem precisar refatorar. */}
      <FlatList
        data={compromissos}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <CompromissoItem item={item} isLast={index === compromissos.length - 1} />
        )}
      />
    </View>
  );
}

export const ProximosCompromissos = memo(ProximosCompromissosBase);
