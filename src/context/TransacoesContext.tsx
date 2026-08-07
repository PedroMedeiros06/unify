import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarTransacoes,
  inserirTransacao,
  seedDadosIniciaisSeNecessario,
  TransacaoComBanco,
} from "@/database/queries";

// Tipo público exposto às telas — igual ao formato que já era usado
// antes da migração para SQLite, para não precisar alterar componentes.
export type Transacao = {
  id: string;
  nome: string;
  subtitulo: string;
  valor: number;
  tipo: "entrada" | "saida";
  data: string;
  hora?: string;
  banco: {
    sigla: string;
    cor: string;
  };
  status?: "concluida" | "pendente" | "agendada";
  categoriaIcone?: string;
};

type NovaTransacaoInput = Omit<Transacao, "id"> & {
  bancoId: string; // precisa apontar para um banco já cadastrado na tabela `bancos`
};

type TransacoesContextValue = {
  transacoes: Transacao[];
  carregando: boolean;
  erro: string | null;
  adicionarTransacao: (transacao: NovaTransacaoInput) => Promise<void>;
  recarregar: () => Promise<void>;
};

const TransacoesContext = createContext<TransacoesContextValue | null>(null);

function mapearParaTransacaoUI(t: TransacaoComBanco): Transacao {
  return {
    id: t.id,
    nome: t.nome,
    subtitulo: t.subtitulo,
    valor: t.valor,
    tipo: t.tipo,
    data: t.data,
    hora: t.hora ?? undefined,
    banco: { sigla: t.banco.sigla, cor: t.banco.cor },
    status: t.status,
    categoriaIcone: t.categoriaIcone ?? undefined,
  };
}

export function TransacoesProvider({ children }: { children: ReactNode }) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDoBanco = useCallback(async () => {
    try {
      setErro(null);
      const linhas = await listarTransacoes();
      setTransacoes(linhas.map(mapearParaTransacaoUI));
    } catch (e) {
      // Erro de leitura do banco (ex: disco corrompido, migration falhou).
      // Mantemos a lista vazia em vez de travar a tela.
      setErro(e instanceof Error ? e.message : "Erro ao carregar transações");
      console.error("[TransacoesContext] Falha ao carregar transações:", e);
    }
  }, []);

  // Inicialização: garante dados-semente na primeira vez e carrega a lista
  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      setCarregando(true);
      try {
        await seedDadosIniciaisSeNecessario();
        await carregarDoBanco();
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    inicializar();

    return () => {
      ativo = false;
    };
  }, [carregarDoBanco]);

  const adicionarTransacao = useCallback(
    async (novaTransacao: NovaTransacaoInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        await inserirTransacao({
          id,
          nome: novaTransacao.nome,
          subtitulo: novaTransacao.subtitulo,
          valor: novaTransacao.valor,
          tipo: novaTransacao.tipo,
          data: novaTransacao.data,
          hora: novaTransacao.hora ?? null,
          bancoId: novaTransacao.bancoId,
          status: novaTransacao.status ?? "concluida",
          categoriaIcone: novaTransacao.categoriaIcone ?? null,
          criadoEm: new Date().toISOString(),
        });

        // Atualização otimista: insere no estado local imediatamente,
        // sem esperar um novo SELECT completo no banco.
        setTransacoes((prev) => [
          {
            id,
            nome: novaTransacao.nome,
            subtitulo: novaTransacao.subtitulo,
            valor: novaTransacao.valor,
            tipo: novaTransacao.tipo,
            data: novaTransacao.data,
            hora: novaTransacao.hora,
            banco: novaTransacao.banco,
            status: novaTransacao.status ?? "concluida",
            categoriaIcone: novaTransacao.categoriaIcone,
          },
          ...prev,
        ]);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar transação");
        console.error("[TransacoesContext] Falha ao inserir transação:", e);
        throw e; // deixa a tela que chamou decidir como tratar (ex: mostrar alerta)
      }
    },
    []
  );

  const value = useMemo(
    () => ({ transacoes, carregando, erro, adicionarTransacao, recarregar: carregarDoBanco }),
    [transacoes, carregando, erro, adicionarTransacao, carregarDoBanco]
  );

  return (
    <TransacoesContext.Provider value={value}>
      {children}
    </TransacoesContext.Provider>
  );
}

export function useTransacoes() {
  const context = useContext(TransacoesContext);
  if (!context) {
    throw new Error("useTransacoes precisa ser usado dentro de um TransacoesProvider");
  }
  return context;
}
