// Gera src/generated/changelog.json a partir do ÚLTIMO commit do git.
//
// O .git não vai no bundle do app, então a tela "Sobre a Unify" não tem
// como rodar `git log` em runtime. Este script roda no ambiente de
// build (dev/CI), congela o último commit num JSON e o app importa esse
// arquivo normalmente.
//
// Rodar manualmente:  node scripts/gerar-changelog.mjs
// Roda sozinho antes de:  npm start / npm run android / npm run ios
//   (ver "prestart"/"preandroid"/"preios" em package.json)

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, "src/generated/changelog.json");

// Separador improvável de aparecer no corpo de um commit — usado para
// fatiar os campos sem depender de JSON escaping do lado do git.
const SEP = "@@UNIFY_FIELD@@";

function git(args) {
  return execSync(`git ${args}`, { cwd: RAIZ, encoding: "utf8" }).trim();
}

function lerUltimoCommit() {
  // %H hash | %h curto | %cI data ISO | %an autor | %s assunto | %b corpo
  const bruto = git(
    `log -1 --pretty=format:"%H${SEP}%h${SEP}%cI${SEP}%an${SEP}%s${SEP}%b"`
  );
  const [hash, hashCurto, data, autor, assunto, ...restoCorpo] = bruto.split(SEP);
  return {
    hash,
    hashCurto,
    data,
    autor,
    assunto,
    // %b pode conter o próprio SEP se alguém digitou — junta de volta.
    corpo: restoCorpo.join(SEP).trim(),
    geradoEm: new Date().toISOString(),
  };
}

function main() {
  let dados;
  try {
    dados = lerUltimoCommit();
  } catch (e) {
    // Sem git (ex.: build a partir de um tarball) — grava um placeholder
    // em vez de quebrar o build. A tela trata `hash === null`.
    console.warn("[gerar-changelog] git indisponível, gravando placeholder:", e.message);
    dados = {
      hash: null,
      hashCurto: null,
      data: null,
      autor: null,
      assunto: null,
      corpo: null,
      geradoEm: new Date().toISOString(),
    };
  }

  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, JSON.stringify(dados, null, 2) + "\n", "utf8");
  console.log(
    `[gerar-changelog] ${DESTINO} atualizado` +
      (dados.hashCurto ? ` (${dados.hashCurto} — ${dados.assunto})` : " (placeholder)")
  );
}

main();
