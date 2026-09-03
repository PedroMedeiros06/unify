import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import { exportarDados, validarBackup, restaurarDados, ArquivoBackup } from "@/database/backup";

/**
 * Ponte entre o backup lógico (src/database/backup.ts) e o sistema de
 * arquivos / folha de compartilhamento / seletor de documentos.
 *
 * Exportar: gera o JSON, grava num arquivo temporário no cache e abre a
 * folha de compartilhamento para o usuário salvar onde quiser (Drive,
 * e-mail, "Arquivos"...).
 *
 * Importar: abre o seletor de documentos, lê o arquivo escolhido,
 * valida e restaura. Não remonta a árvore de contextos — quem chama faz
 * isso (mesmo padrão do "apagar dados").
 */

function nomeArquivoBackup(): string {
  const agora = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const carimbo = `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}_${p(agora.getHours())}${p(agora.getMinutes())}`;
  return `unify-backup_${carimbo}.json`;
}

export type ResultadoExportacao =
  | { status: "ok"; totalLinhas: number }
  | { status: "cancelado" }
  | { status: "indisponivel" }
  | { status: "erro"; mensagem: string };

export async function exportarBackupParaArquivo(): Promise<ResultadoExportacao> {
  try {
    const appVersion = Constants.expoConfig?.version ?? null;
    const dados = await exportarDados(appVersion);
    const totalLinhas = Object.values(dados.tabelas).reduce((s, l) => s + l.length, 0);

    const arquivo = new File(Paths.cache, nomeArquivoBackup());
    // Sobrescreve um backup anterior com o mesmo nome (mesmo minuto).
    if (arquivo.exists) arquivo.delete();
    arquivo.create();
    arquivo.write(JSON.stringify(dados));

    if (!(await Sharing.isAvailableAsync())) {
      return { status: "indisponivel" };
    }

    await Sharing.shareAsync(arquivo.uri, {
      mimeType: "application/json",
      dialogTitle: "Salvar backup do Unify",
      UTI: "public.json",
    });

    return { status: "ok", totalLinhas };
  } catch (e) {
    console.error("[backupArquivo] Falha ao exportar:", e);
    return { status: "erro", mensagem: e instanceof Error ? e.message : "Erro ao exportar." };
  }
}

async function lerTextoDoArquivo(uri: string): Promise<string> {
  try {
    return await new File(uri).text();
  } catch {
    const resposta = await fetch(uri);
    return await resposta.text();
  }
}

/**
 * Só faz a seleção + validação, sem restaurar nada ainda. Serve para a
 * UI mostrar um resumo ("este backup tem X registros de DD/MM") e pedir
 * confirmação antes de sobrescrever os dados.
 */
export async function escolherEValidarBackup(): Promise<
  | { status: "ok"; arquivo: ArquivoBackup; totalLinhas: number }
  | { status: "cancelado" }
  | { status: "arquivo_invalido"; mensagem: string }
  | { status: "erro"; mensagem: string }
> {
  try {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/plain", "*/*"],
      copyToCacheDirectory: true,
    });

    if (resultado.canceled) return { status: "cancelado" };

    const asset = resultado.assets[0];
    if (!asset?.uri) {
      return { status: "erro", mensagem: "Não foi possível acessar o arquivo selecionado." };
    }

    const texto = await lerTextoDoArquivo(asset.uri);
    const validacao = await validarBackup(texto);
    if (!validacao.ok) {
      return { status: "arquivo_invalido", mensagem: validacao.erro };
    }

    return { status: "ok", arquivo: validacao.arquivo, totalLinhas: validacao.totalLinhas };
  } catch (e) {
    console.error("[backupArquivo] Falha ao ler backup:", e);
    return { status: "erro", mensagem: e instanceof Error ? e.message : "Erro ao ler o arquivo." };
  }
}

/**
 * Aplica um backup já validado. Depois disto, quem chamou DEVE forçar a
 * remontagem dos contextos (ResetAppContext) para as telas relerem o
 * banco.
 */
export type ResultadoAplicacao =
  | { status: "ok"; totalLinhas: number }
  | { status: "erro"; mensagem: string };

export async function aplicarBackup(arquivo: ArquivoBackup): Promise<ResultadoAplicacao> {
  try {
    await restaurarDados(arquivo);
    const totalLinhas = Object.values(arquivo.tabelas).reduce((s, l) => s + l.length, 0);
    return { status: "ok", totalLinhas };
  } catch (e) {
    console.error("[backupArquivo] Falha ao restaurar:", e);
    return { status: "erro", mensagem: e instanceof Error ? e.message : "Erro ao restaurar." };
  }
}
