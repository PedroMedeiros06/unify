import { moderateScale } from "@/utils/scale";
import { ScrollView, Text, View } from "react-native";

import { PerfilCard } from "@/components/PerfilComp/PerfilCard";
import { Preferencias } from "@/components/PerfilComp/Preferencias";
import { Organizacao } from "@/components/PerfilComp/Organizacao";
import { BackupDados } from "@/components/PerfilComp/BackupDados";
import { SuporteInformacoes } from "@/components/PerfilComp/SuporteInformacoes";
import { FerramentasDev } from "@/components/PerfilComp/FerramentasDev";

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
        <View className="w-full">
          <Text
            style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
            className="text-main-text font-Inter-SemiBold"
          >
            Perfil
          </Text>
          <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
            Gerencie suas informações e preferências.
          </Text>
        </View>

        <PerfilCard />
        <Organizacao />
        <Preferencias />
        <BackupDados />
        <SuporteInformacoes />
        {/* Só em desenvolvimento: massa de dados para medir performance. */}
        {__DEV__ && <FerramentasDev />}
      </View>
    </ScrollView>
  );
}
