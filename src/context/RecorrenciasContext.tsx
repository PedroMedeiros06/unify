import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarRecorrencias,
  inserirRecorrencia,
  atualizarRecorrencia,
  definirRecorrenciaAtiva,
  excluirRecorrencia,
  Recorrencia,
  CamposRecorrencia,
} from "@/database/recorrenciasQueries";
import { congelarMesesEncerrados } from "@/database/congelamentoOrcamento";

type RecorrenciasContextValue = {
  recorrencias: Recorrencia[];
  carregando: boolean;
  erro: string | null;
  adicionarRecorrencia: (campos: CamposRecorrencia) => Promise<void>;
  editarRecorrencia: (id: string, campos: CamposRecorrencia) => Promise<void>;
  alternarAtiva: (id: string, ativa: boolean) => Promise<void>;
  removerRecorrencia: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
};

const RecorrenciasContext = createContext<RecorrenciasContextValue | null>(null);

function ordenar(lista: Recorrencia[]): Recorrencia[] {
  return [...lista].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome));
}

export function RecorrenciasProvider({ children }: { children: ReactNode }) {
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setRecorrencias(await listarRecorrencias());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar recorrências");
      console.error("[RecorrenciasContext] Falha ao carregar recorrências:", e);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      setCarregando(true);
      try {
        // Congela meses encerrados uma vez no boot, antes de qualquer
        // leitura de previsão. É idempotente e nunca marca um mês como
        // congelado sem antes materializar suas ocorrências. Uma falha
        // aqui não deve travar o app — só fica para o próximo boot.
        try {
          await congelarMesesEncerrados();
        } catch (e) {
          console.error("[RecorrenciasContext] Falha ao congelar meses encerrados:", e);
        }
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

  const adicionarRecorrencia = useCallback(async (campos: CamposRecorrencia) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await inserirRecorrencia(id, campos);
      const agora = new Date().toISOString();
      setRecorrencias((prev) =>
        ordenar([
          ...prev,
          { id, periodicidade: "mensal", criadoEm: agora, atualizadoEm: agora, ...campos },
        ])
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar recorrência");
      console.error("[RecorrenciasContext] Falha ao inserir recorrência:", e);
      throw e;
    }
  }, []);

  const editarRecorrencia = useCallback(async (id: string, campos: CamposRecorrencia) => {
    try {
      await atualizarRecorrencia(id, campos);
      setRecorrencias((prev) =>
        ordenar(
          prev.map((r) =>
            r.id === id ? { ...r, ...campos, atualizadoEm: new Date().toISOString() } : r
          )
        )
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao editar recorrência");
      console.error("[RecorrenciasContext] Falha ao editar recorrência:", e);
      throw e;
    }
  }, []);

  const alternarAtiva = useCallback(async (id: string, ativa: boolean) => {
    try {
      await definirRecorrenciaAtiva(id, ativa);
      setRecorrencias((prev) => prev.map((r) => (r.id === id ? { ...r, ativa } : r)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar recorrência");
      console.error("[RecorrenciasContext] Falha ao alternar recorrência:", e);
      throw e;
    }
  }, []);

  const removerRecorrencia = useCallback(async (id: string) => {
    try {
      await excluirRecorrencia(id);
      setRecorrencias((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir recorrência");
      console.error("[RecorrenciasContext] Falha ao excluir recorrência:", e);
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({
      recorrencias,
      carregando,
      erro,
      adicionarRecorrencia,
      editarRecorrencia,
      alternarAtiva,
      removerRecorrencia,
      recarregar: carregar,
    }),
    [recorrencias, carregando, erro, adicionarRecorrencia, editarRecorrencia, alternarAtiva, removerRecorrencia, carregar]
  );

  return <RecorrenciasContext.Provider value={value}>{children}</RecorrenciasContext.Provider>;
}

export function useRecorrencias() {
  const context = useContext(RecorrenciasContext);
  if (!context) {
    throw new Error("useRecorrencias precisa ser usado dentro de um RecorrenciasProvider");
  }
  return context;
}
