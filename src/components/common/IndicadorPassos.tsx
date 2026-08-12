import { View } from "react-native";
import { memo } from "react";

type Props = {
  totalPassos: number;
  passoAtual: number;
};

function IndicadorPassosBase({ totalPassos, passoAtual }: Props) {
  return (
    <View className="flex-row gap-1.5 justify-center mb-5">
      {Array.from({ length: totalPassos }).map((_, index) => (
        <View
          key={index}
          className={`h-1.5 rounded-full ${index === passoAtual ? "w-6 bg-active-icon" : "w-1.5 bg-lines-divisions"}`}
        />
      ))}
    </View>
  );
}

export const IndicadorPassos = memo(IndicadorPassosBase);
