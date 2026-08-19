import { getDatabase, executarNaFila } from "./database";

export type PerfilUsuario = {
  nome: string;
  email: string | null;
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
    const linha = await db.getFirstAsync<{ nome: string; email: string | null }>(
      `SELECT nome, email FROM perfil_usuario WHERE id = 1;`
    );
    return { nome: linha?.nome ?? "", email: linha?.email ?? null };
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
      `INSERT INTO perfil_usuario (id, nome, email)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome,
         email = excluded.email,
         atualizado_em = datetime('now');`,
      [perfil.nome, perfil.email]
    );
  });
}