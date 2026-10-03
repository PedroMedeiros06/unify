import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

/**
 * Transição entre a splash nativa e a primeira tela do app.
 *
 * A splash nativa (configurada no plugin `expo-splash-screen` do
 * app.json) mostra o "U" do logo sobre o fundo #0B0F14. Este overlay
 * reproduz exatamente esse quadro em JS — mesma cor, mesmo logo, mesmo
 * tamanho — e só então libera a splash nativa (no onLayout), então a
 * troca é imperceptível. Quando `pronto` vira true (já sabemos se vai
 * para o onboarding ou para o app), o logo dá um leve "respiro" e cresce
 * enquanto o overlay some, revelando a tela que já está montada por baixo.
 *
 * `onFim` é chamado ao término da animação para o pai desmontar o overlay.
 */

// Tamanho do "U" na splash nativa: imageWidth 160dp com o glifo
// ocupando 960px de altura numa imagem de 1024px (ver assets).
const ALTURA_LOGO = 150;
const LARGURA_LOGO = Math.round((ALTURA_LOGO * 721) / 765);

const COR_FUNDO = "#0B0F14";

type Props = {
  pronto: boolean;
  onFim: () => void;
};

export function AberturaAnimada({ pronto, onFim }: Props) {
  const escala = useState(() => new Animated.Value(1))[0];
  const opacidade = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    if (!pronto) return;

    const animacao = Animated.sequence([
      // "Respiro": encolhe um pouco antes de crescer, dá sensação de impulso.
      Animated.timing(escala, {
        toValue: 0.9,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(escala, {
          toValue: 6,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacidade, {
          toValue: 0,
          duration: 380,
          delay: 80,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animacao.start(({ finished }) => {
      if (finished) onFim();
    });
    return () => animacao.stop();
  }, [pronto, escala, opacidade, onFim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.fundo, { opacity: opacidade }]}
      onLayout={() => void SplashScreen.hideAsync().catch(() => {})}
    >
      <Animated.Image
        source={require("../../../assets/images/logo-u.png")}
        style={{ width: LARGURA_LOGO, height: ALTURA_LOGO, transform: [{ scale: escala }] }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fundo: {
    backgroundColor: COR_FUNDO,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 100,
  },
});
