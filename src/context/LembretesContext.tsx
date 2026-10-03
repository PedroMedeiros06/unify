import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  listarLembretes,
  inserirLembrete,
  atualizarLembrete,
  atualizarNotificacaoIdLembrete,
  excluirLembrete,
  Lembrete,
  CamposLembrete,
} from "@/database/lembretesQueries";
import { agendarNotificacaoLembrete, cancelarNotificacao } from "@/database/notificacoes";
import { dataHojeIso } from "@/utils/dateUtils";

type LembretesContextValue = {
  lembretes: Lembrete[];
  carregando: boolean;
  erro: string | null;
  adicionarLembrete: (campos: CamposLembrete) => Promise<void>;
  editarLembrete: (id: string, campos: CamposLembrete) => Promise<void>;
  removerLembrete: (id: string) => Promise<void>;
  // Reaplica o estado de notificação de TODOS os lembretes conforme
  // `ativar`: true reagenda os com data/hora ainda no futuro; false
  // cancela tudo que estiver agendado. Chamado pelo toggle global de
  // notificações em Preferencias.tsx.
  ressincronizarNotificacoes: (ativar: boolean) => Promise<void>;
};

const LembretesContext = createContext<LembretesContextValue | null>(null);

export function LembretesProvider({ children }: { children: ReactNode }) {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await listarLembretes();
      setLembretes(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar lembretes");
      console.error("[LembretesContext] Falha ao carregar lembretes:", e);
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

  const ordenar = (lista: Lembrete[]) =>
    [...lista].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const adicionarLembrete = useCallback(async (campos: CamposLembrete) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const notificacaoId = await agendarNotificacaoLembrete(
        campos.titulo,
        campos.descricao,
        campos.data,
        campos.hora,
        id
      );

      await inserirLembrete(id, campos, notificacaoId);
      setLembretes((prev) =>
        ordenar([...prev, { id, ...campos, notificacaoId, criadoEm: new Date().toISOString() }])
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar lembrete");
      throw e;
    }
  }, []);

  const editarLembrete = useCallback(
    async (id: string, campos: CamposLembrete) => {
      const atual = lembretes.find((l) => l.id === id);

      try {
        await cancelarNotificacao(atual?.notificacaoId ?? null);
        const novaNotificacaoId = await agendarNotificacaoLembrete(
          campos.titulo,
          campos.descricao,
          campos.data,
          campos.hora,
          id
        );

        await atualizarLembrete(id, campos, novaNotificacaoId);
        setLembretes((prev) =>
          ordenar(
            prev.map((l) => (l.id === id ? { ...l, ...campos, notificacaoId: novaNotificacaoId } : l))
          )
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao editar lembrete");
        throw e;
      }
    },
    [lembretes]
  );

  const removerLembrete = useCallback(
    async (id: string) => {
      const atual = lembretes.find((l) => l.id === id);

      try {
        await cancelarNotificacao(atual?.notificacaoId ?? null);
        await excluirLembrete(id);
        setLembretes((prev) => prev.filter((l) => l.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir lembrete");
        throw e;
      }
    },
    [lembretes]
  );

  const ressincronizarNotificacoes = useCallback(
    async (ativar: boolean) => {
      const agora = new Date();
      // Data LOCAL — `toISOString()` é UTC e, depois das 21h no Brasil,
      // já devolve o dia seguinte (os lembretes de amanhã antes da hora
      // atual deixavam de ser reagendados).
      const hojeIso = dataHojeIso();
      const horaAgora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
      const atualizacoes = new Map<string, string | null>();

      for (const l of lembretes) {
        if (ativar) {
          const noFuturo = l.data > hojeIso || (l.data === hojeIso && l.hora > horaAgora);
          if (!noFuturo || l.notificacaoId) continue;
          const novoId = await agendarNotificacaoLembrete(l.titulo, l.descricao, l.data, l.hora, l.id);
          if (novoId) atualizacoes.set(l.id, novoId);
        } else {
          if (!l.notificacaoId) continue;
          await cancelarNotificacao(l.notificacaoId);
          atualizacoes.set(l.id, null);
        }
      }

      if (atualizacoes.size === 0) return;

      for (const [id, notifId] of atualizacoes) {
        await atualizarNotificacaoIdLembrete(id, notifId);
      }
      setLembretes((prev) =>
        prev.map((l) => (atualizacoes.has(l.id) ? { ...l, notificacaoId: atualizacoes.get(l.id) ?? null } : l))
      );
    },
    [lembretes]
  );

  const value = useMemo(
    () => ({
      lembretes,
      carregando,
      erro,
      adicionarLembrete,
      editarLembrete,
      removerLembrete,
      ressincronizarNotificacoes,
    }),
    [lembretes, carregando, erro, adicionarLembrete, editarLembrete, removerLembrete, ressincronizarNotificacoes]
  );

  return <LembretesContext.Provider value={value}>{children}</LembretesContext.Provider>;
}

export function useLembretes() {
  const context = useContext(LembretesContext);
  if (!context) {
    throw new Error("useLembretes precisa ser usado dentro de um LembretesProvider");
  }
  return context;
}
