import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { listarTaxas, salvarTaxas, TaxaReferencia } from "@/database/taxasQueries";
import { buscarTaxasBcb } from "@/database/taxasApi";

type TaxasContextValue = {
  taxas: TaxaReferencia[];
  carregando: boolean;
  // true enquanto a atualização online está em andamento (as taxas do
  // banco já foram carregadas — isto é só o refresh de fundo).
  atualizando: boolean;
  // ISO de quando as taxas foram gravadas pela última vez, ou null.
  ultimaAtualizacao: string | null;
  atualizarAgora: () => Promise<void>;
};

const TaxasContext = createContext<TaxasContextValue | null>(null);

export function TaxasProvider({ children }: { children: ReactNode }) {
  const [taxas, setTaxas] = useState<TaxaReferencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregarDoBanco = useCallback(async () => {
    const dados = await listarTaxas();
    setTaxas(dados);
    return dados;
  }, []);

  /**
   * Busca as séries no Banco Central e grava no banco. Silencioso em
   * falha de rede: sem internet, o app segue com as taxas que já estão
   * no banco — sem erro para o usuário. Mesmo padrão de CotacoesContext.
   */
  const atualizarAgora = useCallback(async () => {
    setAtualizando(true);
    try {
      const remotas = await buscarTaxasBcb();
      if (remotas.length > 0) {
        await salvarTaxas(remotas);
        await carregarDoBanco();
      }
    } catch (e) {
      console.warn("[TaxasContext] Não foi possível atualizar taxas (offline?):", e);
    } finally {
      setAtualizando(false);
    }
  }, [carregarDoBanco]);

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      setCarregando(true);
      try {
        // 1) Sempre carrega o que já está salvo (funciona offline).
        await carregarDoBanco();
      } finally {
        if (ativo) setCarregando(false);
      }
      // 2) Tenta atualizar de fundo a cada abertura do app.
      if (ativo) void atualizarAgora();
    }

    inicializar();

    return () => {
      ativo = false;
    };
  }, [carregarDoBanco, atualizarAgora]);

  const ultimaAtualizacao = useMemo(() => {
    if (taxas.length === 0) return null;
    return taxas.reduce(
      (maisRecente, t) => (t.atualizadoEm > maisRecente ? t.atualizadoEm : maisRecente),
      taxas[0].atualizadoEm
    );
  }, [taxas]);

  const value = useMemo(
    () => ({ taxas, carregando, atualizando, ultimaAtualizacao, atualizarAgora }),
    [taxas, carregando, atualizando, ultimaAtualizacao, atualizarAgora]
  );

  return <TaxasContext.Provider value={value}>{children}</TaxasContext.Provider>;
}

export function useTaxas() {
  const context = useContext(TaxasContext);
  if (!context) {
    throw new Error("useTaxas precisa ser usado dentro de um TaxasProvider");
  }
  return context;
}
