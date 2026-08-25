import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { listarMetas, inserirMeta, atualizarMeta, excluirMeta, Meta, CamposMeta } from "@/database/metasQueries";

type MetasContextValue = {
  metas: Meta[];
  carregando: boolean;
  erro: string | null;
  adicionarMeta: (campos: CamposMeta) => Promise<void>;
  editarMeta: (id: string, campos: CamposMeta) => Promise<void>;
  removerMeta: (id: string) => Promise<void>;
  // Permite que qualquer tela force um reload da lista (ex: depois de
  // vincular/desvincular uma transação a uma meta em outra tela) —
  // como o progresso agora é derivado de meta_transacoes, o Context
  // não sabe sozinho quando essa tabela muda por fora dele.
  recarregar: () => Promise<void>;
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

  // progressoAtual não é mais input do formulário — toda meta nova
  // nasce com progresso 0 (sem vínculos). campos aqui já é CamposMeta
  // completo, sem o Omit<"progressoAtual"> que existia antes.
  const adicionarMeta = useCallback(async (campos: CamposMeta) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      await inserirMeta(id, campos);
      setMetas((prev) => [{ id, ...campos, progressoAtual: 0, criadoEm: new Date().toISOString() }, ...prev]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar meta");
      throw e;
    }
  }, []);

  const editarMeta = useCallback(async (id: string, campos: CamposMeta) => {
    try {
      await atualizarMeta(id, campos);
      // progressoAtual do estado local é preservado — atualizarMeta
      // nunca toca nessa coluna, então não há nada para sobrescrever
      // aqui além dos campos editáveis normais.
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
    () => ({ metas, carregando, erro, adicionarMeta, editarMeta, removerMeta, recarregar: carregar }),
    [metas, carregando, erro, adicionarMeta, editarMeta, removerMeta, carregar]
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