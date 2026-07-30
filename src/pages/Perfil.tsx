import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ContaSeguranca } from "@/components/PerfilComp/ContaSeguranca";
import { PerfilCard } from "@/components/PerfilComp/PerfilCard";
import { Preferencias } from "@/components/PerfilComp/Preferencias";
import { SuporteInformacoes } from "@/components/PerfilComp/SuporteInformacoes";

export function Perfil() {
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      removeClippedSubviews
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Perfil
            </Text>
            <Text
              style={{ fontSize: subtitleSize }}
              className="text-second-text mt-1"
            >
              Gerencie suas informações e preferências.
            </Text>
          </View>

          <Pressable
            className="w-9 h-9 rounded-full bg-input-background border border-input-border items-center justify-center flex-shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Abrir notificações"
          >
            <Ionicons
              name="notifications-outline"
              color={colors["desactived-text"]}
              size={16}
            />
          </Pressable>
        </View>

        <PerfilCard />
        <ContaSeguranca />
        <Preferencias />
        <SuporteInformacoes />
      </View>
    </ScrollView>
  );
}
