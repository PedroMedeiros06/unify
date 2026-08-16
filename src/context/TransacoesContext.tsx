import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarTransacoes,
  inserirTransacao,
  atualizarTransacao,
  excluirTransacao,
  seedDadosIniciaisSeNecessario,
  TransacaoComBanco,
} from "@/database/queries";
import { dataIsoParaBR, dataBRParaIso } from "@/utils/dateUtils";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { normalizarPadraoDescricao } from "@/database/categorizacao";
import { salvarRegraCategorizacao } from "@/database/regrasAprendidasQueries";

export type Transacao = {
  id: string;
  nome: string;
  subtitulo: string;
  valor: number;
  tipo: "entrada" | "saida";
  data: string; // formato dd/mm/aaaa — já convertido para exibição
  hora?: string;
  banco: {
    sigla: string;
    cor: string;
  };
  status?: "concluida" | "pendente" | "agendada";
  categoriaIcone?: string;
  categoriaId: CategoriaId | null;
};

type NovaTransacaoInput = Omit<Transacao, "id"> & {
  bancoId: string;
  identificadorExterno?: string | null;
};

export type CamposEditaveis = {
  nome: string;
  subtitulo: string;
  valor: number;
  tipo: "entrada" | "saida";
  data: string;
  categoriaIcone?: string;
  categoriaId: CategoriaId | null;
};

type TransacoesContextValue = {
  transacoes: Transacao[];
  carregando: boolean;
  erro: string | null;
  adicionarTransacao: (transacao: NovaTransacaoInput) => Promise<void>;
  editarTransacao: (id: string, campos: CamposEditaveis) => Promise<void>;
  removerTransacao: (id: string) => Promise<void>;
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
    data: dataIsoParaBR(t.data),
    hora: t.hora ?? undefined,
    banco: { sigla: t.banco.sigla, cor: t.banco.cor },
    status: t.status,
    categoriaIcone: t.categoriaIcone ?? undefined,
    categoriaId: t.categoriaId,
  };
}

function normalizarParaIso(data: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : dataBRParaIso(data);
}

/**
 * Se a categoria informada difere da categoria anterior, grava isso
 * como regra aprendida (origem 'usuario') para o padrão normalizado
 * da descrição — é assim que uma edição manual "ensina" o app para
 * futuras transações com descrição semelhante, sem bloquear a UI
 * (a gravação da regra roda em paralelo, não é aguardada pelo fluxo
 * de salvar a transação em si).
 */
function aprenderComEdicaoManual(
  nome: string,
  categoriaAnterior: CategoriaId | null,
  categoriaNova: CategoriaId | null
) {
  if (!categoriaNova || categoriaNova === categoriaAnterior) return;

  const padrao = normalizarPadraoDescricao(nome);
  if (!padrao) return;

  salvarRegraCategorizacao(padrao, categoriaNova, "usuario").catch((e) => {
    console.error("[TransacoesContext] Falha ao salvar regra aprendida:", e);
  });
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
      setErro(e instanceof Error ? e.message : "Erro ao carregar transações");
      console.error("[TransacoesContext] Falha ao carregar transações:", e);
    }
  }, []);

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
      const dataIso = normalizarParaIso(novaTransacao.data);

      try {
        await inserirTransacao({
          id,
          nome: novaTransacao.nome,
          subtitulo: novaTransacao.subtitulo,
          valor: novaTransacao.valor,
          tipo: novaTransacao.tipo,
          data: dataIso,
          hora: novaTransacao.hora ?? null,
          bancoId: novaTransacao.bancoId,
          status: novaTransacao.status ?? "concluida",
          categoriaIcone: novaTransacao.categoriaIcone ?? null,
          categoriaId: novaTransacao.categoriaId ?? null,
          identificadorExterno: novaTransacao.identificadorExterno ?? null,
          criadoEm: new Date().toISOString(),
        });

        setTransacoes((prev) => [
          {
            id,
            nome: novaTransacao.nome,
            subtitulo: novaTransacao.subtitulo,
            valor: novaTransacao.valor,
            tipo: novaTransacao.tipo,
            data: dataIsoParaBR(dataIso),
            hora: novaTransacao.hora,
            banco: novaTransacao.banco,
            status: novaTransacao.status ?? "concluida",
            categoriaIcone: novaTransacao.categoriaIcone,
            categoriaId: novaTransacao.categoriaId ?? null,
          },
          ...prev,
        ]);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar transação");
        console.error("[TransacoesContext] Falha ao inserir transação:", e);
        throw e;
      }
    },
    []
  );

  const editarTransacao = useCallback(async (id: string, campos: CamposEditaveis) => {
    const dataIso = normalizarParaIso(campos.data);
    const categoriaResolvida = obterCategoriaPorId(campos.categoriaId ?? undefined);

    try {
      await atualizarTransacao(id, {
        nome: campos.nome,
        subtitulo: campos.subtitulo,
        valor: campos.valor,
        tipo: campos.tipo,
        data: dataIso,
        categoriaIcone: campos.categoriaIcone ?? categoriaResolvida?.icone ?? null,
        categoriaId: campos.categoriaId ?? null,
      });

      setTransacoes((prev) => {
        const transacaoAnterior = prev.find((t) => t.id === id);

        // Categorização manual só "conta como aprendizado" quando a
        // categoria de fato mudou em relação à que estava salva —
        // evita gravar regra toda vez que o usuário só edita o nome
        // ou o valor sem tocar na categoria.
        if (transacaoAnterior) {
          aprenderComEdicaoManual(campos.nome, transacaoAnterior.categoriaId, campos.categoriaId);
        }

        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                nome: campos.nome,
                subtitulo: campos.subtitulo,
                valor: campos.valor,
                tipo: campos.tipo,
                data: dataIsoParaBR(dataIso),
                categoriaIcone: campos.categoriaIcone ?? categoriaResolvida?.icone,
                categoriaId: campos.categoriaId ?? null,
              }
            : t
        );
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao editar transação");
      console.error("[TransacoesContext] Falha ao editar transação:", e);
      throw e;
    }
  }, []);

  const removerTransacao = useCallback(async (id: string) => {
    try {
      await excluirTransacao(id);
      setTransacoes((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir transação");
      console.error("[TransacoesContext] Falha ao excluir transação:", e);
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({
      transacoes,
      carregando,
      erro,
      adicionarTransacao,
      editarTransacao,
      removerTransacao,
      recarregar: carregarDoBanco,
    }),
    [transacoes, carregando, erro, adicionarTransacao, editarTransacao, removerTransacao, carregarDoBanco]
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