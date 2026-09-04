import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { obterPerfil, salvarPerfil, PerfilUsuario } from "@/database/perfilQueries";

type PerfilContextValue = {
  perfil: PerfilUsuario;
  carregando: boolean;
  erro: string | null;
  // Aceita um patch parcial: os campos ausentes mantêm o valor atual.
  // Assim o form de nome/e-mail não precisa reenviar o avatar, e a
  // troca de foto não precisa reenviar nome/e-mail.
  atualizarPerfil: (patch: Partial<PerfilUsuario>) => Promise<void>;
};

const PERFIL_VAZIO: PerfilUsuario = { nome: "", email: null, avatarUri: null };

const PerfilContext = createContext<PerfilContextValue | null>(null);

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilUsuario>(PERFIL_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Espelho sempre atualizado de `perfil`, para o patch em atualizarPerfil
  // mesclar sobre o estado corrente sem re-criar o callback.
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      try {
        setErro(null);
        const dados = await obterPerfil();
        if (ativo) setPerfil(dados);
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar perfil");
        console.error("[PerfilContext] Falha ao carregar perfil:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  // Persiste no SQLite e atualiza o estado em memória junto — assim
  // qualquer tela que leia do PerfilContext (Home, Perfil, etc.) vê a
  // mudança na hora, sem precisar recarregar/remontar.
  const atualizarPerfil = useCallback(
    async (patch: Partial<PerfilUsuario>) => {
      // `perfilRef` sempre aponta para o estado mais recente — evita
      // depender de `perfil` no array de deps (que recriaria o callback
      // a cada edição e invalidaria memoizações de quem o consome).
      const mesclado = { ...perfilRef.current, ...patch };
      try {
        await salvarPerfil(mesclado);
        setPerfil(mesclado);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar perfil");
        console.error("[PerfilContext] Falha ao salvar perfil:", e);
        throw e;
      }
    },
    []
  );

  const value = useMemo(
    () => ({ perfil, carregando, erro, atualizarPerfil }),
    [perfil, carregando, erro, atualizarPerfil]
  );

  return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}

export function usePerfil() {
  const context = useContext(PerfilContext);
  if (!context) {
    throw new Error("usePerfil precisa ser usado dentro de um PerfilProvider");
  }
  return context;
}