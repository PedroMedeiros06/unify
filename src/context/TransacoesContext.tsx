import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  inserirTransacao,
  inserirTransacoesEmLote,
  atualizarTransacao,
  excluirTransacao,
  garantirBancosSuportados,
  obterCategoriaDaTransacao,
  Transacao as TransacaoBanco,
  TransacaoComBanco,
} from "@/database/queries";
import { dataIsoParaBR, dataBRParaIso } from "@/utils/dateUtils";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { normalizarPadraoDescricao } from "@/database/categorizacao";
import { salvarRegraCategorizacao } from "@/database/regrasAprendidasQueries";
import { obterVinculoDaTransacao, ajustarVinculoAposEdicaoDeValor } from "@/database/metaTransacoesQueries";
import { verificarAlertasOrcamento } from "@/database/alertasAutomaticos";

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
  // Só nas transações lidas do banco (mapearParaTransacaoUI): conta da
  // transação e, se for uma perna de transferência, o id que liga as duas.
  bancoId?: string;
  transferenciaId?: string | null;
};

export type NovaTransacaoInput = Omit<Transacao, "id"> & {
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

/**
 * O contexto NÃO guarda mais a lista completa de transações em memória
 * (antes carregava TODAS no boot — com milhares de linhas, pesava no
 * boot e a cada escrita re-renderizava todo consumidor). Cada tela
 * busca só o recorte que precisa (`listarTransacoesFiltradas`, com
 * LIMIT) e usa `versaoDados` como gatilho de recarga. Este contexto é
 * agora só a porta única de ESCRITA + o sinal de mudança.
 */
type TransacoesContextValue = {
  // true até os bancos suportados estarem garantidos no banco (FK de
  // transacoes.banco_id) — antes disso não dá para inserir.
  carregando: boolean;
  erro: string | null;
  // Retorna o id gerado da transação recém-inserida — usado por fluxos
  // que precisam criar algo dependente logo em seguida (ex: vincular a
  // transação importada a uma meta). Quem não precisa do id só ignora
  // o retorno.
  adicionarTransacao: (transacao: NovaTransacaoInput) => Promise<string>;
  // Insere várias de uma vez numa única transação SQL e sinaliza
  // mudança UMA vez só (importação de extrato). Tudo ou nada: se uma
  // linha falhar, nenhuma é gravada. Retorna os ids na mesma ordem.
  adicionarTransacoesEmLote: (transacoes: NovaTransacaoInput[]) => Promise<string[]>;
  editarTransacao: (id: string, campos: CamposEditaveis) => Promise<void>;
  removerTransacao: (id: string) => Promise<void>;
  // Sinaliza que transações mudaram por FORA deste contexto — força as
  // telas a reconsultarem.
  recarregar: () => Promise<void>;
  // Contador que sobe a cada escrita de transação (inserir, editar,
  // excluir, recarregar). Componentes que consultam o banco DIRETO
  // (saldo, gráficos, cards do Orçamento) colocam isto nas deps do seu
  // useEffect de carga — senão continuavam mostrando o valor antigo
  // depois de uma transação criada pelo modal global sem trocar de tela.
  versaoDados: number;
  // Deve ser chamada pela UI (EditarTransacaoModal) ANTES de chamar
  // editarTransacao, quando a transação tem um vínculo com meta — para
  // saber se precisa mostrar uma confirmação de "isso vai afetar o
  // vínculo" quando o tipo (entrada/saída) está mudando.
  verificarImpactoNoVinculo: (id: string, novoTipo: "entrada" | "saida") => Promise<ImpactoNoVinculo>;
};

const TransacoesContext = createContext<TransacoesContextValue | null>(null);

/** Linha do banco (com banco resolvido) -> formato de exibição. Compartilhado pelas telas que listam transações. */
export function mapearParaTransacaoUI(t: TransacaoComBanco): Transacao {
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
    bancoId: t.banco.id,
    transferenciaId: t.transferenciaId ?? null,
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

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Input da UI (data dd/mm/aaaa ou ISO) -> linha pronta para o banco. */
function paraLinhaBanco(id: string, t: NovaTransacaoInput): TransacaoBanco {
  return {
    id,
    nome: t.nome,
    subtitulo: t.subtitulo,
    valor: t.valor,
    tipo: t.tipo,
    data: normalizarParaIso(t.data),
    hora: t.hora ?? null,
    bancoId: t.bancoId,
    status: t.status ?? "concluida",
    categoriaIcone: t.categoriaIcone ?? null,
    categoriaId: t.categoriaId ?? null,
    identificadorExterno: t.identificadorExterno ?? null,
    criadoEm: new Date().toISOString(),
  };
}

export function TransacoesProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versaoDados, setVersaoDados] = useState(0);
  const sinalizarMudanca = useCallback(() => setVersaoDados((v) => v + 1), []);

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      setCarregando(true);
      try {
        await garantirBancosSuportados();
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao preparar bancos");
        console.error("[TransacoesContext] Falha ao garantir bancos:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    inicializar();

    return () => {
      ativo = false;
    };
  }, []);

  const recarregar = useCallback(async () => {
    sinalizarMudanca();
  }, [sinalizarMudanca]);

  const adicionarTransacao = useCallback(
    async (novaTransacao: NovaTransacaoInput) => {
      const id = gerarId();
      try {
        await inserirTransacao(paraLinhaBanco(id, novaTransacao));
        sinalizarMudanca();
        // Alerta de limite do orçamento (80%/100%) — em segundo plano.
        void verificarAlertasOrcamento();
        return id;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar transação");
        console.error("[TransacoesContext] Falha ao inserir transação:", e);
        throw e;
      }
    },
    [sinalizarMudanca]
  );

  const adicionarTransacoesEmLote = useCallback(
    async (novas: NovaTransacaoInput[]) => {
      if (novas.length === 0) return [];
      // Sufixo pelo índice: várias linhas criadas no mesmo milissegundo.
      const linhas = novas.map((t, i) => paraLinhaBanco(`${gerarId()}-${i}`, t));
      try {
        await inserirTransacoesEmLote(linhas);
        sinalizarMudanca();
        // Alerta de limite do orçamento (80%/100%) — em segundo plano.
        void verificarAlertasOrcamento();
        return linhas.map((l) => l.id);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar transações");
        console.error("[TransacoesContext] Falha ao inserir lote de transações:", e);
        throw e;
      }
    },
    [sinalizarMudanca]
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

  const editarTransacao = useCallback(
    async (id: string, campos: CamposEditaveis) => {
      const dataIso = normalizarParaIso(campos.data);
      const categoriaResolvida = obterCategoriaPorId(campos.categoriaId ?? undefined);

      try {
        // Categoria ANTES da edição, lida do banco — sem a lista em
        // memória, é assim que sabemos se o usuário de fato trocou a
        // categoria (só então vira regra aprendida).
        const categoriaAnterior = await obterCategoriaDaTransacao(id);

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

        aprenderComEdicaoManual(campos.nome, categoriaAnterior, campos.categoriaId);
        sinalizarMudanca();
        // Alerta de limite do orçamento (80%/100%) — em segundo plano.
        void verificarAlertasOrcamento();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar transação");
        console.error("[TransacoesContext] Falha ao editar transação:", e);
        throw e;
      }
    },
    [sinalizarMudanca]
  );

  const removerTransacao = useCallback(
    async (id: string) => {
      try {
        // Não precisa chamar desvincularTodosDaTransacao explicitamente
        // aqui — ON DELETE CASCADE em meta_transacoes.transacao_id (ver
        // migrations.ts, migration 8) remove o vínculo automaticamente
        // no nível do banco quando a transação é excluída, desde que
        // PRAGMA foreign_keys esteja ativo (ver database.ts).
        await excluirTransacao(id);
        sinalizarMudanca();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir transação");
        console.error("[TransacoesContext] Falha ao excluir transação:", e);
        throw e;
      }
    },
    [sinalizarMudanca]
  );

  const value = useMemo(
    () => ({
      carregando,
      erro,
      adicionarTransacao,
      adicionarTransacoesEmLote,
      editarTransacao,
      removerTransacao,
      recarregar,
      versaoDados,
      verificarImpactoNoVinculo,
    }),
    [
      carregando,
      erro,
      adicionarTransacao,
      adicionarTransacoesEmLote,
      editarTransacao,
      removerTransacao,
      recarregar,
      versaoDados,
      verificarImpactoNoVinculo,
    ]
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