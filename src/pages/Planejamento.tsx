import { useCallback, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";

import { PlanejamentoTabs, PlanejamentoTab } from "@/components/PlanejamentoComp/PlanejamentoTabs";
import { VisaoGeralMes } from "@/components/PlanejamentoComp/VisaoGeralMes";
import { DistribuicaoOrcamento } from "@/components/PlanejamentoComp/DistribuicaoOrcamento";
import { MetasFinanceiras } from "@/components/PlanejamentoComp/MetasFinanceiras";
import { OrcamentoMensal } from "@/components/PlanejamentoComp/OrcamentoMensal";
import { ProximosCompromissos } from "@/components/PlanejamentoComp/ProximosCompromissos";

export function Planejamento() {
  const [activeTab, setActiveTab] = useState<PlanejamentoTab>("Resumo");

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  // useCallback evita recriar a função a cada render do Planejamento,
  // o que faria o PlanejamentoTabs (mesmo memoizado) re-renderizar à toa.
  const handleChangeTab = useCallback((tab: PlanejamentoTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      // reduz a frequência de eventos de scroll processados — ajuda em
      // telas com bastante conteúdo abaixo do fold
      scrollEventThrottle={32}
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
              Planejamento
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Organize suas metas e tenha controle do seu futuro financeiro.
            </Text>
          </View>

          <Pressable
            className="w-9 h-9 rounded-lg bg-input-background border border-input-border items-center justify-center flex-shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Abrir calendário financeiro"
          >
            <Ionicons name="calendar-outline" color={colors["active-icon"]} size={16} />
          </Pressable>
        </View>

        <PlanejamentoTabs activeTab={activeTab} onChangeTab={handleChangeTab} />

        {/* Só a tab ativa é montada — as outras nem entram na árvore de
            componentes, então não consomem memória/processamento à toa. */}
        {activeTab === "Resumo" && (
          <View className="flex-col gap-3">
            <VisaoGeralMes />
            <DistribuicaoOrcamento />
            <MetasFinanceiras />
            <OrcamentoMensal />
            <ProximosCompromissos />
          </View>
        )}

        {activeTab !== "Resumo" && (
          <View className="items-center justify-center py-16">
            <Text className="text-desactived-text">Em breve: {activeTab}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
