import * as LocalAuthentication from "expo-local-authentication";

/**
 * Bloqueio do app com a segurança do PRÓPRIO aparelho: biometria
 * (digital/rosto) e, como alternativa, o PIN/padrão/senha da tela de
 * bloqueio. O app não guarda senha nenhuma — se o aparelho não tem
 * nenhuma trava configurada, o bloqueio não pode ser ligado.
 */

export type DisponibilidadeBloqueio =
  | { disponivel: true; temBiometria: boolean }
  | { disponivel: false; motivo: string };

export async function verificarDisponibilidadeBloqueio(): Promise<DisponibilidadeBloqueio> {
  try {
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    if (nivel === LocalAuthentication.SecurityLevel.NONE) {
      return {
        disponivel: false,
        motivo: "Configure uma senha, PIN, padrão ou biometria na tela de bloqueio do aparelho primeiro.",
      };
    }
    const temBiometria =
      nivel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK ||
      nivel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;
    return { disponivel: true, temBiometria };
  } catch {
    return { disponivel: false, motivo: "Não foi possível acessar a segurança do aparelho." };
  }
}

/** Pede a autenticação. true = liberado. Nunca lança. */
export async function autenticar(mensagem = "Desbloquear o Unify"): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: mensagem,
      cancelLabel: "Cancelar",
      // Sem biometria (ou se falhar), deixa usar o PIN/padrão do aparelho.
      disableDeviceFallback: false,
    });
    return r.success;
  } catch {
    return false;
  }
}
