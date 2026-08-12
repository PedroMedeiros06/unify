import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarCompromissos,
  inserirCompromisso,
  atualizarCompromisso,
  marcarCompromissoPago,
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
  marcarPago: (id: string, pago: boolean) => Promise<void>;
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
        [...prev, { id, ...campos, pago: false, notificacaoId, criadoEm: new Date().toISOString() }].sort(
          (a, b) => a.dataVencimento.localeCompare(b.dataVencimento)
        )
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

  const marcarPago = useCallback(
    async (id: string, pago: boolean) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        if (pago && compromisso?.notificacaoId) {
          await cancelarNotificacao(compromisso.notificacaoId);
        }

        await marcarCompromissoPago(id, pago);
        setCompromissos((prev) => prev.map((c) => (c.id === id ? { ...c, pago } : c)));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao atualizar compromisso");
        throw e;
      }
    },
    [compromissos]
  );

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
    () => ({ compromissos, carregando, erro, adicionarCompromisso, editarCompromisso, marcarPago, removerCompromisso }),
    [compromissos, carregando, erro, adicionarCompromisso, editarCompromisso, marcarPago, removerCompromisso]
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
