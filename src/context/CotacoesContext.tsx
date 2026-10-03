import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { listarCotacoes, salvarCotacoes, CotacaoMoeda } from "@/database/cotacoesQueries";
import { buscarCotacoesFrankfurter } from "@/database/cotacoesApi";

type CotacoesContextValue = {
  cotacoes: CotacaoMoeda[];
  carregando: boolean;
  // true enquanto a atualização online está em andamento (o app já tem
  // as cotações do banco carregadas — isto é só o refresh de fundo).
  atualizando: boolean;
  // ISO de quando as cotações foram gravadas pela última vez, ou null.
  ultimaAtualizacao: string | null;
  atualizarAgora: () => Promise<void>;
};


// Atraso da atualização online no boot (ver efeito de inicialização).
const ATRASO_ATUALIZACAO_ONLINE_MS = 2000;
const CotacoesContext = createContext<CotacoesContextValue | null>(null);

export function CotacoesProvider({ children }: { children: ReactNode }) {
  const [cotacoes, setCotacoes] = useState<CotacaoMoeda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregarDoBanco = useCallback(async () => {
    const dados = await listarCotacoes();
    setCotacoes(dados);
    return dados;
  }, []);

  /**
   * Busca a Frankfurter e grava no banco. Silencioso em falha de rede:
   * se não há internet (ou a API caiu), o app simplesmente segue com as
   * cotações que já estão no banco — sem erro para o usuário.
   */
  const atualizarAgora = useCallback(async () => {
    setAtualizando(true);
    try {
      const remotas = await buscarCotacoesFrankfurter();
      if (remotas.length > 0) {
        await salvarCotacoes(remotas);
        await carregarDoBanco();
      }
    } catch (e) {
      console.warn("[CotacoesContext] Não foi possível atualizar cotações (offline?):", e);
    } finally {
      setAtualizando(false);
    }
  }, [carregarDoBanco]);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function inicializar() {
      setCarregando(true);
      try {
        // 1) Sempre carrega o que já está salvo (funciona offline).
        await carregarDoBanco();
      } finally {
        if (ativo) setCarregando(false);
      }
      // 2) Tenta atualizar de fundo a cada abertura do app. Se offline,
      //    atualizarAgora não faz nada e o passo 1 já garantiu os dados.
      // Adiada ~2s: no boot a prioridade é a Home aparecer. Rede + parse
      // + escrita no banco disputavam a thread JS e a fila do SQLite com
      // as consultas das telas. Os simuladores já têm os valores do banco.
      timer = setTimeout(() => {
        if (ativo) void atualizarAgora();
      }, ATRASO_ATUALIZACAO_ONLINE_MS);
    }

    inicializar();

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
    };
  }, [carregarDoBanco, atualizarAgora]);

  const ultimaAtualizacao = useMemo(() => {
    if (cotacoes.length === 0) return null;
    return cotacoes.reduce((maisRecente, c) => (c.atualizadoEm > maisRecente ? c.atualizadoEm : maisRecente), cotacoes[0].atualizadoEm);
  }, [cotacoes]);

  const value = useMemo(
    () => ({ cotacoes, carregando, atualizando, ultimaAtualizacao, atualizarAgora }),
    [cotacoes, carregando, atualizando, ultimaAtualizacao, atualizarAgora]
  );

  return <CotacoesContext.Provider value={value}>{children}</CotacoesContext.Provider>;
}

export function useCotacoes() {
  const context = useContext(CotacoesContext);
  if (!context) {
    throw new Error("useCotacoes precisa ser usado dentro de um CotacoesProvider");
  }
  return context;
}
