import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { AppState } from "react-native";
import {
  listarHistorico,
  contarNaoLidas,
  marcarTodasComoLidas,
  NotificacaoHistorico,
} from "@/database/notificacoesHistoricoQueries";

/**
 * Estado do histórico de notificações locais que o app agendou (ver
 * `database/notificacoesHistoricoQueries.ts`). Alimenta:
 * - o badge vermelho no sino da Home (`naoLidas`);
 * - a tela de histórico (`historico`).
 *
 * O contador de não-lidas é recalculado na abertura do app e toda vez
 * que o app volta do background — uma notificação agendada pode ter
 * disparado enquanto o app estava fechado, e aí ela passa a contar.
 */
type NotificacoesContextValue = {
  historico: NotificacaoHistorico[];
  naoLidas: number;
  carregando: boolean;
  // Recarrega histórico + contador do banco. Chamado pela tela de
  // histórico ao focar e depois de marcar tudo como lido.
  recarregar: () => Promise<void>;
  // Marca como lidas todas as notificações já recebidas e zera o badge.
  // Chamado quando o usuário abre a tela de histórico.
  marcarTodasLidas: () => Promise<void>;
};

const NotificacoesContext = createContext<NotificacoesContextValue | null>(null);

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const [historico, setHistorico] = useState<NotificacaoHistorico[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const [lista, total] = await Promise.all([listarHistorico(), contarNaoLidas()]);
      setHistorico(lista);
      setNaoLidas(total);
    } catch (e) {
      console.error("[NotificacoesContext] Falha ao carregar histórico de notificações:", e);
    }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await marcarTodasComoLidas();
      await recarregar();
    } catch (e) {
      console.error("[NotificacoesContext] Falha ao marcar notificações como lidas:", e);
    }
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    async function inicializar() {
      setCarregando(true);
      try {
        await recarregar();
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    inicializar();
    return () => {
      ativo = false;
    };
  }, [recarregar]);

  // App voltou para o primeiro plano: uma notificação agendada pode ter
  // disparado nesse meio-tempo. Reconta.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void recarregar();
    });
    return () => sub.remove();
  }, [recarregar]);

  const value = useMemo(
    () => ({ historico, naoLidas, carregando, recarregar, marcarTodasLidas }),
    [historico, naoLidas, carregando, recarregar, marcarTodasLidas]
  );

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
}

export function useNotificacoes() {
  const context = useContext(NotificacoesContext);
  if (!context) {
    throw new Error("useNotificacoes precisa ser usado dentro de um NotificacoesProvider");
  }
  return context;
}
