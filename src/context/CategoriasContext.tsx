import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  Categoria,
  CategoriaPersonalizadaId,
  definirCategoriasPersonalizadas,
  listarCategorias,
} from "@/database/categorias";
import {
  listarCategoriasPersonalizadas,
  criarCategoriaPersonalizada,
  atualizarCategoriaPersonalizada,
  definirCategoriaArquivada,
  excluirCategoriaPersonalizada,
  DadosCategoria,
} from "@/database/categoriasQueries";

/**
 * Carrega as categorias personalizadas do banco e as registra em
 * categorias.ts (registro em memória que `obterCategoriaPorId` consulta
 * de forma síncrona em todo o app). Expõe a lista completa para os
 * seletores e as ações de CRUD.
 *
 * `versao` sobe a cada mudança — telas que exibem nomes/ícones de
 * categoria a partir do registro podem usá-la como dependência.
 */
type CategoriasContextValue = {
  categorias: Categoria[]; // sistema + personalizadas ativas ("Outros" por último)
  personalizadas: Categoria[]; // inclusive arquivadas
  versao: number;
  criar: (dados: DadosCategoria) => Promise<CategoriaPersonalizadaId>;
  editar: (id: string, dados: DadosCategoria) => Promise<void>;
  arquivar: (id: string, arquivada: boolean) => Promise<void>;
  excluir: (id: string) => Promise<void>;
};

const CategoriasContext = createContext<CategoriasContextValue | null>(null);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const [personalizadas, setPersonalizadas] = useState<Categoria[]>([]);
  const [versao, setVersao] = useState(0);

  const aplicar = useCallback((lista: Categoria[]) => {
    // Registro ANTES do setState: quando os consumidores re-renderizarem,
    // obterCategoriaPorId já enxerga a lista nova.
    definirCategoriasPersonalizadas(lista);
    setPersonalizadas(lista);
    setVersao((v) => v + 1);
  }, []);

  const recarregar = useCallback(async () => {
    aplicar(await listarCategoriasPersonalizadas());
  }, [aplicar]);

  useEffect(() => {
    listarCategoriasPersonalizadas()
      .then(aplicar)
      .catch((e) => console.warn("[CategoriasContext] Falha ao carregar:", e));
  }, [aplicar]);

  const value = useMemo<CategoriasContextValue>(
    () => ({
      // `personalizadas` na dependência garante lista nova a cada recarga.
      categorias: personalizadas ? listarCategorias() : [],
      personalizadas,
      versao,
      criar: async (dados) => {
        const id = await criarCategoriaPersonalizada(dados);
        await recarregar();
        return id;
      },
      editar: async (id, dados) => {
        await atualizarCategoriaPersonalizada(id, dados);
        await recarregar();
      },
      arquivar: async (id, arquivada) => {
        await definirCategoriaArquivada(id, arquivada);
        await recarregar();
      },
      excluir: async (id) => {
        await excluirCategoriaPersonalizada(id);
        await recarregar();
      },
    }),
    [personalizadas, versao, recarregar]
  );

  return <CategoriasContext.Provider value={value}>{children}</CategoriasContext.Provider>;
}

export function useCategorias() {
  const context = useContext(CategoriasContext);
  if (!context) throw new Error("useCategorias precisa ser usado dentro de um CategoriasProvider");
  return context;
}
