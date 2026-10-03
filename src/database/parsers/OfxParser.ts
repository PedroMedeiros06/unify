import { ParserBanco, ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";

/**
 * Parser de OFX (Open Financial Exchange) — formato padrão que quase
 * todo banco brasileiro exporta ("Exportar extrato > OFX/Money"). Com
 * ele, contas de bancos sem parser de CSV próprio (Itaú, Bradesco,
 * Caixa, Santander...) também podem ser importadas.
 *
 * Aceita as duas variantes: OFX 1.x (SGML — tags de campo SEM
 * fechamento, ex. `<TRNAMT>-50.00`) e OFX 2.x (XML). Lê cada bloco
 * `<STMTTRN>...</STMTTRN>`; nos dois formatos os agregados são fechados.
 *
 * O banco de origem vem de `<BANKID>` (código COMPE) quando é um dos
 * bancos do catálogo; senão `bancoDetectado` é ID_OFX_SEM_CONTA e a UI
 * pede para o usuário escolher a conta de destino.
 */

export const ID_OFX_SEM_CONTA = "ofx";

// Código COMPE (BANKID, sem zeros à esquerda) -> id da conta do catálogo.
const CONTA_POR_COMPE: Record<string, string> = {
  "260": "nubank",
  "77": "inter",
  "1": "bb",
};

function campo(bloco: string, tag: string): string | null {
  // Valor vai até o próximo "<" ou quebra de linha (SGML não fecha a tag).
  const m = bloco.match(new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

/** "20261003120000[-3:BRT]" -> "2026-10-03" */
function dataOfx(texto: string | null): string | null {
  const m = texto?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, a, mes, d] = m;
  if (mes === "00" || d === "00") return null;
  return `${a}-${mes}-${d}`;
}

/** "-1.234,56" / "-1234.56" / "1234,56" -> número com sinal. */
function valorOfx(texto: string | null): number | null {
  if (!texto) return null;
  let t = texto.trim().replace(/\s/g, "");
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

export const OfxParser: ParserBanco = {
  idBanco: ID_OFX_SEM_CONTA,
  nomeBanco: "Arquivo OFX",

  identificar(primeirasLinhas) {
    const inicio = primeirasLinhas.join("\n").toUpperCase();
    return inicio.includes("OFXHEADER") || inicio.includes("<OFX>") || inicio.includes("<?OFX");
  },

  parse(conteudo): ResultadoParse {
    const transacoes: TransacaoImportada[] = [];
    const linhasComErro: ResultadoParse["linhasComErro"] = [];

    const bankId = campo(conteudo, "BANKID");
    const compe = bankId && /^\d+$/.test(bankId) ? String(parseInt(bankId, 10)) : null;
    const bancoDetectado = (compe && CONTA_POR_COMPE[compe]) || ID_OFX_SEM_CONTA;

    const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
    blocos.forEach((bloco, i) => {
      const numeroLinha = i + 1;
      const data = dataOfx(campo(bloco, "DTPOSTED"));
      const valor = valorOfx(campo(bloco, "TRNAMT"));
      const memo = campo(bloco, "MEMO");
      const nome = campo(bloco, "NAME");
      // NAME e MEMO variam por banco (um, outro ou os dois); junta sem repetir.
      const partes = [nome, memo].filter((x): x is string => !!x);
      const descricao = decodificarEntidades(Array.from(new Set(partes)).join(" - "));

      if (!data || valor === null || valor === 0 || !descricao) {
        linhasComErro.push({
          numeroLinha,
          conteudoOriginal: bloco.replace(/\s+/g, " ").slice(0, 200),
          motivo: !data ? "Data inválida" : valor === null || valor === 0 ? "Valor inválido" : "Descrição vazia",
        });
        return;
      }

      const fitId = campo(bloco, "FITID");
      transacoes.push({
        data,
        descricao,
        valor: Math.abs(valor),
        tipo: valor < 0 ? "saida" : "entrada",
        extra: {
          // FITID é único só dentro da conta/banco — prefixa para não
          // colidir com o identificador de outro banco na deduplicação.
          identificadorExterno: fitId ? `ofx:${bankId ?? "?"}:${fitId}` : undefined,
        },
      });
    });

    if (blocos.length === 0) {
      linhasComErro.push({ numeroLinha: 0, conteudoOriginal: "", motivo: "Nenhuma transação encontrada no arquivo OFX." });
    }

    return { transacoes, linhasComErro, bancoDetectado };
  },
};
