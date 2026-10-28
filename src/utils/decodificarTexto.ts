/**
 * Decodifica os bytes de um arquivo de extrato em texto.
 *
 * Bancos brasileiros exportam ora em UTF-8, ora em Windows-1252/Latin-1
 * (BB e muitos OFX declaram CHARSET:1252). Ler tudo como UTF-8 trocava
 * "ç", "ã", "é" por "�" nesses arquivos — descrições ilegíveis e regras
 * de categoria que não casavam.
 *
 * Estratégia: tenta UTF-8 ESTRITO (qualquer sequência inválida aborta);
 * se falhar, decodifica como Windows-1252. Implementado à mão porque o
 * TextDecoder do Hermes não garante suporte a outros encodings.
 */

// Windows-1252 difere do Latin-1 só na faixa 0x80–0x9F.
const CP1252_80_9F = [
  0x20ac, 0xfffd, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0xfffd,
  0x017d, 0xfffd, 0xfffd, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0xfffd, 0x017e, 0x0178,
];

function juntar(codigos: number[], partes: string[]) {
  // String.fromCharCode com muitos argumentos estoura a pilha — fatia.
  partes.push(String.fromCharCode(...codigos));
  codigos.length = 0;
}

/** UTF-8 estrito; devolve null se encontrar sequência inválida. */
function decodificarUtf8Estrito(bytes: Uint8Array): string | null {
  const partes: string[] = [];
  const codigos: number[] = [];
  let i = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0; // BOM

  while (i < bytes.length) {
    const b = bytes[i];
    let cp: number;
    let extra: number;
    if (b < 0x80) {
      cp = b;
      extra = 0;
    } else if (b >= 0xc2 && b <= 0xdf) {
      cp = b & 0x1f;
      extra = 1;
    } else if (b >= 0xe0 && b <= 0xef) {
      cp = b & 0x0f;
      extra = 2;
    } else if (b >= 0xf0 && b <= 0xf4) {
      cp = b & 0x07;
      extra = 3;
    } else {
      return null;
    }
    for (let k = 1; k <= extra; k++) {
      const c = bytes[i + k];
      if (c === undefined || (c & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (c & 0x3f);
    }
    i += extra + 1;

    if (cp > 0xffff) {
      const v = cp - 0x10000;
      codigos.push(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
    } else {
      codigos.push(cp);
    }
    if (codigos.length >= 8192) juntar(codigos, partes);
  }
  juntar(codigos, partes);
  return partes.join("");
}

function decodificarCp1252(bytes: Uint8Array): string {
  const partes: string[] = [];
  const codigos: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    codigos.push(b >= 0x80 && b <= 0x9f ? CP1252_80_9F[b - 0x80] : b);
    if (codigos.length >= 8192) juntar(codigos, partes);
  }
  juntar(codigos, partes);
  return partes.join("");
}

export function decodificarTextoExtrato(bytes: Uint8Array): string {
  return decodificarUtf8Estrito(bytes) ?? decodificarCp1252(bytes);
}
