import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { AppState } from "react-native";
import {
  listarLembretes,
  inserirLembrete,
  atualizarLembrete,
  atualizarNotificacaoIdLembrete,
  excluirLembrete,
  avancarLembrete,
  diaBaseDe,
  Lembrete,
  CamposLembrete,
} from "@/database/lembretesQueries";
import { primeiraOcorrenciaFutura } from "@/utils/repeticaoLembrete";
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

/**
 * Lembretes repetidos cuja ocorrência atual já passou: avança `data`
 * para a próxima ocorrência futura e reagenda a janela de notificações
 * a partir dela. As notificações que já dispararam ficam no histórico;
 * as ainda pendentes da janela antiga são canceladas e reagendadas
 * (mesmas datas, ids novos). Devolve a lista atualizada.
 */
async function avancarRepetidosVencidos(lista: Lembrete[]): Promise<Lembrete[]> {
  let mudou = false;
  const resultado: Lembrete[] = [];
  for (const l of lista) {
    if (l.repeticao === "nenhuma") {
      resultado.push(l);
      continue;
    }
    const novaData = primeiraOcorrenciaFutura(l.data, l.hora, l.repeticao, l.diaBase);
    if (novaData === l.data) {
      resultado.push(l);
      continue;
    }
    await cancelarNotificacao(l.notificacaoId);
    const ids = await agendarNotificacaoLembrete(l.titulo, l.descricao, novaData, l.hora, l.id, l.repeticao, l.diaBase);
    await avancarLembrete(l.id, novaData, ids);
    resultado.push({ ...l, data: novaData, notificacaoId: ids });
    mudou = true;
  }
  return mudou ? resultado : lista;
}

function ordenarLembretes(lista: Lembrete[]): Lembrete[] {
  return [...lista].sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
}

export function LembretesProvider({ children }: { children: ReactNode }) {
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const dados = await avancarRepetidosVencidos(await listarLembretes());
      setLembretes(ordenarLembretes(dados));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar lembretes");
      console.error("[LembretesContext] Falha ao carregar lembretes:", e);
    }
  }, []);

  // Ao voltar do background, uma ocorrência de lembrete repetido pode
  // ter passado enquanto o app estava fechado — avança e reagenda.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void carregar();
    });
    return () => sub.remove();
  }, [carregar]);

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

  const adicionarLembrete = useCallback(async (camposInformados: CamposLembrete) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Repetido com data inicial já passada: começa na próxima ocorrência
    // (o dia_base continua sendo o da data escolhida).
    const diaBase = diaBaseDe(camposInformados);
    const campos = {
      ...camposInformados,
      data: primeiraOcorrenciaFutura(camposInformados.data, camposInformados.hora, camposInformados.repeticao, diaBase),
    };

    try {
      const notificacaoId = await agendarNotificacaoLembrete(
        campos.titulo,
        campos.descricao,
        campos.data,
        campos.hora,
        id,
        campos.repeticao,
        diaBase
      );

      // dia_base sai da data ESCOLHIDA; depois avança para a ocorrência futura.
      await inserirLembrete(id, camposInformados, notificacaoId);
      if (campos.data !== camposInformados.data) await avancarLembrete(id, campos.data, notificacaoId);
      setLembretes((prev) =>
        ordenarLembretes([...prev, { id, ...campos, diaBase, notificacaoId, criadoEm: new Date().toISOString() }])
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar lembrete");
      throw e;
    }
  }, []);

  const editarLembrete = useCallback(
    async (id: string, camposInformados: CamposLembrete) => {
      const atual = lembretes.find((l) => l.id === id);
      const diaBase = diaBaseDe(camposInformados);
      const campos = {
        ...camposInformados,
        data: primeiraOcorrenciaFutura(camposInformados.data, camposInformados.hora, camposInformados.repeticao, diaBase),
      };

      try {
        await cancelarNotificacao(atual?.notificacaoId ?? null);
        const novaNotificacaoId = await agendarNotificacaoLembrete(
          campos.titulo,
          campos.descricao,
          campos.data,
          campos.hora,
          id,
          campos.repeticao,
          diaBase
        );

        // dia_base sai da data ESCOLHIDA (antes de avançar).
        await atualizarLembrete(id, camposInformados, novaNotificacaoId);
        if (campos.data !== camposInformados.data) await avancarLembrete(id, campos.data, novaNotificacaoId);
        setLembretes((prev) =>
          ordenarLembretes(
            prev.map((l) => (l.id === id ? { ...l, ...campos, diaBase, notificacaoId: novaNotificacaoId } : l))
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
          const novoId = await agendarNotificacaoLembrete(l.titulo, l.descricao, l.data, l.hora, l.id, l.repeticao, l.diaBase);
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
