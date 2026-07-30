import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { FormatToCurrency } from "@/utils/formatNumber";
import { useState } from "react";

const DEBUG = {
  Saldo_Total: 6782.91,
  Saldo_Total_Anterior: 5968.96,
};

const DEBUG_MODE = true;

// Mantém o mesmo número de caracteres do valor real para não "pular" o layout
function maskCurrency(formatted: string) {
  return formatted.replace(/[0-9]/g, "•");
}

export function Resumo() {
  const title = moderateScale(28);
  const subtilte = moderateScale(12);

  // `visible` = true significa "saldo visível na tela" (estado inicial oculto por padrão,
  // mais seguro para apps financeiros — o usuário revela quando quiser).
  const [visible, setVisible] = useState(false);

  const currentData = DEBUG_MODE ? DEBUG : null;

  const saldoAtual = currentData?.Saldo_Total ?? 0;
  const saldoAnterior = currentData?.Saldo_Total_Anterior ?? 0;

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
          <Text 
            style={{ fontSize: subtilte }}
            className="text-main-text font-Inter-Medium"
          >
            Saldo total consolidado
          </Text>
          <Pressable
            onPress={() => setVisible(!visible)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar saldo" : "Mostrar saldo"}
          >
            <Ionicons name={visible ? "eye-off" : "eye"} color={colors["main-text"]} size={10} />
          </Pressable>
        </View>
            <Pressable 
                onPress={() => console.log('Importar')}
                className="p-2 active:opacity-60"
                hitSlop={12} // Aumenta a área de clique mesmo o ícone sendo pequeno
                accessibilityRole="button"
                accessibilityLabel="Importar extrato"
                >
                <Ionicons name="document-attach-outline" color={colors["second-text"]} size={20} />
            </Pressable>
      </View>

      {/* Body */}
      <View className="px-4 flex-col pb-4">
        <Text 
          style={{ fontSize: title, letterSpacing: title * -0.04 }}
          className="text-main-text font-Inter-Bold"
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
          <Text 
            style={{ fontSize: subtilte }}
            className="text-second-text"
          >
            em relação ao mês anterior
          </Text>
        </View>
      </View>
    </View>
  );
}