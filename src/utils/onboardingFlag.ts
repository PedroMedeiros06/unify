import { File, Paths } from "expo-file-system";

/**
 * Marca se o usuário já passou pelo onboarding (slides + cadastro) na
 * primeira abertura do app.
 *
 * Guardado como um arquivo-flag vazio no diretório de documentos, em
 * vez de AsyncStorage (dependência a mais) ou de uma coluna no SQLite.
 * Consequência: "Apagar dados do app" (que dropa as tabelas mas não
 * mexe neste arquivo) NÃO refaz o onboarding — o usuário que já se
 * cadastrou não é obrigado a repetir. Só desinstalar o app zera isto.
 */

const ARQUIVO_FLAG = "onboarding.done";

function arquivo(): File {
  return new File(Paths.document, ARQUIVO_FLAG);
}

export async function onboardingConcluido(): Promise<boolean> {
  try {
    return arquivo().exists;
  } catch {
    // Em caso de erro de acesso, trata como "não concluído" — no pior
    // caso o usuário vê o onboarding de novo, que é recuperável;
    // pular por engano não seria.
    return false;
  }
}

export async function marcarOnboardingConcluido(): Promise<void> {
  try {
    const f = arquivo();
    if (!f.exists) {
      f.create();
      f.write("");
    }
  } catch (e) {
    // Não bloqueia a entrada no app se a gravação falhar — só faz o
    // onboarding poder reaparecer numa próxima abertura.
    console.warn("[onboardingFlag] não foi possível gravar a flag:", e);
  }
}
