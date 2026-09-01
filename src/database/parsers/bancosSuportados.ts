import { PARSERS_DISPONIVEIS } from "@/database/parsers/index";

/**
 * Metadados visuais (cor + sigla) dos bancos que o app sabe importar
 * via CSV. A lista de bancos em si vem de PARSERS_DISPONIVEIS — aqui só
 * ficam cor/sigla, que os parsers não carregam.
 *
 * Antes essas tabelas estavam duplicadas em SeletorBancoManual.tsx e
 * useImportacaoCsv.ts; centralizadas aqui para não divergirem.
 */
const CORES_POR_BANCO: Record<string, string> = {
  nubank: "#8D11DA",
  inter: "#FF7A01",
  bb: "#FDFC30",
};

const SIGLAS_POR_BANCO: Record<string, string> = {
  nubank: "nu",
  inter: "in",
  bb: "BB",
};

const COR_PADRAO = "#6B778C";
const SIGLA_PADRAO = "??";

export type BancoSuportado = {
  id: string; // idBanco do parser — bate com a tabela `bancos` do SQLite
  nome: string;
  cor: string;
  sigla: string;
};

export function corPorBanco(idBanco: string): string {
  return CORES_POR_BANCO[idBanco] ?? COR_PADRAO;
}

export function siglaPorBanco(idBanco: string): string {
  return SIGLAS_POR_BANCO[idBanco] ?? SIGLA_PADRAO;
}

/** Bancos com suporte a importação de CSV, prontos para exibir na UI. */
export const BANCOS_SUPORTADOS: BancoSuportado[] = PARSERS_DISPONIVEIS.map((parser) => ({
  id: parser.idBanco,
  nome: parser.nomeBanco,
  cor: corPorBanco(parser.idBanco),
  sigla: siglaPorBanco(parser.idBanco),
}));
