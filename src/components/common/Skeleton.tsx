import { useEffect, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width, height, borderRadius = 8, style }: Props) {
  const opacidade = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacidade, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animacao.start();

    return () => animacao.stop();
  }, [opacidade]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors["lines-divisions"],
          opacity: opacidade,
        },
        style,
      ]}
    />
  );
}
