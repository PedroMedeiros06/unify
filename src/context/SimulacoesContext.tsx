import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarSimulacoes,
  inserirSimulacao,
  excluirSimulacao,
  SimulacaoSalva,
  TipoSimulacao,
} from "@/database/simulacoesQueries";

type SimulacoesContextValue = {
  simulacoes: SimulacaoSalva[];
  carregando: boolean;
  erro: string | null;
  salvarSimulacao: (
    tipo: TipoSimulacao,
    titulo: string,
    parametros: unknown,
    resultado: unknown
  ) => Promise<void>;
  removerSimulacao: (id: string) => Promise<void>;
};

const SimulacoesContext = createContext<SimulacoesContextValue | null>(null);

export function SimulacoesProvider({ children }: { children: ReactNode }) {
  const [simulacoes, setSimulacoes] = useState<SimulacaoSalva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setSimulacoes(await listarSimulacoes());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar simulações");
      console.error("[SimulacoesContext] Falha ao carregar simulações:", e);
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

  const salvarSimulacao = useCallback(
    async (tipo: TipoSimulacao, titulo: string, parametros: unknown, resultado: unknown) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        await inserirSimulacao(id, tipo, titulo, parametros, resultado);
        // Recarrega do banco para manter a mesma ordenação/serialização.
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar simulação");
        throw e;
      }
    },
    [carregar]
  );

  const removerSimulacao = useCallback(async (id: string) => {
    try {
      await excluirSimulacao(id);
      setSimulacoes((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir simulação");
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ simulacoes, carregando, erro, salvarSimulacao, removerSimulacao }),
    [simulacoes, carregando, erro, salvarSimulacao, removerSimulacao]
  );

  return <SimulacoesContext.Provider value={value}>{children}</SimulacoesContext.Provider>;
}

export function useSimulacoes() {
  const context = useContext(SimulacoesContext);
  if (!context) {
    throw new Error("useSimulacoes precisa ser usado dentro de um SimulacoesProvider");
  }
  return context;
}
