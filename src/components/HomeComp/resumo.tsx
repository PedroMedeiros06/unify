import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { FormatToCurrency } from "@/utils/formatNumber";
import { memo, useCallback, useState } from "react";
import { Sparkline } from "@/components/HomeComp/Sparkline";
import { BancosConectados } from "@/components/HomeComp/BancosConectados";
import { useNavigation } from "@/context/NavigationContext";


const DEBUG = {
  Saldo_Total: 6782.91,
  Saldo_Total_Anterior: 5968.96,
  Historico_Saldo: [5200, 5800, 5450, 5968.96, 6100, 6350, 6782.91],
};

const DEBUG_MODE = true;

function maskCurrency(formatted: string) {
  return formatted.replace(/[0-9]/g, "•");
}

function ResumoBase() {
  const title = moderateScale(28);
  const subtilte = moderateScale(12);

  const [visible, setVisible] = useState(true);
  const { navigate } = useNavigation();

  const handleToggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const handleImportarExtrato = useCallback(() => {
    navigate("importarExtrato");
  }, [navigate]);

  const currentData = DEBUG_MODE ? DEBUG : null;

  const saldoAtual = currentData?.Saldo_Total ?? 0;
  const saldoAnterior = currentData?.Saldo_Total_Anterior ?? 0;
  const historico = currentData?.Historico_Saldo ?? [];

  const variacaoPercentual = saldoAnterior > 0
    ? Math.round(((saldoAtual - saldoAnterior) / saldoAnterior) * 100) : 0;

  const prefixoPercentual = variacaoPercentual > 0 ? "+" : "";

  const saldoFormatado = FormatToCurrency(saldoAtual);
  const saldoExibido = visible ? saldoFormatado : maskCurrency(saldoFormatado);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl">
      {/* Header */}
      <View className="pl-5 py-1.5 pr-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: subtilte }} className="text-main-text font-Inter-Medium">
            Saldo total consolidado
          </Text>
          <Pressable
            onPress={handleToggleVisible}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar saldo" : "Mostrar saldo"}
          >
            <Ionicons name={visible ? "eye" : "eye-off"} color={colors["main-text"]} size={10} />
          </Pressable>
        </View>
        <Pressable
          onPress={handleImportarExtrato}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Importar extrato"
        >
          <Ionicons name="document-attach-outline" color={colors["second-text"]} size={20} />
        </Pressable>
      </View>

      {/* Body */}
      <View className="px-4 pb-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text
              style={{ fontSize: title, letterSpacing: title * -0.04 }}
              className="text-main-text font-Inter-Bold"
              numberOfLines={1}
            >
              {saldoExibido}
            </Text>

            <View className="flex-row items-center gap-1.5 mt-1">
              <Text
                style={{ fontSize: subtilte }}
                className={variacaoPercentual >= 0 ? "text-sucess-color font-Inter-SemiBold" : "text-error-color font-Inter-SemiBold"}
              >
                {visible ? `${prefixoPercentual}${variacaoPercentual}%` : "••%"}
              </Text>
              <Text style={{ fontSize: subtilte }} className="text-second-text">
                em relação ao mês anterior
              </Text>
            </View>
          </View>

          {historico.length > 1 && (
            <Sparkline data={historico} width={110} height={50} />
          )}
        </View>

        <View className="mt-3">
          <BancosConectados />
        </View>
      </View>
    </View>
  );
}

export const Resumo = memo(ResumoBase);