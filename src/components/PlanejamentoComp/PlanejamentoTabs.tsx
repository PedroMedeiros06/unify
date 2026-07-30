import { moderateScale } from "@/utils/scale";
import { Pressable, ScrollView, Text, View } from "react-native";
import { memo } from "react";

const TABS = ["Resumo", "Metas", "Orçamento", "Simulações"] as const;
export type PlanejamentoTab = (typeof TABS)[number];

type Props = {
  activeTab: PlanejamentoTab;
  onChangeTab: (tab: PlanejamentoTab) => void;
};

function PlanejamentoTabsBase({ activeTab, onChangeTab }: Props) {
  const tabTextSize = moderateScale(13);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-b border-lines-divisions"
      contentContainerStyle={{ gap: 18 }}
    >
      {TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChangeTab(tab)}
            className="pb-2.5"
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={{ fontSize: tabTextSize }}
              className={isActive ? "text-active-icon font-Inter-Medium" : "text-second-text"}
            >
              {tab}
            </Text>
            {isActive && (
              <View className="h-0.5 bg-active-icon rounded-full mt-2.5 absolute -bottom-px w-full" />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const PlanejamentoTabs = memo(PlanejamentoTabsBase);
