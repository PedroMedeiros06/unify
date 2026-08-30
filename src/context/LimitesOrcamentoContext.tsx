import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarLimitesCategoria,
  definirLimiteCategoria,
  removerLimiteCategoria,
  LimiteCategoria,
} from "@/database/limitesCategoriaQueries";
import { CategoriaId } from "@/database/categorias";
import { dataHojeIso } from "@/utils/dateUtils";

/**
 * Contexto dos LIMITES por categoria do Orçamento.
 *
 * Diferente dos outros contextos de domínio, este é ESCOPADO A UM MÊS:
 * mantém só os limites do `mesAno` atualmente exibido. Quem exibe o
 * card (CategoriasOrcamento) chama `definirMesExibido` quando o usuário
 * navega para outro mês. As mutações agem sempre sobre esse mês.
 */

type LimitesOrcamentoContextValue = {
  mesAno: string; // "aaaa-mm"
  limites: LimiteCategoria[];
  carregando: boolean;
  erro: string | null;
  definirMesExibido: (mesAno: string) => void;
  adicionarLimite: (categoriaId: CategoriaId, valorLimite: number) => Promise<void>;
  editarLimite: (categoriaId: CategoriaId, valorLimite: number) => Promise<void>;
  removerLimite: (categoriaId: CategoriaId) => Promise<void>;
  recarregar: () => Promise<void>;
};

const LimitesOrcamentoContext = createContext<LimitesOrcamentoContextValue | null>(null);

function ordenar(lista: LimiteCategoria[]): LimiteCategoria[] {
  return [...lista].sort(
    (a, b) => b.valorLimite - a.valorLimite || a.categoriaId.localeCompare(b.categoriaId)
  );
}

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function LimitesOrcamentoProvider({ children }: { children: ReactNode }) {
  const [mesAno, setMesAno] = useState<string>(() => dataHojeIso().slice(0, 7));
  const [limites, setLimites] = useState<LimiteCategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setLimites(ordenar(await listarLimitesCategoria(mesAno)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar limites");
      console.error("[LimitesOrcamentoContext] Falha ao carregar limites:", e);
    }
  }, [mesAno]);

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

  const definirMesExibido = useCallback((novoMes: string) => {
    setMesAno((atual) => (atual === novoMes ? atual : novoMes));
  }, []);

  const adicionarLimite = useCallback(
    async (categoriaId: CategoriaId, valorLimite: number) => {
      const id = gerarId();
      try {
        await definirLimiteCategoria(id, categoriaId, mesAno, valorLimite);
        const agora = new Date().toISOString();
        setLimites((prev) =>
          ordenar([
            ...prev.filter((l) => l.categoriaId !== categoriaId),
            { id, categoriaId, mesAno, valorLimite, criadoEm: agora, atualizadoEm: agora },
          ])
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao criar limite");
        console.error("[LimitesOrcamentoContext] Falha ao inserir limite:", e);
        throw e;
      }
    },
    [mesAno]
  );

  const editarLimite = useCallback(
    async (categoriaId: CategoriaId, valorLimite: number) => {
      const existente = limites.find((l) => l.categoriaId === categoriaId);
      const id = existente?.id ?? gerarId();
      try {
        await definirLimiteCategoria(id, categoriaId, mesAno, valorLimite);
        setLimites((prev) =>
          ordenar(
            prev.map((l) =>
              l.categoriaId === categoriaId
                ? { ...l, valorLimite, atualizadoEm: new Date().toISOString() }
                : l
            )
          )
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar limite");
        console.error("[LimitesOrcamentoContext] Falha ao editar limite:", e);
        throw e;
      }
    },
    [limites, mesAno]
  );

  const removerLimite = useCallback(
    async (categoriaId: CategoriaId) => {
      try {
        await removerLimiteCategoria(categoriaId, mesAno);
        setLimites((prev) => prev.filter((l) => l.categoriaId !== categoriaId));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir limite");
        console.error("[LimitesOrcamentoContext] Falha ao excluir limite:", e);
        throw e;
      }
    },
    [mesAno]
  );

  const value = useMemo(
    () => ({
      mesAno,
      limites,
      carregando,
      erro,
      definirMesExibido,
      adicionarLimite,
      editarLimite,
      removerLimite,
      recarregar: carregar,
    }),
    [mesAno, limites, carregando, erro, definirMesExibido, adicionarLimite, editarLimite, removerLimite, carregar]
  );

  return (
    <LimitesOrcamentoContext.Provider value={value}>{children}</LimitesOrcamentoContext.Provider>
  );
}

export function useLimitesOrcamento() {
  const context = useContext(LimitesOrcamentoContext);
  if (!context) {
    throw new Error("useLimitesOrcamento precisa ser usado dentro de um LimitesOrcamentoProvider");
  }
  return context;
}
