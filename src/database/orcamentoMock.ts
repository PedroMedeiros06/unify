import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

/**
 * Dados MOCKADOS da tela de Orçamento — a lógica real (queries no
 * SQLite, cálculo de limites por categoria, etc.) ainda não foi
 * implementada. Este arquivo existe só para a tela ter algo visual e
 * coerente pra exibir enquanto isso não acontece.
 *
 * Quando a lógica real entrar, a ideia é que os componentes da tela
 * (OrcamentoComp/*) continuem recebendo os MESMOS formatos de dados
 * abaixo — só a origem muda de "constante fixa" para "resultado de
 * query" — para minimizar retrabalho na UI.
 */

export type DicaOrcamento = {
  id: string;
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  titulo: string;
  subtitulo: string;
};

export const MES_EXIBIDO_MOCK = { ano: 2026, mes: 5 }; // Junho/2026 (mes 0-11)

export const RESUMO_ORCAMENTO_MOCK = {
  receitaPrevista: 6385.4,
  gastosObrigatorios: 3120.5,
  gastosVariaveis: 1413.73,
  disponivel: 1851.17,
};

export const ANALISE_ORCAMENTO_MOCK = {
  economiaNoMes: 1851.17,
  economiaPercentualDaReceita: 29,
  maiorGastoCategoriaNome: "Moradia",
  maiorGastoValor: 1915.62,
  maiorGastoPercentual: 42,
  reducaoGastosPercentual: 8,
};

export const DICAS_ORCAMENTO_MOCK: DicaOrcamento[] = [
  {
    id: "dica-lazer",
    icone: "trending-up",
    corIcone: colors["sucess-color"],
    titulo: "Você está gastando 18% menos com lazer",
    subtitulo: "Continue assim! Que tal direcionar essa economia para suas metas?",
  },
];