import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { NovaTransacaoModal } from "@/components/TransacoesComp/NovaTransacaoModal";

/**
 * Controla o modal global de criação manual de transação. Antes o
 * estado ficava em app/index.tsx e só o MenuAcaoRapida conseguia
 * abri-lo; agora qualquer componente (ex: o botão "Adicionar
 * transação" das Últimas transações) chama abrir() via este hook.
 *
 * O próprio provider renderiza o <NovaTransacaoModal>, então ele fica
 * disponível em toda a árvore sem cada tela precisar montar o modal.
 */
type NovaTransacaoContextValue = {
  visivel: boolean;
  abrir: () => void;
  fechar: () => void;
};

const NovaTransacaoContext = createContext<NovaTransacaoContextValue | null>(null);

export function NovaTransacaoProvider({ children }: { children: ReactNode }) {
  const [visivel, setVisivel] = useState(false);

  const abrir = useCallback(() => setVisivel(true), []);
  const fechar = useCallback(() => setVisivel(false), []);

  const value = useMemo(() => ({ visivel, abrir, fechar }), [visivel, abrir, fechar]);

  return (
    <NovaTransacaoContext.Provider value={value}>
      {children}
      <NovaTransacaoModal visivel={visivel} onFechar={fechar} />
    </NovaTransacaoContext.Provider>
  );
}

export function useNovaTransacao() {
  const context = useContext(NovaTransacaoContext);
  if (!context) {
    throw new Error("useNovaTransacao precisa ser usado dentro de um NovaTransacaoProvider");
  }
  return context;
}
