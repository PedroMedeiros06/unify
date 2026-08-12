import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { listarMetas, inserirMeta, atualizarMeta, excluirMeta, Meta, CamposMeta } from "@/database/metasQueries";

type MetasContextValue = {
  metas: Meta[];
  carregando: boolean;
  erro: string | null;
  adicionarMeta: (campos: Omit<CamposMeta, "progressoAtual">) => Promise<void>;
  editarMeta: (id: string, campos: CamposMeta) => Promise<void>;
  removerMeta: (id: string) => Promise<void>;
};

const MetasContext = createContext<MetasContextValue | null>(null);

export function MetasProvider({ children }: { children: ReactNode }) {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarMetas();
      setMetas(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar metas");
      console.error("[MetasContext] Falha ao carregar metas:", e);
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

  const adicionarMeta = useCallback(async (campos: Omit<CamposMeta, "progressoAtual">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const camposCompletos: CamposMeta = { ...campos, progressoAtual: 0 };

    try {
      await inserirMeta(id, camposCompletos);
      setMetas((prev) => [{ id, ...camposCompletos, criadoEm: new Date().toISOString() }, ...prev]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar meta");
      throw e;
    }
  }, []);

  const editarMeta = useCallback(async (id: string, campos: CamposMeta) => {
    try {
      await atualizarMeta(id, campos);
      setMetas((prev) => prev.map((m) => (m.id === id ? { ...m, ...campos } : m)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao editar meta");
      throw e;
    }
  }, []);

  const removerMeta = useCallback(async (id: string) => {
    try {
      await excluirMeta(id);
      setMetas((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir meta");
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ metas, carregando, erro, adicionarMeta, editarMeta, removerMeta }),
    [metas, carregando, erro, adicionarMeta, editarMeta, removerMeta]
  );

  return <MetasContext.Provider value={value}>{children}</MetasContext.Provider>;
}

export function useMetas() {
  const context = useContext(MetasContext);
  if (!context) {
    throw new Error("useMetas precisa ser usado dentro de um MetasProvider");
  }
  return context;
}
