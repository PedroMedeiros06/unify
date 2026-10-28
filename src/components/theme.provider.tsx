import { createContext, useContext, useMemo, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { VariableContextProvider } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import { usePerfil } from "@/context/PerfilContext";
import type { TemaPreferido } from "@/database/perfilQueries";

// As cores abaixo devem ser mantidas idênticas às definidas em `src/global.css`
// (bloco dark) e em `src/theme/useThemeColors.ts` (bloco light).
const themes = {
  default: {
    // Paleta CLARA. Derivada da dark: mesmos papéis, invertendo a escala
    // de superfície/texto e mantendo o roxo de destaque (active-icon) e
    // as cores de status. Ajustadas para contraste AA sobre fundo claro.
    light: {
      // Superfícies: fundo levemente cinza-azulado, cards brancos.
      "--color-main-background": "#F4F6F9",
      "--color-card-background": "#FFFFFF",
      "--color-lines-divisions": "#E2E6EC",
      "--color-strong-border": "#CBD2DC",

      // Texto: quase-preto -> cinza médio -> cinza claro.
      "--color-main-text": "#151A21",
      "--color-second-text": "#4A5563",
      "--color-desactived-text": "#8A94A3",

      // Status: verde/vermelho um tom mais fechados para não "vazarem"
      // no branco; amarelo puxado para âmbar pelo mesmo motivo.
      "--color-green-money": "#15803D",
      "--color-warn-color": "#B45309",
      "--color-error-color": "#DC2626",
      "--color-sucess-color": "#047857",

      // Campos: fundo levemente afundado em relação ao card branco.
      "--color-input-background": "#F0F2F6",
      "--color-input-border": "#CBD2DC",

      // Destaque: mesmo roxo da dark, um tom mais fechado para contraste
      // sobre branco.
      "--color-active-icon": "#7C3AED",

      // Marcas dos bancos não mudam com o tema.
      "--color-inter-bank": "#FF7A01",
      "--color-nubank": "#8D11DA",
      "--color-bancoDoBrasil": "#FDFC30",
    },
    dark: {
      "--color-main-background": "#0B0F14",
      "--color-card-background": "#121821",
      "--color-lines-divisions": "#232C3B",
      "--color-strong-border": "#2F3A4D",
      "--color-main-text": "#E6EDF3",
      "--color-second-text": "#AAB4C3",
      "--color-desactived-text": "#6B778C",
      "--color-green-money": "#22C55E",
      "--color-warn-color": "#F59E0B",
      "--color-error-color": "#EF4444",
      "--color-sucess-color": "#10B981",
      "--color-input-background": "#0F141B",
      "--color-input-border": "#2F3A4D",
      "--color-active-icon": "#8D51E6",
      "--color-inter-bank": "#FF7A01",
      "--color-nubank": "#8D11DA",
      "--color-bancoDoBrasil": "#FDFC30",
    },
  },
};

export type TemaEfetivo = "claro" | "escuro";

type ThemeContextValue = {
  // Preferência bruta escolhida pelo usuário ("sistema" | "claro" | "escuro").
  temaPreferido: TemaPreferido;
  // Tema realmente aplicado agora ("claro" | "escuro") — com "sistema"
  // já resolvido pelo esquema do aparelho.
  temaEfetivo: TemaEfetivo;
  // Persiste a nova preferência (grava no perfil). A troca visual é
  // imediata porque o PerfilContext atualiza o estado em memória junto.
  definirTema: (tema: TemaPreferido) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provedor de tema do app. Deve ficar DENTRO do PerfilProvider (lê a
 * preferência `temaPreferido` de lá) e envolver o resto da árvore.
 * Resolve "sistema" com `useColorScheme()`, injeta as CSS vars
 * correspondentes via NativeWind e expõe `useTema()`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { perfil, atualizarPerfil } = usePerfil();
  const esquemaSistema = useColorScheme();

  const temaPreferido = perfil.temaPreferido;
  const temaEfetivo: TemaEfetivo =
    temaPreferido === "sistema"
      ? esquemaSistema === "light"
        ? "claro"
        : "escuro"
      : temaPreferido;

  const value = useMemo<ThemeContextValue>(
    () => ({
      temaPreferido,
      temaEfetivo,
      definirTema: (tema) => atualizarPerfil({ temaPreferido: tema }),
    }),
    [temaPreferido, temaEfetivo, atualizarPerfil]
  );

  const vars = temaEfetivo === "claro" ? themes.default.light : themes.default.dark;

  return (
    <ThemeContext.Provider value={value}>
      {/* Ícones da barra de status e da navegação do sistema seguem o
          tema: escuros sobre o fundo claro, claros sobre o escuro. Sem
          isto, no tema claro os ícones brancos sumiam no fundo. */}
      <StatusBar style={temaEfetivo === "claro" ? "dark" : "light"} />
      <NavigationBar style={temaEfetivo === "claro" ? "dark" : "light"} />
      <VariableContextProvider value={vars}>{children}</VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useTema(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTema precisa ser usado dentro de um ThemeProvider");
  }
  return ctx;
}
