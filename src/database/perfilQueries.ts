import { getDatabase, executarNaFila } from "./database";

export type TemaPreferido = "sistema" | "claro" | "escuro";

export type PerfilUsuario = {
  nome: string;
  email: string | null;
  // Caminho local (file://...) da foto de perfil, já copiada para o
  // diretório de documentos do app. `null` = usa o avatar padrão (ícone).
  avatarUri: string | null;
  // Preferência global de notificações locais (lembretes e vencimentos).
  // `false` impede o app de agendar qualquer notificação nova; alternar
  // para `false` também cancela as já agendadas (ver Preferencias.tsx).
  notificacoesAtivas: boolean;
  // Aparência escolhida na tela de Perfil. "sistema" segue o tema do
  // aparelho; "claro"/"escuro" forçam.
  temaPreferido: TemaPreferido;
  // Pede biometria/PIN do aparelho para abrir o app (migration 25).
  bloqueioAtivo: boolean;
};

/**
 * Lê o perfil local (single-row, id fixo em 1). Retorna valores vazios
 * se ainda não houver nenhum registro — a UI decide o que exibir
 * (placeholder, tela de "complete seu cadastro", etc.), esta função
 * nunca lança erro por "perfil não existe ainda".
 */
export async function obterPerfil(): Promise<PerfilUsuario> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linha = await db.getFirstAsync<{
      nome: string;
      email: string | null;
      avatar_uri: string | null;
      notificacoes_ativas: number | null;
      tema_preferido: string | null;
      bloqueio_ativo: number | null;
    }>(
      `SELECT nome, email, avatar_uri, notificacoes_ativas, tema_preferido, bloqueio_ativo FROM perfil_usuario WHERE id = 1;`
    );
    return {
      nome: linha?.nome ?? "",
      email: linha?.email ?? null,
      avatarUri: linha?.avatar_uri ?? null,
      // Sem linha ainda (primeiro uso) = ativas por padrão, igual ao
      // DEFAULT 1 da coluna.
      notificacoesAtivas: linha?.notificacoes_ativas !== 0,
      temaPreferido:
        linha?.tema_preferido === "claro" || linha?.tema_preferido === "escuro"
          ? linha.tema_preferido
          : "sistema",
      bloqueioAtivo: linha?.bloqueio_ativo === 1,
    };
  });
}

/**
 * Salva (cria ou atualiza) o perfil local. UPSERT com id fixo em 1
 * garante que nunca existe mais de uma linha — coerente com o app
 * sendo single-user local, sem sistema de contas.
 */
export async function salvarPerfil(perfil: PerfilUsuario): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO perfil_usuario (id, nome, email, avatar_uri, notificacoes_ativas, tema_preferido, bloqueio_ativo)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome,
         email = excluded.email,
         avatar_uri = excluded.avatar_uri,
         notificacoes_ativas = excluded.notificacoes_ativas,
         tema_preferido = excluded.tema_preferido,
         bloqueio_ativo = excluded.bloqueio_ativo,
         atualizado_em = datetime('now');`,
      [
        perfil.nome,
        perfil.email,
        perfil.avatarUri,
        perfil.notificacoesAtivas ? 1 : 0,
        perfil.temaPreferido,
        perfil.bloqueioAtivo ? 1 : 0,
      ]
    );
  });
}
