import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Base de design do seu Figma
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;

/**
 * Escala de Largura Pura (use com cuidado, apenas para caixas/paddings)
 */
export const scale = (size: number) => {
  return (width / DESIGN_WIDTH) * size;
};

/**
 * Escala de Altura Pura (use apenas para alturas de seções grandes ou gaps)
 */
export const verticalScale = (size: number) => {
  return (height / DESIGN_HEIGHT) * size;
};

/**
 * ESCALA MODERADA (A que resolve o seu problema!)
 * Ela pega o crescimento puro e o "suaviza".
 * - Um factor de 0.3 a 0.4 é o ponto ideal para fontes e avatares ficarem perfeitos.
 */
export const moderateScale = (size: number, factor = 0.35) => {
  return size + (scale(size) - size) * factor;
};