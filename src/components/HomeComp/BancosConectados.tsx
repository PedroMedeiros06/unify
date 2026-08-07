import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ScrollView } from "react-native";
import { memo } from "react";

type Banco = {
  id: string;
  nome: string;
  cor: string;
  sigla?: string; // usado quando não há ícone Ionicons adequado (ex: "nu")
  icone?: keyof typeof Ionicons.glyphMap;
};

const DEBUG_BANCOS: Banco[] = [
  { id: "inter", nome: "Inter", cor: "#FF7A01", icone: "business-outline" },
  { id: "nubank", nome: "Nubank", cor: "#8D11DA", sigla: "nu" },
  { id: "bb", nome: "Banco do Brasil", cor: "#FDFC30", icone: "business-outline" },
];

const DEBUG_MODE = true;

function BancosConectadosBase() {
  const chipTextSize = moderateScale(12);
  const bancos = DEBUG_MODE ? DEBUG_BANCOS : [];

  if (bancos.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {bancos.map((banco) => (
        <View
          key={banco.id}
          style={{ backgroundColor: `${banco.cor}22`, borderColor: `${banco.cor}55` }}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
        >
          {banco.sigla ? (
            <Text style={{ color: banco.cor, fontSize: 11 }} className="font-Inter-Bold">
              {banco.sigla}
            </Text>
          ) : (
            <Ionicons name={banco.icone ?? "business-outline"} color={banco.cor} size={13} />
          )}
          <Text style={{ fontSize: chipTextSize }} className="text-main-text font-Inter-Medium">
            {banco.nome}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export const BancosConectados = memo(BancosConectadosBase);
