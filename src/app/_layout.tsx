// app/_layout.tsx
import "../global.css"
import { Slot } from "expo-router";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";
import { TransacoesProvider } from "@/context/TransacoesContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { MetasProvider } from "@/context/MetasContext";
import { CompromissosProvider } from "@/context/CompromissosContext";
import { LembretesProvider } from "@/context/LembretesContext";
import { SimulacoesProvider } from "@/context/SimulacoesContext";
import { CotacoesProvider } from "@/context/CotacoesContext";
import { TaxasProvider } from "@/context/TaxasContext";
import { RecorrenciasProvider } from "@/context/RecorrenciasContext";
import { LimitesOrcamentoProvider } from "@/context/LimitesOrcamentoContext";
import { PerfilProvider } from "@/context/PerfilContext";
import { ResetAppProvider } from "@/context/ResetAppContext";
import { NovaTransacaoProvider } from "@/context/NovaTransacaoContext";



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
                  <LembretesProvider>
                    <SimulacoesProvider>
                      <CotacoesProvider>
                       <TaxasProvider>
                        <RecorrenciasProvider>
                          <LimitesOrcamentoProvider>
                            <NovaTransacaoProvider>
                              <Slot />
                            </NovaTransacaoProvider>
                          </LimitesOrcamentoProvider>
                        </RecorrenciasProvider>
                       </TaxasProvider>
                      </CotacoesProvider>
                    </SimulacoesProvider>
                  </LembretesProvider>
                </CompromissosProvider>
              </MetasProvider>
            </TransacoesProvider>
          </PerfilProvider>
        </ResetAppProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}