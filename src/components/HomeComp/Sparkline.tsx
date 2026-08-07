import { View } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { memo, useMemo } from "react";

type Props = {
  data: number[];
  width?: number;
  height?: number;
};

// Gera o "d" de um <Path> SVG a partir de uma lista de valores,
// normalizando para caber no viewBox.
function buildPath(data: number[], width: number, height: number) {
  if (data.length < 2) return "";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  return points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");
}

function SparklineBase({ data, width = 160, height = 60 }: Props) {
  // useMemo evita recalcular o path a cada re-render do card pai
  const path = useMemo(() => buildPath(data, width, height), [data, width, height]);
  const lastPoint = useMemo(() => {
    if (data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const x = width;
    const y = height - ((data[data.length - 1] - min) / range) * height;
    return { x, y };
  }, [data, width, height]);

  if (!path) return null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8D51E6" />
            <Stop offset="1" stopColor="#10B981" />
          </LinearGradient>
        </Defs>
        <Path d={path} stroke="url(#sparklineGradient)" strokeWidth={2} fill="none" />
        {lastPoint && (
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={3.5} fill="#10B981" />
        )}
      </Svg>
    </View>
  );
}

export const Sparkline = memo(SparklineBase);
