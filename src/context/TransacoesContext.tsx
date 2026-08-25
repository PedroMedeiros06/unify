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
import { obterVinculoDaTransacao, ajustarVinculoAposEdicaoDeValor } from "@/database/metaTransacoesQueries";

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

/**
 * Resultado de checar, ANTES de persistir uma edição, se ela afeta um
 * vínculo com meta existente. `mudaSinal` é o único caso que exige
 * decisão do usuário (ver EditarTransacaoModal) — os outros casos
 * (valor menor com mesmo sinal, ou sem vínculo algum) são resolvidos
 * automaticamente por ajustarVinculoAposEdicaoDeValor, sem precisar de
 * confirmação.
 */
export type ImpactoNoVinculo = {
  temVinculo: boolean;
  metaNome: string | null;
  mudaSinal: boolean;
};

type TransacoesContextValue = {
  transacoes: Transacao[];
  carregando: boolean;
  erro: string | null;
  adicionarTransacao: (transacao: NovaTransacaoInput) => Promise<void>;
  editarTransacao: (id: string, campos: CamposEditaveis) => Promise<void>;
  removerTransacao: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
  // Deve ser chamada pela UI (EditarTransacaoModal) ANTES de chamar
  // editarTransacao, quando a transação tem um vínculo com meta — para
  // saber se precisa mostrar uma confirmação de "isso vai afetar o
  // vínculo" quando o tipo (entrada/saída) está mudando.
  verificarImpactoNoVinculo: (id: string, novoTipo: "entrada" | "saida") => Promise<ImpactoNoVinculo>;
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

  // Consultada pela UI antes de confirmar uma edição — não altera nada,
  // só informa se a transação tem vínculo e se a mudança de tipo
  // pedida representaria uma troca de sinal (positivo↔negativo) do
  // valor vinculado, caso em que EditarTransacaoModal precisa pedir
  // confirmação explícita ao usuário antes de prosseguir.
  const verificarImpactoNoVinculo = useCallback(
    async (id: string, novoTipo: "entrada" | "saida"): Promise<ImpactoNoVinculo> => {
      const vinculo = await obterVinculoDaTransacao(id);
      if (!vinculo) {
        return { temVinculo: false, metaNome: null, mudaSinal: false };
      }

      const sinalVinculoAtual = vinculo.valorVinculado >= 0 ? "entrada" : "saida";
      return {
        temVinculo: true,
        metaNome: vinculo.metaNome,
        mudaSinal: sinalVinculoAtual !== novoTipo,
      };
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

      // Regra de edição de transação vinculada (ver metaTransacoesQueries.ts):
      // - EditarTransacaoModal já deve ter tratado o caso de MUDANÇA DE
      //   SINAL antes de chegar aqui (via verificarImpactoNoVinculo +
      //   confirmação do usuário, possivelmente removendo o vínculo
      //   com desvincularTodosDaTransacao antes de chamar editarTransacao);
      // - o que falta resolver aqui é o clamp automático para o caso de
      //   MESMO SINAL com valor menor — que não exige confirmação e é
      //   sempre seguro aplicar.
      await ajustarVinculoAposEdicaoDeValor(id, campos.valor);

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
      // Não precisa chamar desvincularTodosDaTransacao explicitamente
      // aqui — ON DELETE CASCADE em meta_transacoes.transacao_id (ver
      // migrations.ts, migration 8) remove o vínculo automaticamente
      // no nível do banco quando a transação é excluída, desde que
      // PRAGMA foreign_keys esteja ativo (ver database.ts).
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
      verificarImpactoNoVinculo,
    }),
    [transacoes, carregando, erro, adicionarTransacao, editarTransacao, removerTransacao, carregarDoBanco, verificarImpactoNoVinculo]
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