import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

type Atalho = {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: keyof typeof Ionicons.glyphMap;
};

const ATALHOS: Atalho[] = [
  { id: "pix", titulo: "Transferir via PIX", subtitulo: "A qualquer hora", icone: "flash-outline" },
  { id: "contas", titulo: "Transferir entre contas", subtitulo: "Mesma titularidade", icone: "business-outline" },
  { id: "boleto", titulo: "Usar boleto", subtitulo: "Pagar ou transferir", icone: "barcode-outline" },
];

function AtalhosTransferenciaBase() {
  const tituloSize = moderateScale(12);
  const subtituloSize = moderateScale(10);

  return (
    <View className="flex-row gap-2.5">
      {ATALHOS.map((atalho) => (
        <Pressable
          key={atalho.id}
          className="flex-1 bg-card-background border border-lines-divisions rounded-xl p-3 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={atalho.titulo}
        >
          <View className="w-8 h-8 rounded-lg bg-active-icon/20 items-center justify-center mb-2">
            <Ionicons name={atalho.icone} color={colors["active-icon"]} size={16} />
          </View>
          <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium mb-0.5">
            {atalho.titulo}
          </Text>
          <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
            {atalho.subtitulo}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export const AtalhosTransferencia = memo(AtalhosTransferenciaBase);
