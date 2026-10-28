import { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { useNavigation } from "@/context/NavigationContext";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Atalho da Home para o Relatório mensal. Nos primeiros 5 dias do mês
 * aponta para o mês que acabou de fechar (é quando o resumo faz
 * sentido); depois, para o mês corrente.
 */
function AtalhoRelatorioBase() {
  const colors = useThemeColors();
  const { navigate } = useNavigation();

  const hoje = new Date();
  const fechado = hoje.getDate() <= 5;
  const ref = fechado ? new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1) : hoje;
  const mesAno = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;

  return (
    <Pressable
      onPress={() => navigate("relatorio", { mesRelatorio: mesAno })}
      style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
      className="border rounded-xl px-4 py-3 flex-row items-center gap-3 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Abrir relatório de ${NOMES_MES[ref.getMonth()]}`}
    >
      <View style={{ backgroundColor: `${colors["active-icon"]}22` }} className="w-9 h-9 rounded-lg items-center justify-center">
        <Ionicons name="bar-chart-outline" size={17} color={colors["active-icon"]} />
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: moderateScale(13), color: colors["main-text"] }} className="font-Inter-Medium">
          {fechado ? `Resumo de ${NOMES_MES[ref.getMonth()]} pronto` : `Relatório de ${NOMES_MES[ref.getMonth()]}`}
        </Text>
        <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>
          Entradas, saídas e onde você gastou mais que no mês anterior
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors["second-text"]} />
    </Pressable>
  );
}

export const AtalhoRelatorio = memo(AtalhoRelatorioBase);
