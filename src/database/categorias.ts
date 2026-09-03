import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";

/**
 * Fonte única de verdade das categorias fixas da Unify.
 *
 * `id` é o slug estável salvo no banco (coluna `categoria_id` em
 * `transacoes` e `regras_categorizacao`) — nunca deve mudar depois de
 * publicado, mesmo que `nome` ou `icone` sejam ajustados no futuro.
 *
 * Esta lista é o único lugar que deve ser editado para adicionar,
 * renomear ou reordenar categorias. Nenhum outro módulo deve declarar
 * categorias por conta própria (ver categorizacao.ts).
 */
export type CategoriaId =
  | "transporte"
  | "mercado"
  | "alimentacao"
  | "casa"
  | "lazer"
  | "saude"
  | "transferencia"
  | "boleto"
  | "investimentos"
  | "compras"
  | "educacao"
  | "assinaturas"
  | "contas"
  | "salario"
  | "renda_extra"
  | "impostos"
  | "presentes"
  | "pets"
  | "beleza"
  | "viagem"
  | "outros";

export type Categoria = {
  id: CategoriaId;
  nome: string;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
};

export const CATEGORIAS: readonly Categoria[] = [
  { id: "transporte", nome: "Transporte", icone: "car-outline", cor: "#378ADD" },
  { id: "mercado", nome: "Mercado", icone: "cart-outline", cor: "#1D9E75" },
  { id: "alimentacao", nome: "Alimentação", icone: "restaurant-outline", cor: "#E8862E" },
  { id: "casa", nome: "Casa", icone: "home-outline", cor: colors["active-icon"] },
  { id: "lazer", nome: "Lazer", icone: "game-controller-outline", cor: "#EF9F27" },
  { id: "saude", nome: "Saúde", icone: "medkit-outline", cor: "#E24B4A" },
  { id: "transferencia", nome: "Transferência", icone: "swap-horizontal-outline", cor: "#8D51E6" },
  { id: "boleto", nome: "Boleto", icone: "document-text-outline", cor: colors["warn-color"] },
  { id: "investimentos", nome: "Investimentos", icone: "trending-up-outline", cor: colors["sucess-color"] },
  { id: "compras", nome: "Compras", icone: "bag-handle-outline", cor: "#B06AB3" },
  { id: "educacao", nome: "Educação", icone: "school-outline", cor: "#2E7DD1" },
  { id: "assinaturas", nome: "Assinaturas", icone: "repeat-outline", cor: "#C0392B" },
  { id: "contas", nome: "Contas e serviços", icone: "flash-outline", cor: "#E8A72E" },
  { id: "salario", nome: "Salário", icone: "cash-outline", cor: "#1D9E75" },
  { id: "renda_extra", nome: "Renda extra", icone: "wallet-outline", cor: "#16A085" },
  { id: "impostos", nome: "Impostos e taxas", icone: "receipt-outline", cor: "#7F8C8D" },
  { id: "presentes", nome: "Presentes e doações", icone: "gift-outline", cor: "#E67EA8" },
  { id: "pets", nome: "Pets", icone: "paw-outline", cor: "#A0693F" },
  { id: "beleza", nome: "Beleza e cuidados", icone: "cut-outline", cor: "#D97EB8" },
  { id: "viagem", nome: "Viagem", icone: "airplane-outline", cor: "#3B9CBD" },
  { id: "outros", nome: "Outros", icone: "ellipsis-horizontal-outline", cor: colors["desactived-text"] },
] as const;

const MAPA_CATEGORIAS: Record<CategoriaId, Categoria> = CATEGORIAS.reduce(
  (acc, categoria) => {
    acc[categoria.id] = categoria;
    return acc;
  },
  {} as Record<CategoriaId, Categoria>
);

/** Retorna a categoria pelo id, ou null se o id for inválido/desconhecido. */
export function obterCategoriaPorId(id: string | null | undefined): Categoria | null {
  if (!id) return null;
  return MAPA_CATEGORIAS[id as CategoriaId] ?? null;
}

/** Type guard: confirma se uma string é de fato um CategoriaId válido. */
export function ehCategoriaIdValido(id: string): id is CategoriaId {
  return id in MAPA_CATEGORIAS;
}