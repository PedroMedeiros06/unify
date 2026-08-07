import { ParserBanco, ResultadoParse } from "@/database/parsers/TransacaoImportada";
import { NubankParser } from "@/database/parsers/NubankParser";
import { InterParser } from "@/database/parsers/InterParser";
import { BancoDoBrasilParser } from "@/database/parsers/BancoDoBrasilParser";

/**
 * Todos os parsers de banco disponíveis. Para adicionar suporte a um
 * novo banco: implementar um ParserBanco (ver TransacaoImportada.ts)
 * e adicionar aqui — nada mais no app precisa mudar.
 */
export const PARSERS_DISPONIVEIS: ParserBanco[] = [
  NubankParser,
  InterParser,
  BancoDoBrasilParser,
];

/**
 * Tenta identificar automaticamente qual banco gerou o CSV, testando
 * cada parser cadastrado. Retorna o primeiro que reconhecer o formato,
 * ou null se nenhum reconhecer (nesse caso a UI deve pedir seleção manual).
 */
export function detectarParser(conteudoCsv: string): ParserBanco | null {
  const primeirasLinhas = conteudoCsv.split(/\r?\n/).slice(0, 10);

  for (const parser of PARSERS_DISPONIVEIS) {
    if (parser.identificar(primeirasLinhas)) {
      return parser;
    }
  }

  return null;
}

/**
 * Busca um parser específico pelo id do banco — usado quando o usuário
 * seleciona manualmente o banco (fallback quando a detecção automática falha).
 */
export function obterParserPorId(idBanco: string): ParserBanco | null {
  return PARSERS_DISPONIVEIS.find((p) => p.idBanco === idBanco) ?? null;
}

/**
 * Ponto de entrada único para importar um CSV: detecta o banco
 * (ou usa o informado manualmente) e roda o parser correspondente.
 */
export function importarCsv(
  conteudoCsv: string,
  idBancoForcado?: string
): ResultadoParse {
  const parser = idBancoForcado
    ? obterParserPorId(idBancoForcado)
    : detectarParser(conteudoCsv);

  if (!parser) {
    return {
      transacoes: [],
      linhasComErro: [
        {
          numeroLinha: 0,
          conteudoOriginal: "",
          motivo: "Não foi possível identificar o banco de origem deste arquivo automaticamente.",
        },
      ],
      bancoDetectado: null,
    };
  }

  return parser.parse(conteudoCsv);
}
