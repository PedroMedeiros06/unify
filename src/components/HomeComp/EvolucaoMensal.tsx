import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import Svg, { Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { memo, useMemo } from "react";

type Props = {
  data: { mes: string; valor: number }[];
  height?: number;
};

const CHART_WIDTH = 220;
const BAR_GAP = 8;

function EvolucaoMensalBase({ data, height = 130 }: Props) {
  const mesLabelSize = moderateScale(9);

  const max = useMemo(() => Math.max(...data.map((d) => d.valor), 1), [data]);
  const barWidth = useMemo(
    () => (CHART_WIDTH - BAR_GAP * (data.length - 1)) / data.length,
    [data.length]
  );

  return (
    <View>
      <Svg width={CHART_WIDTH} height={height}>
        <Defs>
          <LinearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#378ADD" />
            <Stop offset="1" stopColor="#1D9E75" />
          </LinearGradient>
        </Defs>
        {data.map((item, index) => {
          const barHeight = (item.valor / max) * height;
          const x = index * (barWidth + BAR_GAP);
          const y = height - barHeight;

          return (
            <Rect
              key={item.mes}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill="url(#barGradient)"
            />
          );
        })}
      </Svg>

      <View className="flex-row justify-between mt-1" style={{ width: CHART_WIDTH }}>
        {data.map((item) => (
          <Text
            key={item.mes}
            style={{ fontSize: mesLabelSize, width: barWidth }}
            className="text-desactived-text text-center"
          >
            {item.mes}
          </Text>
        ))}
      </View>
    </View>
  );
}

export const EvolucaoMensal = memo(EvolucaoMensalBase);
