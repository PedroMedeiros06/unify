import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useTransacoes } from "@/context/TransacoesContext";
import {
  listarContasComSaldo,
  criarConta,
  atualizarConta,
  definirContaArquivada,
  excluirConta,
  ajustarSaldoAtual,
  criarTransferencia,
  atualizarTransferencia,
  excluirTransferencia,
  desfazerTransferencia,
  vincularComoTransferencia,
  converterEmTransferencia,
  ContaComSaldo,
  NovaContaInput,
  EdicaoContaInput,
  NovaTransferenciaInput,
} from "@/database/contasQueries";

/**
 * Contas do usuário (bancos do catálogo + personalizadas + cartões) com
 * saldo, e as ações de conta/transferência.
 *
 * Fica DENTRO do TransacoesProvider: recarrega os saldos sempre que
 * `versaoDados` sobe (qualquer transação criada/editada/excluída), e
 * toda escrita daqui que mexe em transações (transferências, ajuste de
 * saldo) chama `recarregar()` do TransacoesContext — assim Home, listas
 * e gráficos reconsultam sozinhos.
 */
type ContasContextValue = {
  contas: ContaComSaldo[]; // todas, inclusive arquivadas
  contasAtivas: ContaComSaldo[]; // para seletores (sem arquivadas)
  carregando: boolean;
  obterConta: (id: string) => ContaComSaldo | undefined;
  recarregarContas: () => Promise<void>;
  criarConta: (input: NovaContaInput) => Promise<string>;
  editarConta: (id: string, campos: EdicaoContaInput) => Promise<void>;
  arquivarConta: (id: string, arquivada: boolean) => Promise<void>;
  excluirConta: (id: string) => Promise<void>;
  ajustarSaldo: (id: string, saldoReal: number) => Promise<void>;
  criarTransferencia: (input: NovaTransferenciaInput) => Promise<string>;
  editarTransferencia: (transferenciaId: string, campos: { valor: number; data: string; nome?: string }) => Promise<void>;
  excluirTransferencia: (transferenciaId: string) => Promise<void>;
  desfazerTransferencia: (transferenciaId: string) => Promise<void>;
  vincularComoTransferencia: (idSaida: string, idEntrada: string) => Promise<void>;
  converterEmTransferencia: (transacaoId: string, outraContaId: string) => Promise<{ criouContrapartida: boolean }>;
};

const ContasContext = createContext<ContasContextValue | null>(null);

export function ContasProvider({ children }: { children: ReactNode }) {
  const { versaoDados, recarregar, carregando: carregandoBancos } = useTransacoes();
  const [contas, setContas] = useState<ContaComSaldo[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Versão própria para escritas que não passam por transações (criar,
  // editar, arquivar conta) — evita sinalizar mudança de transação à toa.
  const [versaoContas, setVersaoContas] = useState(0);

  useEffect(() => {
    // Os bancos do catálogo só existem depois que o TransacoesProvider
    // termina garantirBancosSuportados.
    if (carregandoBancos) return;
    let ativo = true;
    listarContasComSaldo()
      .then((lista) => {
        if (ativo) setContas(lista);
      })
      .catch((e) => console.warn("[ContasContext] Falha ao carregar contas:", e))
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [versaoDados, versaoContas, carregandoBancos]);

  const recarregarContas = useCallback(async () => {
    setVersaoContas((v) => v + 1);
  }, []);

  const contasAtivas = useMemo(() => contas.filter((c) => !c.arquivada), [contas]);
  const obterConta = useCallback((id: string) => contas.find((c) => c.id === id), [contas]);

  const value = useMemo<ContasContextValue>(
    () => ({
      contas,
      contasAtivas,
      carregando,
      obterConta,
      recarregarContas,
      criarConta: async (input) => {
        const id = await criarConta(input);
        await recarregarContas();
        return id;
      },
      editarConta: async (id, campos) => {
        await atualizarConta(id, campos);
        await recarregarContas();
      },
      arquivarConta: async (id, arquivada) => {
        await definirContaArquivada(id, arquivada);
        await recarregarContas();
      },
      excluirConta: async (id) => {
        await excluirConta(id);
        await recarregarContas();
      },
      // Saldo inicial entra em todo saldo acumulado (Resumo/sparkline) —
      // por isso sinaliza como mudança de dados, não só de conta.
      ajustarSaldo: async (id, saldoReal) => {
        await ajustarSaldoAtual(id, saldoReal);
        await recarregar();
      },
      criarTransferencia: async (input) => {
        const id = await criarTransferencia(input);
        await recarregar();
        return id;
      },
      editarTransferencia: async (transferenciaId, campos) => {
        await atualizarTransferencia(transferenciaId, campos);
        await recarregar();
      },
      excluirTransferencia: async (transferenciaId) => {
        await excluirTransferencia(transferenciaId);
        await recarregar();
      },
      desfazerTransferencia: async (transferenciaId) => {
        await desfazerTransferencia(transferenciaId);
        await recarregar();
      },
      vincularComoTransferencia: async (idSaida, idEntrada) => {
        await vincularComoTransferencia(idSaida, idEntrada);
        await recarregar();
      },
      converterEmTransferencia: async (transacaoId, outraContaId) => {
        const r = await converterEmTransferencia(transacaoId, outraContaId);
        await recarregar();
        return { criouContrapartida: r.criouContrapartida };
      },
    }),
    [contas, contasAtivas, carregando, obterConta, recarregarContas, recarregar]
  );

  return <ContasContext.Provider value={value}>{children}</ContasContext.Provider>;
}

export function useContas() {
  const context = useContext(ContasContext);
  if (!context) throw new Error("useContas precisa ser usado dentro de um ContasProvider");
  return context;
}
