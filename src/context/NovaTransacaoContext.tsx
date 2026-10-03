import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { NovaTransacaoModal } from "@/components/TransacoesComp/NovaTransacaoModal";
import { TransferenciaModal, PreenchimentoTransferencia } from "@/components/ContasComp/TransferenciaModal";

/**
 * Controla o modal global de criação manual de transação. Antes o
 * estado ficava em app/index.tsx e só o MenuAcaoRapida conseguia
 * abri-lo; agora qualquer componente (ex: o botão "Adicionar
 * transação" das Últimas transações) chama abrir() via este hook.
 *
 * O próprio provider renderiza o <NovaTransacaoModal>, então ele fica
 * disponível em toda a árvore sem cada tela precisar montar o modal.
 * Mesmo esquema para o modal de transferência entre contas
 * (`abrirTransferencia`, com campos pré-preenchidos opcionais — ex:
 * "Pagar fatura" já vem com o cartão no destino).
 */
type NovaTransacaoContextValue = {
  visivel: boolean;
  abrir: () => void;
  fechar: () => void;
  abrirTransferencia: (preenchimento?: PreenchimentoTransferencia) => void;
};

const NovaTransacaoContext = createContext<NovaTransacaoContextValue | null>(null);

export function NovaTransacaoProvider({ children }: { children: ReactNode }) {
  const [visivel, setVisivel] = useState(false);

  const abrir = useCallback(() => setVisivel(true), []);
  const fechar = useCallback(() => setVisivel(false), []);

  // undefined = modal fechado; objeto (mesmo vazio) = aberto.
  const [transferencia, setTransferencia] = useState<PreenchimentoTransferencia | undefined>(undefined);
  const abrirTransferencia = useCallback((p?: PreenchimentoTransferencia) => setTransferencia(p ?? {}), []);
  const fecharTransferencia = useCallback(() => setTransferencia(undefined), []);

  const value = useMemo(
    () => ({ visivel, abrir, fechar, abrirTransferencia }),
    [visivel, abrir, fechar, abrirTransferencia]
  );

  return (
    <NovaTransacaoContext.Provider value={value}>
      {children}
      <NovaTransacaoModal
        visivel={visivel}
        onFechar={fechar}
        onTrocarParaTransferencia={(origemId) => {
          setVisivel(false);
          abrirTransferencia({ origemId });
        }}
      />
      <TransferenciaModal
        visivel={transferencia !== undefined}
        preenchimento={transferencia}
        onFechar={fecharTransferencia}
      />
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
