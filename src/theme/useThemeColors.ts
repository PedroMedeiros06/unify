import { colors as coresDark } from "./colors";
import { useTema } from "@/components/theme.provider";

/** Mapa nome-do-token -> hex. Estrutural (não os literais de `colors`),
 * para a paleta clara ser atribuível ao mesmo tipo. */
export type PaletaCores = Record<keyof typeof coresDark, string>;

/**
 * Versão CLARA da paleta. Deve ser mantida idêntica ao bloco
 * `themes.default.light` de `src/components/theme.provider.tsx` (que
 * alimenta as classes Tailwind) — este objeto é o equivalente para os
 * pontos onde precisamos do valor da cor em JS (prop `color` de ícone,
 * `stroke` de SVG, `placeholderTextColor`, etc.).
 *
 * Enquanto o tema claro está sendo implementado tela a tela, só os
 * componentes já migrados consomem `useThemeColors()`; o resto do app
 * continua importando `colors` direto de `./colors` (sempre dark) — o
 * fundo dessas telas muda pelas classes Tailwind, mas ícones/SVGs com
 * cor via JS só acompanham depois de migrados.
 */
const coresLight: PaletaCores = {
  "main-background": "#F4F6F9",
  "card-background": "#FFFFFF",
  "lines-divisions": "#E2E6EC",
  "strong-border": "#CBD2DC",

  "main-text": "#151A21",
  "second-text": "#4A5563",
  "desactived-text": "#8A94A3",

  "green-money": "#15803D",
  "warn-color": "#B45309",
  "error-color": "#DC2626",
  "sucess-color": "#047857",

  "input-background": "#F0F2F6",
  "input-border": "#CBD2DC",

  "active-icon": "#7C3AED",

  "inter-bank": "#FF7A01",
  "nubank": "#8D11DA",
  "bancoDoBrasil": "#FDFC30",
};

/**
 * Retorna a paleta de cores do tema ATUAL (segue a preferência do
 * usuário resolvida pelo ThemeProvider). Reage quando o tema muda. Use
 * no lugar de `import { colors }` nas telas com suporte a tema claro.
 */
export function useThemeColors(): PaletaCores {
  const { temaEfetivo } = useTema();
  return temaEfetivo === "claro" ? coresLight : coresDark;
}

/** `true` se o app está renderizando no tema claro agora. */
export function useIsTemaClaro(): boolean {
  return useTema().temaEfetivo === "claro";
}
