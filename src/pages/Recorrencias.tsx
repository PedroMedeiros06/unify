import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { useNavigation } from "@/context/NavigationContext";
import { ListaRecorrencias } from "@/components/RecorrenciasComp/ListaRecorrencias";

/**
 * Tela de Recorrências — regras de planejamento (receitas/despesas que
 * se repetem todo mês). É uma tela separada, sem footer, acessada a
 * partir da aba "Orçamento" do Planejamento. Não cria transações: só
 * alimenta a previsão do Orçamento (ver etapas 4-7).
 */
export function Recorrencias() {
  const { goBack } = useNavigation();

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row items-center gap-3">
          <Pressable
            onPress={goBack}
            className="w-9 h-9 rounded-full bg-input-background border border-input-border items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" color={colors["main-text"]} size={18} />
          </Pressable>

          <View className="flex-1">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Recorrências
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Receitas e despesas que se repetem todo mês. Base da previsão do Orçamento.
            </Text>
          </View>
        </View>

        <ListaRecorrencias />
      </View>
    </ScrollView>
  );
}
