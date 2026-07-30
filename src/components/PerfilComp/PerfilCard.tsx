import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Image } from "react-native";
import { memo } from "react";

const DEBUG_USER = {
  nome: "João da Silva",
  email: "joao.silva@email.com",
  plano: "Plano Gratuito",
  avatarUrl: null as string | null, // null = mostra ícone placeholder
  saldoConsolidado: 6782.91,
  gastosNoMes: 2356.78,
  metaAtingida: 66,
};

const DEBUG_MODE = true;

function PerfilCardBase() {
  const nameSize = moderateScale(18);
  const emailSize = moderateScale(12);
  const planoSize = moderateScale(11);
  const metricLabelSize = moderateScale(11);
  const metricValueSize = moderateScale(13);

  const user = DEBUG_MODE ? DEBUG_USER : null;
  const nome = user?.nome ?? "";
  const email = user?.email ?? "";
  const plano = user?.plano ?? "";
  const avatarUrl = user?.avatarUrl ?? null;
  const saldoConsolidado = user?.saldoConsolidado ?? 0;
  const gastosNoMes = user?.gastosNoMes ?? 0;
  const metaAtingida = user?.metaAtingida ?? 0;

  return (
    <View className="bg-active-icon/15 border border-active-icon/30 rounded-xl overflow-hidden">
      {/* CABEÇALHO: avatar + nome + email + plano */}
      <Pressable
        className="flex-row items-center gap-4 p-4 active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Ver detalhes do perfil"
      >
        <View className="relative">
          <View className="w-16 h-16 rounded-full bg-active-icon/30 items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="w-full h-full" />
            ) : (
              <Ionicons name="person" color={colors["active-icon"]} size={32} />
            )}
          </View>
          <Pressable
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-active-icon items-center justify-center border-2 border-main-background"
            accessibilityRole="button"
            accessibilityLabel="Editar foto de perfil"
            hitSlop={6}
          >
            <Ionicons name="pencil" color="#fff" size={11} />
          </Pressable>
        </View>

        <View className="flex-1">
          <Text
            style={{ fontSize: nameSize }}
            className="text-main-text font-Inter-SemiBold mb-0.5"
            numberOfLines={1}
          >
            {nome}
          </Text>
          <Text
            style={{ fontSize: emailSize }}
            className="text-second-text mb-2"
            numberOfLines={1}
          >
            {email}
          </Text>
          <View className="self-start bg-active-icon/40 px-2.5 py-1 rounded-full">
            <Text style={{ fontSize: planoSize }} className="text-main-text font-Inter-Medium">
              {plano}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" color={colors["second-text"]} size={18} />
      </Pressable>

      {/* MÉTRICAS RÁPIDAS */}
      <View className="flex-row border-t border-active-icon/20">
        <View className="flex-1 flex-row items-center gap-2 p-3">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="wallet-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Saldo consolidado
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              {FormatToCurrency(saldoConsolidado)}
            </Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-2 p-3 border-l border-active-icon/20">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="pie-chart-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Gastos no mês
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              {FormatToCurrency(gastosNoMes)}
            </Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-2 p-3 border-l border-active-icon/20">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="radio-button-on-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Meta mensal
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-active-icon font-Inter-SemiBold"
              numberOfLines={1}
            >
              {metaAtingida}% atingido
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export const PerfilCard = memo(PerfilCardBase);
