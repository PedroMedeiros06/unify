import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";

import { TransferenciasTabs, TransferenciasTab } from "@/components/TransferenciasComp/TransferenciasTabs";
import { NovaTransferencia } from "@/components/TransferenciasComp/NovaTransferencia";
import { AtalhosTransferencia } from "@/components/TransferenciasComp/AtalhosTransferencia";
import { TransacoesRecentesTransferencia } from "@/components/TransferenciasComp/TransacoesRecentesTransferencia";

export function Transferencias() {
  const [activeTab, setActiveTab] = useState<TransferenciasTab>("Enviar");

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
              Transferências
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Envie e receba dinheiro com segurança.
            </Text>
          </View>

          <Pressable
            className="w-9 h-9 rounded-full bg-input-background border border-input-border items-center justify-center flex-shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Abrir notificações"
          >
            <Ionicons name="notifications-outline" color={colors["desactived-text"]} size={16} />
          </Pressable>
        </View>

        <TransferenciasTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {activeTab === "Enviar" && (
          <View className="flex-col gap-4">
            <NovaTransferencia />
            <AtalhosTransferencia />
            <TransacoesRecentesTransferencia />
          </View>
        )}

        {activeTab !== "Enviar" && (
          <View className="items-center justify-center py-16">
            <Text className="text-desactived-text">Em breve: {activeTab}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
