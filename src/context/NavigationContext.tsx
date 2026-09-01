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
  | "agenda"
  | "metasConcluidas"
  | "recorrencias";

// Parâmetros opcionais que uma tela pode receber ao ser aberta. Cada
// tela decide se lê algum deles no seu próprio mount. Mantido enxuto de
// propósito — só o que já é usado.
export type NavigationParams = {
  // Aba inicial do Planejamento (ex: botão "Ver relatórios" da Home
  // abre direto na aba de análise de Orçamento).
  planejamentoTab?: "Resumo" | "Metas" | "Orçamento" | "Simulações";
};

type NavigationContextValue = {
  activeScreen: ScreenType;
  // params: lidos pela tela de destino no seu próprio efeito de mount.
  // São limpos automaticamente na navegação seguinte.
  params: NavigationParams;
  navigate: (screen: ScreenType, params?: NavigationParams) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const TELA_INICIAL: ScreenType = "home";

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenType>(TELA_INICIAL);
  const [params, setParams] = useState<NavigationParams>({});
  // Histórico simples só para permitir "voltar" — suficiente para o
  // padrão de navegação atual do app (sem pilhas profundas ou rotas aninhadas).
  const [historico, setHistorico] = useState<ScreenType[]>([]);

  const navigate = useCallback((screen: ScreenType, novosParams: NavigationParams = {}) => {
    setHistorico((prev) => [...prev, activeScreen]);
    setActiveScreen(screen);
    setParams(novosParams);
  }, [activeScreen]);

  const goBack = useCallback(() => {
    setParams({});
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
    () => ({ activeScreen, params, navigate, goBack }),
    [activeScreen, params, navigate, goBack]
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