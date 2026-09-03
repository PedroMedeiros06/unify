import { colors } from "@/theme/colors";
import { moderateScale, scale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PerfilCard } from "@/components/PerfilComp/PerfilCard";
import { Preferencias } from "@/components/PerfilComp/Preferencias";
import { BackupDados } from "@/components/PerfilComp/BackupDados";
import { SuporteInformacoes } from "@/components/PerfilComp/SuporteInformacoes";

export function Perfil() {
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);
  // Mesmo dimensionamento do botão de sino da Home (avatarSize).
  const avatarSize = moderateScale(40);

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
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
            className="bg-input-background border border-input-border/50 items-center justify-center shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Abrir notificações"
          >
            <Ionicons
              name="notifications-outline"
              color={colors["desactived-text"]}
              size={scale(16)}
            />
          </Pressable>
        </View>

        <PerfilCard />
        <Preferencias />
        <BackupDados />
        <SuporteInformacoes />
      </View>
    </ScrollView>
  );
}
