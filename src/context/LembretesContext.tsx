import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarLembretes,
  inserirLembrete,
  atualizarLembrete,
  excluirLembrete,
  Lembrete,
  CamposLembrete,
} from "@/database/lembretesQueries";
import { agendarNotificacaoLembrete, cancelarNotificacao } from "@/database/notificacoes";

type LembretesContextValue = {
  lembretes: Lembrete[];
  carregando: boolean;
  erro: string | null;
  adicionarLembrete: (campos: CamposLembrete) => Promise<void>;
  editarLembrete: (id: string, campos: CamposLembrete) => Promise<void>;
  removerLembrete: (id: string) => Promise<void>;
};

const LembretesContext = createContext<LembretesContextValue | null>(null);

export function LembretesProvider({ children }: { children: ReactNode }) {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarLembretes();
      setLembretes(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar lembretes");
      console.error("[LembretesContext] Falha ao carregar lembretes:", e);
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

  const ordenar = (lista: Lembrete[]) =>
    [...lista].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const adicionarLembrete = useCallback(async (campos: CamposLembrete) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const notificacaoId = await agendarNotificacaoLembrete(
        campos.titulo,
        campos.descricao,
        campos.data,
        campos.hora
      );

      await inserirLembrete(id, campos, notificacaoId);
      setLembretes((prev) =>
        ordenar([...prev, { id, ...campos, notificacaoId, criadoEm: new Date().toISOString() }])
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar lembrete");
      throw e;
    }
  }, []);

  const editarLembrete = useCallback(
    async (id: string, campos: CamposLembrete) => {
      const atual = lembretes.find((l) => l.id === id);

      try {
        await cancelarNotificacao(atual?.notificacaoId ?? null);
        const novaNotificacaoId = await agendarNotificacaoLembrete(
          campos.titulo,
          campos.descricao,
          campos.data,
          campos.hora
        );

        await atualizarLembrete(id, campos, novaNotificacaoId);
        setLembretes((prev) =>
          ordenar(
            prev.map((l) => (l.id === id ? { ...l, ...campos, notificacaoId: novaNotificacaoId } : l))
          )
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar lembrete");
        throw e;
      }
    },
    [lembretes]
  );

  const removerLembrete = useCallback(
    async (id: string) => {
      const atual = lembretes.find((l) => l.id === id);

      try {
        await cancelarNotificacao(atual?.notificacaoId ?? null);
        await excluirLembrete(id);
        setLembretes((prev) => prev.filter((l) => l.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir lembrete");
        throw e;
      }
    },
    [lembretes]
  );

  const value = useMemo(
    () => ({
      lembretes,
      carregando,
      erro,
      adicionarLembrete,
      editarLembrete,
      removerLembrete,
    }),
    [lembretes, carregando, erro, adicionarLembrete, editarLembrete, removerLembrete]
  );

  return <LembretesContext.Provider value={value}>{children}</LembretesContext.Provider>;
}

export function useLembretes() {
  const context = useContext(LembretesContext);
  if (!context) {
    throw new Error("useLembretes precisa ser usado dentro de um LembretesProvider");
  }
  return context;
}
