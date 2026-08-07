// app/_layout.tsx
import "../global.css"
import { Slot } from "expo-router";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";
import { TransacoesProvider } from "@/context/TransacoesContext";
import { NavigationProvider } from "@/context/NavigationContext";


export default function RootLayout() {

  const [LoadedFonts] = useAppFonts()
  if (!LoadedFonts) return null 

  return (
    <ThemeProvider name="default">
      <NavigationProvider>
        <TransacoesProvider>
          <Slot />
        </TransacoesProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}