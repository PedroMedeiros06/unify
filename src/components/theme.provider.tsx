import { useColorScheme } from "react-native";
import { VariableContextProvider } from "nativewind";
 
const themes = {
  brand: {
    light: {
      "--color-foreground": "#000000",
      "--color-muted-foreground": "#64748b",
      "--color-primary": "#3b82f6",
      "--color-secondary": "#8b5cf6",
    },
    dark: {
      "--color-foreground": "#ffffff",
      "--color-muted-foreground": "#a1a1a1",
      "--color-primary": "#60a5fa",
      "--color-secondary": "#a78bfa",
    },
  },
  default: {
    light: {
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
    }   
  },
};
 
export function ThemeProvider({
  name,
  children,
}: {
  name: keyof typeof themes;
  children: React.ReactNode;
}) {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <VariableContextProvider value={themes[name][colorScheme]}>
      {children}
    </VariableContextProvider>
  );
}