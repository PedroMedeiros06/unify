import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

export type DicaOrcamento = {
  id: string;
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  titulo: string;
  subtitulo: string;
};

/**
 * Dicas de educação financeira sobre orçamento — conteúdo fixo e
 * genérico, NÃO derivado dos dados do usuário. São boas práticas de
 * mercado (regra 50/30/20, orçamento base zero, pagar-se primeiro,
 * reserva de emergência, metas em três prazos, revisão mensal),
 * resumidas em português.
 *
 * Dicas personalizadas ("você gastou X% a mais em tal categoria") são
 * de uma fase futura e dependem da análise previsão × realizado.
 *
 * Fontes:
 * - https://www.mobills.com.br/blog/planejamento-financeiro/regra-50-30-20/
 * - https://99app.com/blog/99pay/como-organizar-as-financas-pessoais-aprenda-a-regra-50-30-20/
 * - https://www.nerdwallet.com/finance/learn/zero-based-budgeting-explained
 * - https://www.usbank.com/financial-education/save/budgeting-strategies.html
 * - https://www.incharge.org/financial-literacy/budgeting-saving/tips-for-young-adults/
 */
export const DICAS_ORCAMENTO: DicaOrcamento[] = [
  {
    id: "dica-50-30-20",
    icone: "pie-chart-outline",
    corIcone: colors["active-icon"],
    titulo: "Divida a renda em 50 / 30 / 20",
    subtitulo:
      "Até 50% para necessidades (moradia, contas, transporte), 30% para desejos e 20% para poupança, dívidas ou investimentos.",
  },
  {
    id: "dica-base-zero",
    icone: "calculator-outline",
    corIcone: colors["active-icon"],
    titulo: "Dê um destino a cada real",
    subtitulo:
      "No orçamento base zero, receita menos despesas planejadas tem que fechar em zero. O que sobra vira poupança ou meta, não gasto solto.",
  },
  {
    id: "dica-pague-se-primeiro",
    icone: "wallet-outline",
    corIcone: colors["sucess-color"],
    titulo: "Pague-se primeiro",
    subtitulo:
      "Separe a parte de poupança e metas assim que a renda cai, antes dos outros gastos, de preferência de forma automática.",
  },
  {
    id: "dica-reserva-emergencia",
    icone: "shield-checkmark-outline",
    corIcone: colors["sucess-color"],
    titulo: "Monte uma reserva de emergência",
    subtitulo:
      "Junte de 3 a 6 meses de despesas fixas. Começar com uma reserva pequena já evita que um imprevisto vire dívida.",
  },
  {
    id: "dica-metas-tres-prazos",
    icone: "flag-outline",
    corIcone: colors["active-icon"],
    titulo: "Tenha metas de curto, médio e longo prazo",
    subtitulo:
      "Um objetivo próximo, um intermediário e um distante ao mesmo tempo mantêm a disciplina mês a mês.",
  },
  {
    id: "dica-revisao-mensal",
    icone: "repeat-outline",
    corIcone: colors["active-icon"],
    titulo: "Revise o orçamento todo mês",
    subtitulo:
      "Compare o previsto com o que de fato foi gasto, ajuste os limites por categoria e comece aos poucos se os percentuais parecerem apertados.",
  },
];
