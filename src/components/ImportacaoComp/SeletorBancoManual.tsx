import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { ParserBanco } from "@/database/parsers/TransacaoImportada";

const CORES_POR_BANCO: Record<string, string> = {
  nubank: "#8D11DA",
  inter: "#FF7A01",
  bb: "#FDFC30",
};

type Props = {
  parsers: ParserBanco[];
  onSelecionar: (idBanco: string) => void;
  onCancelar: () => void;
};

function SeletorBancoManualBase({ parsers, onSelecionar, onCancelar }: Props) {
  const titleSize = moderateScale(15);
  const subtitleSize = moderateScale(12);
  const bancoNomeSize = moderateScale(14);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="help-circle-outline" color={colors["warn-color"]} size={18} />
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-Medium">
          Não identificamos o banco
        </Text>
      </View>
      <Text style={{ fontSize: subtitleSize }} className="text-second-text mb-4">
        Selecione manualmente qual banco gerou este arquivo:
      </Text>

      <View className="gap-2">
        {parsers.map((parser) => (
          <Pressable
            key={parser.idBanco}
            onPress={() => onSelecionar(parser.idBanco)}
            className="flex-row items-center gap-3 bg-input-background border border-input-border rounded-xl p-3 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Selecionar ${parser.nomeBanco}`}
          >
            <View
              style={{ backgroundColor: CORES_POR_BANCO[parser.idBanco] ?? colors["desactived-text"] }}
              className="w-9 h-9 rounded-lg items-center justify-center"
            >
              <Ionicons name="business-outline" color="#fff" size={16} />
            </View>
            <Text style={{ fontSize: bancoNomeSize }} className="text-main-text font-Inter-Medium flex-1">
              {parser.nomeBanco}
            </Text>
            <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onCancelar} className="mt-4 items-center py-2" accessibilityRole="button" accessibilityLabel="Cancelar importação">
        <Text style={{ fontSize: subtitleSize }} className="text-desactived-text">
          Cancelar
        </Text>
      </Pressable>
    </View>
  );
}

export const SeletorBancoManual = memo(SeletorBancoManualBase);
