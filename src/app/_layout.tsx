// app/_layout.tsx
import "../global.css"
import { Slot } from "expo-router";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";
import { TransacoesProvider } from "@/context/TransacoesContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { MetasProvider } from "@/context/MetasContext";
import { CompromissosProvider } from "@/context/CompromissosContext";


export default function RootLayout() {

  const [LoadedFonts] = useAppFonts()
  if (!LoadedFonts) return null 

  return (
    <ThemeProvider name="default">
      <NavigationProvider>
        <TransacoesProvider>
          <MetasProvider>
            <CompromissosProvider>
              <Slot />
            </CompromissosProvider>
          </MetasProvider>
        </TransacoesProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}
