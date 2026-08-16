import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

// Lista central das telas navegáveis do app. Adicionar uma tela nova
// (fora do footer) é só acrescentar aqui — nenhum componente que já
// usa useNavigation() precisa mudar.
export type ScreenType =
  | "home"
  | "transations"
  | "planejamento"
  | "user"
  | "importarExtrato"
  | "todasTransacoes";

type NavigationContextValue = {
  activeScreen: ScreenType;
  navigate: (screen: ScreenType) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const TELA_INICIAL: ScreenType = "home";

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenType>(TELA_INICIAL);
  // Histórico simples só para permitir "voltar" — suficiente para o
  // padrão de navegação atual do app (sem pilhas profundas ou rotas aninhadas).
  const [historico, setHistorico] = useState<ScreenType[]>([]);

  const navigate = useCallback((screen: ScreenType) => {
    setHistorico((prev) => [...prev, activeScreen]);
    setActiveScreen(screen);
  }, [activeScreen]);

  const goBack = useCallback(() => {
    setHistorico((prev) => {
      if (prev.length === 0) {
        setActiveScreen(TELA_INICIAL);
        return prev;
      }
      const novoHistorico = [...prev];
      const telaAnterior = novoHistorico.pop()!;
      setActiveScreen(telaAnterior);
      return novoHistorico;
    });
  }, []);

  const value = useMemo(
    () => ({ activeScreen, navigate, goBack }),
    [activeScreen, navigate, goBack]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation precisa ser usado dentro de um NavigationProvider");
  }
  return context;
}
