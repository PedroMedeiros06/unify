import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarCompromissos,
  inserirCompromisso,
  atualizarCompromisso,
  atualizarNotificacaoIdCompromisso,
  vincularCompromissoATransacao,
  desvincularCompromissoDaTransacao,
  excluirCompromisso,
  Compromisso,
  CamposCompromisso,
} from "@/database/compromissosQueries";
import { agendarNotificacaoVencimento, cancelarNotificacao } from "@/database/notificacoes";
import { dataHojeIso } from "@/utils/dateUtils";

type CompromissosContextValue = {
  compromissos: Compromisso[];
  carregando: boolean;
  erro: string | null;
  adicionarCompromisso: (campos: CamposCompromisso) => Promise<void>;
  editarCompromisso: (id: string, campos: CamposCompromisso) => Promise<void>;
  // "Pagar" = vincular o compromisso a uma transação real (a UI cria ou
  // escolhe essa transação antes de chamar). Desmarcar só remove o
  // vínculo — a transação em si permanece.
  pagarCompromissoComTransacao: (id: string, transacaoId: string) => Promise<void>;
  desmarcarPagoCompromisso: (id: string) => Promise<void>;
  removerCompromisso: (id: string) => Promise<void>;
  // Reaplica o estado de notificação de TODOS os compromissos conforme
  // `ativar`: true reagenda os pendentes com vencimento futuro; false
  // cancela tudo que estiver agendado. Chamado pelo toggle global de
  // notificações em Preferencias.tsx (a preferência em si é gravada
  // lá).
  ressincronizarNotificacoes: (ativar: boolean) => Promise<void>;
  // Relê do banco. Necessário quando um compromisso muda por FORA deste
  // contexto — ex: a transação vinculada é excluída e o ON DELETE SET
  // NULL devolve o compromisso a "não pago" direto no SQLite.
  recarregar: () => Promise<void>;
};

const CompromissosContext = createContext<CompromissosContextValue | null>(null);

export function CompromissosProvider({ children }: { children: ReactNode }) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarCompromissos();
      setCompromissos(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar compromissos");
      console.error("[CompromissosContext] Falha ao carregar compromissos:", e);
    }
  }, []);

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

  const adicionarCompromisso = useCallback(async (campos: CamposCompromisso) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const notificacaoId = await agendarNotificacaoVencimento(
        campos.nome,
        campos.valor,
        campos.dataVencimento,
        id
      );

      await inserirCompromisso(id, campos, notificacaoId);
      setCompromissos((prev) =>
        [
          ...prev,
          { id, ...campos, pago: false, transacaoId: null, notificacaoId, criadoEm: new Date().toISOString() },
        ].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar compromisso");
      throw e;
    }
  }, []);

  const editarCompromisso = useCallback(
    async (id: string, campos: CamposCompromisso) => {
      const compromissoAtual = compromissos.find((c) => c.id === id);

      try {
        await cancelarNotificacao(compromissoAtual?.notificacaoId ?? null);
        // Compromisso já pago (tem transação vinculada) não recebe aviso
        // de vencimento — editar nome/valor/data dele não pode reagendar
        // um "Compromisso vence hoje" para uma conta já quitada.
        const novaNotificacaoId = compromissoAtual?.pago
          ? null
          : await agendarNotificacaoVencimento(campos.nome, campos.valor, campos.dataVencimento, id);

        await atualizarCompromisso(id, campos, novaNotificacaoId);
        setCompromissos((prev) =>
          prev
            .map((c) => (c.id === id ? { ...c, ...campos, notificacaoId: novaNotificacaoId } : c))
            .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const pagarCompromissoComTransacao = useCallback(
    async (id: string, transacaoId: string) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        // Já existe uma transação real cobrindo esse compromisso — a
        // notificação de vencimento não faz mais sentido.
        if (compromisso?.notificacaoId) {
          await cancelarNotificacao(compromisso.notificacaoId);
        }

        await vincularCompromissoATransacao(id, transacaoId);
        setCompromissos((prev) =>
          prev.map((c) => (c.id === id ? { ...c, transacaoId, pago: true, notificacaoId: null } : c))
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao registrar pagamento do compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const desmarcarPagoCompromisso = useCallback(
    async (id: string) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        await desvincularCompromissoDaTransacao(id);

        // Voltou a ficar pendente: o aviso de vencimento (cancelado ao
        // pagar) volta a fazer sentido. `agendarNotificacaoVencimento` já
        // devolve null se a data passou ou se o usuário desligou as
        // notificações.
        const notificacaoId = compromisso
          ? await agendarNotificacaoVencimento(compromisso.nome, compromisso.valor, compromisso.dataVencimento, id)
          : null;
        if (notificacaoId) await atualizarNotificacaoIdCompromisso(id, notificacaoId);

        setCompromissos((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, transacaoId: null, pago: false, notificacaoId: notificacaoId ?? c.notificacaoId } : c
          )
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao remover pagamento do compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const removerCompromisso = useCallback(
    async (id: string) => {
      const compromisso = compromissos.find((c) => c.id === id);

      try {
        await cancelarNotificacao(compromisso?.notificacaoId ?? null);
        await excluirCompromisso(id);
        setCompromissos((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir compromisso");
        throw e;
      }
    },
    [compromissos]
  );

  const ressincronizarNotificacoes = useCallback(
    async (ativar: boolean) => {
      // Data LOCAL — `toISOString()` é UTC e vira o dia seguinte depois
      // das 21h no Brasil.
      const hojeIso = dataHojeIso();
      const atualizacoes = new Map<string, string | null>();

      for (const c of compromissos) {
        if (ativar) {
          // Só faz sentido (re)agendar para compromissos ainda não
          // pagos e com vencimento no futuro. `agendarNotificacaoVencimento`
          // já lê a preferência global — que a essa altura Preferencias.tsx
          // já gravou como `true` —, agenda e registra no histórico.
          if (c.pago || c.dataVencimento < hojeIso || c.notificacaoId) continue;
          const novoId = await agendarNotificacaoVencimento(c.nome, c.valor, c.dataVencimento, c.id);
          if (novoId) atualizacoes.set(c.id, novoId);
        } else {
          if (!c.notificacaoId) continue;
          await cancelarNotificacao(c.notificacaoId);
          atualizacoes.set(c.id, null);
        }
      }

      if (atualizacoes.size === 0) return;

      for (const [id, notifId] of atualizacoes) {
        await atualizarNotificacaoIdCompromisso(id, notifId);
      }
      setCompromissos((prev) =>
        prev.map((c) => (atualizacoes.has(c.id) ? { ...c, notificacaoId: atualizacoes.get(c.id) ?? null } : c))
      );
    },
    [compromissos]
  );

  const value = useMemo(
    () => ({
      compromissos,
      carregando,
      erro,
      adicionarCompromisso,
      editarCompromisso,
      pagarCompromissoComTransacao,
      desmarcarPagoCompromisso,
      removerCompromisso,
      ressincronizarNotificacoes,
      recarregar: carregar,
    }),
    [
      compromissos,
      carregando,
      erro,
      adicionarCompromisso,
      editarCompromisso,
      pagarCompromissoComTransacao,
      desmarcarPagoCompromisso,
      removerCompromisso,
      ressincronizarNotificacoes,
      carregar,
    ]
  );

  return <CompromissosContext.Provider value={value}>{children}</CompromissosContext.Provider>;
}

export function useCompromissos() {
  const context = useContext(CompromissosContext);
  if (!context) {
    throw new Error("useCompromissos precisa ser usado dentro de um CompromissosProvider");
  }
  return context;
}
