import { memo, ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { useNavigation } from "@/context/NavigationContext";

type Props = {
  titulo: string;
  subtitulo?: string;
  // Elemento opcional à direita (ex: botão de ação da tela).
  direita?: ReactNode;
};

/**
 * Cabeçalho padrão das telas fora do footer (Contas, Relatório...):
 * botão voltar + título + subtítulo. Mesmo visual do header de
 * Recorrências, já com cores do tema.
 */
function CabecalhoTelaBase({ titulo, subtitulo, direita }: Props) {
  const colors = useThemeColors();
  const { goBack } = useNavigation();
  const titleSize = moderateScale(22);

  return (
    <View className="w-full flex-row items-center gap-3">
      <Pressable
        onPress={goBack}
        style={{ backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
        className="w-9 h-9 rounded-full border items-center justify-center active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
      >
        <Ionicons name="arrow-back" color={colors["main-text"]} size={18} />
      </Pressable>

      <View className="flex-1">
        <Text
          style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03, color: colors["main-text"] }}
          className="font-Inter-SemiBold"
        >
          {titulo}
        </Text>
        {subtitulo && (
          <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }} className="mt-1">
            {subtitulo}
          </Text>
        )}
      </View>
      {direita}
    </View>
  );
}

export const CabecalhoTela = memo(CabecalhoTelaBase);
