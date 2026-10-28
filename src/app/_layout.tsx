// app/_layout.tsx
import "../global.css"
import { useEffect } from "react";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";
import { TransacoesProvider } from "@/context/TransacoesContext";
import { ContasProvider } from "@/context/ContasContext";
import { CategoriasProvider } from "@/context/CategoriasContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { MetasProvider } from "@/context/MetasContext";
import { CompromissosProvider } from "@/context/CompromissosContext";
import { LembretesProvider } from "@/context/LembretesContext";
import { NotificacoesProvider } from "@/context/NotificacoesContext";
import { SimulacoesProvider } from "@/context/SimulacoesContext";
import { CotacoesProvider } from "@/context/CotacoesContext";
import { TaxasProvider } from "@/context/TaxasContext";
import { RecorrenciasProvider } from "@/context/RecorrenciasContext";
import { LimitesOrcamentoProvider } from "@/context/LimitesOrcamentoContext";
import { PerfilProvider } from "@/context/PerfilContext";
import { ResetAppProvider } from "@/context/ResetAppContext";
import { NovaTransacaoProvider } from "@/context/NovaTransacaoContext";
import { DialogoProvider } from "@/context/DialogoContext";



// Em produção, logs informativos (`console.log/info/debug`, ex: os das
// migrations e da fila do banco) só custam tempo de bridge e poluem o
// logcat — viram no-op. `warn`/`error` continuam: são o rastro útil se
// algo der errado num aparelho real.
if (!__DEV__) {
  const nada = () => {};
  console.log = nada;
  console.info = nada;
  console.debug = nada;
}

// Segura a splash nativa até a primeira tela real estar pronta (fontes
// carregadas). Quem libera é o overlay de abertura (AberturaAnimada,
// montado em app/index.tsx), que replica o quadro da splash e anima a
// saída — a troca nativa -> JS fica imperceptível. Antes o app mostrava um quadro vazio entre a splash e a
// Home enquanto as fontes carregavam.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [LoadedFonts] = useAppFonts()

  // Rede de segurança da splash: libera após 4s mesmo que algo trave
  // (ex: fonte que nunca carrega — aí o index nem monta para liberá-la).
  useEffect(() => {
    const t = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!LoadedFonts) return null

  return (
      <NavigationProvider>
       <DialogoProvider>
        <ResetAppProvider>
          <PerfilProvider>
           <ThemeProvider>
           <CategoriasProvider>
            <TransacoesProvider>
             <ContasProvider>
              <MetasProvider>
                <CompromissosProvider>
                  <LembretesProvider>
                   <NotificacoesProvider>
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
                   </NotificacoesProvider>
                  </LembretesProvider>
                </CompromissosProvider>
              </MetasProvider>
             </ContasProvider>
            </TransacoesProvider>
           </CategoriasProvider>
           </ThemeProvider>
          </PerfilProvider>
        </ResetAppProvider>
       </DialogoProvider>
      </NavigationProvider>
  );
}