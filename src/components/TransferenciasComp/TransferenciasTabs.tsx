import { moderateScale } from "@/utils/scale";
import { Pressable, Text, View } from "react-native";
import { memo } from "react";

const TABS = ["Enviar", "Receber", "Agendadas"] as const;
export type TransferenciasTab = (typeof TABS)[number];

type Props = {
  activeTab: TransferenciasTab;
  onChangeTab: (tab: TransferenciasTab) => void;
};

function TransferenciasTabsBase({ activeTab, onChangeTab }: Props) {
  const tabTextSize = moderateScale(13);

  return (
    <View className="flex-row bg-input-background border border-lines-divisions rounded-xl p-1">
      {TABS.map((tab, index) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChangeTab(tab)}
            className={`flex-1 py-2.5 rounded-lg items-center ${isActive ? "bg-active-icon/15 border border-active-icon/40" : ""} ${index > 0 && !isActive ? "border-l border-lines-divisions" : ""}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={{ fontSize: tabTextSize }}
              className={isActive ? "text-active-icon font-Inter-SemiBold" : "text-second-text"}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const TransferenciasTabs = memo(TransferenciasTabsBase);
