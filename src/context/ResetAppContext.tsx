import { createContext, Fragment, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { Directory, Paths } from "expo-file-system";
import { apagarTodosOsDados } from "@/database/database";

// Remove arquivos que o app guarda FORA do SQLite e que "apagar dados"
// também deve zerar. Por enquanto: a pasta de fotos de perfil.
function limparArquivosDoUsuario() {
  try {
    const dir = new Directory(Paths.document, "perfil");
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn("[ResetApp] não foi possível apagar arquivos do usuário (ignorado):", e);
  }
}

type ResetAppContextValue = {
  // true enquanto o banco está sendo apagado / recriado.
  apagando: boolean;
  // Apaga todos os dados locais e força a remontagem da árvore de
  // providers abaixo, para que os contextos releiam o banco já vazio.
  apagarDadosDoApp: () => Promise<void>;
  // Só força a remontagem da subárvore de providers de dados, sem tocar
  // no banco. Usado depois de uma restauração de backup (o banco já foi
  // reescrito por fora) para as telas relerem o conteúdo novo.
  remontarDados: () => void;
};

const ResetAppContext = createContext<ResetAppContextValue | null>(null);

/**
 * O Unify não tem login/conta — não existe "sair da conta", só zerar o
 * app local. Este provider expõe essa ação e a executa remontando tudo
 * que está abaixo dele: ao trocar a `key` do wrapper, React descarta a
 * subárvore inteira e a recria, então cada Provider de dados roda seu
 * efeito de carga de novo e enxerga o banco recém-esvaziado, sem
 * precisar reiniciar o processo (não usamos expo-updates).
 *
 * Precisa ficar ACIMA de todos os providers de dados no _layout, e
 * abaixo do NavigationProvider (a navegação não depende do banco e não
 * deve ser remontada — o usuário continua na tela de Perfil enquanto o
 * reset acontece).
 */
export function ResetAppProvider({ children }: { children: ReactNode }) {
  const [chaveRemontagem, setChaveRemontagem] = useState(0);
  const [apagando, setApagando] = useState(false);

  const apagarDadosDoApp = useCallback(async () => {
    setApagando(true);
    try {
      await apagarTodosOsDados();
      limparArquivosDoUsuario();
      // Só remonta depois que o banco vazio já foi recriado, senão os
      // contextos remontam e consultam um banco ainda em transição.
      setChaveRemontagem((chave) => chave + 1);
    } finally {
      setApagando(false);
    }
  }, []);

  const remontarDados = useCallback(() => {
    setChaveRemontagem((chave) => chave + 1);
  }, []);

  const value = useMemo(
    () => ({ apagando, apagarDadosDoApp, remontarDados }),
    [apagando, apagarDadosDoApp, remontarDados]
  );

  return (
    <ResetAppContext.Provider value={value}>
      {/* key força o descarte e a recriação de toda a subárvore de
          providers de dados quando o reset acontece. */}
      <Fragment key={chaveRemontagem}>{children}</Fragment>
    </ResetAppContext.Provider>
  );
}

export function useResetApp() {
  const context = useContext(ResetAppContext);
  if (!context) {
    throw new Error("useResetApp precisa ser usado dentro de um ResetAppProvider");
  }
  return context;
}
