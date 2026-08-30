// app/_layout.tsx
import "../global.css"
import { Slot } from "expo-router";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";
import { TransacoesProvider } from "@/context/TransacoesContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { MetasProvider } from "@/context/MetasContext";
import { CompromissosProvider } from "@/context/CompromissosContext";
import { RecorrenciasProvider } from "@/context/RecorrenciasContext";
import { LimitesOrcamentoProvider } from "@/context/LimitesOrcamentoContext";
import { PerfilProvider } from "@/context/PerfilContext";
import { ResetAppProvider } from "@/context/ResetAppContext";



export default function RootLayout() {
  const [LoadedFonts] = useAppFonts()
  if (!LoadedFonts) return null 

  return (
    <ThemeProvider name="default">
      <NavigationProvider>
        <ResetAppProvider>
          <PerfilProvider>
            <TransacoesProvider>
              <MetasProvider>
                <CompromissosProvider>
                  <RecorrenciasProvider>
                    <LimitesOrcamentoProvider>
                      <Slot />
                    </LimitesOrcamentoProvider>
                  </RecorrenciasProvider>
                </CompromissosProvider>
              </MetasProvider>
            </TransacoesProvider>
          </PerfilProvider>
        </ResetAppProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}