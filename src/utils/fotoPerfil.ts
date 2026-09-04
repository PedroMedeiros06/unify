import * as ImagePicker from "expo-image-picker";
import { File, Directory, Paths } from "expo-file-system";

/**
 * Escolha e persistência da foto de perfil.
 *
 * Fluxo: abre a galeria (com crop quadrado), copia o arquivo escolhido
 * — que vem num diretório temporário/cache — para
 * `<documentos>/perfil/avatar_<timestamp>.jpg`, apaga a foto anterior e
 * devolve o novo caminho `file://`. Só o caminho é guardado no perfil
 * (SQLite); a imagem em si fica no sandbox do app e NÃO entra no backup
 * JSON.
 */

const SUBPASTA = "perfil";

function pastaAvatar(): Directory {
  const dir = new Directory(Paths.document, SUBPASTA);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export type ResultadoFotoPerfil =
  | { status: "ok"; uri: string }
  | { status: "cancelado" }
  | { status: "sem_permissao" }
  | { status: "erro"; mensagem: string };

/**
 * Abre a galeria, deixa o usuário recortar em quadrado e devolve o
 * caminho definitivo da nova foto. `uriAnterior`, se informado e dentro
 * da pasta do app, é apagado depois da cópia.
 */
export async function escolherFotoPerfil(uriAnterior?: string | null): Promise<ResultadoFotoPerfil> {
  try {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      return { status: "sem_permissao" };
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (resultado.canceled || !resultado.assets?.[0]?.uri) {
      return { status: "cancelado" };
    }

    const origem = new File(resultado.assets[0].uri);
    const destino = new File(pastaAvatar(), `avatar_${Date.now()}.jpg`);
    origem.copy(destino);

    // Remove a foto antiga (só se for uma que este app criou).
    apagarFotoPerfil(uriAnterior);

    return { status: "ok", uri: destino.uri };
  } catch (e) {
    console.error("[fotoPerfil] Falha ao escolher/copiar foto:", e);
    return { status: "erro", mensagem: e instanceof Error ? e.message : "Erro ao processar a imagem." };
  }
}

/**
 * Apaga o arquivo de uma foto de perfil, se ele existir e estiver dentro
 * da pasta do app. Silencioso — usado tanto ao trocar quanto ao remover
 * a foto.
 */
export function apagarFotoPerfil(uri?: string | null): void {
  if (!uri || !uri.includes(`/${SUBPASTA}/`)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn("[fotoPerfil] não foi possível apagar a foto antiga (ignorado):", e);
  }
}
