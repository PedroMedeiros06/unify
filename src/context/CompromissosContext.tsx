import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarCompromissos,
  inserirCompromisso,
  atualizarCompromisso,
  vincularCompromissoATransacao,
  desvincularCompromissoDaTransacao,
  excluirCompromisso,
  Compromisso,
  CamposCompromisso,
} from "@/database/compromissosQueries";
import { agendarNotificacaoVencimento, cancelarNotificacao } from "@/database/notificacoes";

type CompromissosContextValue = {
  compromissos: Compromisso[];
  carregando: boolean;
  erro: string | null;
  adicionarCompromisso: (campos: CamposCompromisso) => Promise<void>;
  editarCompromisso: (id: string, campos: CamposCompromisso) => Promise<void>;
  // "Pagar" = vincular o compromisso a uma transação real (a UI cria ou
  // escolhe essa transação antes de chamar). Desmarcar só remove o
  // vínculo — a transação em si permanece.
  pagarCompromissoComTransacao: (id: string, transacaoId: string) => Promise<void>;
  desmarcarPagoCompromisso: (id: string) => Promise<void>;
  removerCompromisso: (id: string) => Promise<void>;
};

const CompromissosContext = createContext<CompromissosContextValue | null>(null);

export function CompromissosProvider({ children }: { children: ReactNode }) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarCompromissos();
      setCompromissos(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar compromissos");
      console.error("[CompromissosContext] Falha ao carregar compromissos:", e);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      setCarregando(true);
      try {
        await carregar();
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    inicializar();

    return () => {
      ativo = false;
    };
  }, [carregar]);

  const adicionarCompromisso = useCallback(async (campos: CamposCompromisso) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const notificacaoId = await agendarNotificacaoVencimento(campos.nome, campos.valor, campos.dataVencimento);

      await inserirCompromisso(id, campos, notificacaoId);
      setCompromissos((prev) =>
        [
          ...prev,
          { id, ...campos, pago: false, transacaoId: null, notificacaoId, criadoEm: new Date().toISOString() },
        ].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar compromisso");
      throw e;
    }
  }, []);

  const editarCompromisso = useCallback(
    async (id: string, campos: CamposCompromisso) => {
      const compromissoAtual = compromissos.find((c) => c.id === id);

      try {
        await cancelarNotificacao(compromissoAtual?.notificacaoId ?? null);
        const novaNotificacaoId = await agendarNotificacaoVencimento(campos.nome, campos.valor, campos.dataVencimento);

        await atualizarCompromisso(id, campos, novaNotificacaoId);
        setCompromissos((prev) =>
          prev
            .map((c) => (c.id === id ? { ...c, ...campos, notificacaoId: novaNotificacaoId } : c))
            .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const pagarCompromissoComTransacao = useCallback(
    async (id: string, transacaoId: string) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        // Já existe uma transação real cobrindo esse compromisso — a
        // notificação de vencimento não faz mais sentido.
        if (compromisso?.notificacaoId) {
          await cancelarNotificacao(compromisso.notificacaoId);
        }

        await vincularCompromissoATransacao(id, transacaoId);
        setCompromissos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, transacaoId, pago: true, notificacaoId: null } : c))
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao registrar pagamento do compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const desmarcarPagoCompromisso = useCallback(async (id: string) => {
    try {
      await desvincularCompromissoDaTransacao(id);
      setCompromissos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, transacaoId: null, pago: false } : c))
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover pagamento do compromisso");
      throw e;
    }
  }, []);

  const removerCompromisso = useCallback(
    async (id: string) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        await cancelarNotificacao(compromisso?.notificacaoId ?? null);
        await excluirCompromisso(id);
        setCompromissos((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const value = useMemo(
    () => ({
      compromissos,
      carregando,
      erro,
      adicionarCompromisso,
      editarCompromisso,
      pagarCompromissoComTransacao,
      desmarcarPagoCompromisso,
      removerCompromisso,
    }),
    [
      compromissos,
      carregando,
      erro,
      adicionarCompromisso,
      editarCompromisso,
      pagarCompromissoComTransacao,
      desmarcarPagoCompromisso,
      removerCompromisso,
    ]
  );

  return <CompromissosContext.Provider value={value}>{children}</CompromissosContext.Provider>;
}

export function useCompromissos() {
  const context = useContext(CompromissosContext);
  if (!context) {
    throw new Error("useCompromissos precisa ser usado dentro de um CompromissosProvider");
  }
  return context;
}
