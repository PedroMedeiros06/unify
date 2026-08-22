import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";

export type IconeMeta = { nome: keyof typeof Ionicons.glyphMap; cor: string };

/**
 * Paleta de ícones disponíveis para metas — usada tanto no seletor do
 * EditarMetaModal quanto para resolver o ícone/cor de uma meta já
 * salva (ver obterIconeMeta). Centralizado aqui em vez de duplicado
 * entre os dois lugares, para adicionar um ícone novo nunca exigir
 * tocar em mais de um arquivo.
 */
export const ICONES_META_DISPONIVEIS: IconeMeta[] = [
  { nome: "airplane-outline", cor: colors["active-icon"] },
  { nome: "school-outline", cor: colors["sucess-color"] },
  { nome: "laptop-outline", cor: colors["warn-color"] },
  { nome: "home-outline", cor: "#378ADD" },
  { nome: "car-outline", cor: "#E24B4A" },
  { nome: "gift-outline", cor: "#EF9F27" },
  { nome: "shield-checkmark-outline", cor: colors["error-color"] },
  { nome: "medkit-outline", cor: "#E24B4A" },
  { nome: "heart-outline", cor: "#E24B4A" },
  { nome: "paw-outline", cor: "#B06AB3" },
  { nome: "restaurant-outline", cor: "#E8862E" },
  { nome: "cart-outline", cor: "#1D9E75" },
  { nome: "phone-portrait-outline", cor: "#378ADD" },
  { nome: "game-controller-outline", cor: colors["warn-color"] },
  { nome: "musical-notes-outline", cor: "#B06AB3" },
  { nome: "camera-outline", cor: "#378ADD" },
  { nome: "book-outline", cor: colors["sucess-color"] },
  { nome: "fitness-outline", cor: "#E24B4A" },
  { nome: "bicycle-outline", cor: "#1D9E75" },
  { nome: "boat-outline", cor: "#378ADD" },
  { nome: "construct-outline", cor: colors["desactived-text"] },
  { nome: "briefcase-outline", cor: colors["desactived-text"] },
  { nome: "wallet-outline", cor: colors["sucess-color"] },
  { nome: "diamond-outline", cor: "#B06AB3" },
  { nome: "trophy-outline", cor: colors["warn-color"] },
  { nome: "star-outline", cor: colors["warn-color"] },
  { nome: "sparkles-outline", cor: colors["active-icon"] },
  { nome: "flame-outline", cor: "#E8862E" },
  { nome: "leaf-outline", cor: colors["sucess-color"] },
  { nome: "umbrella-outline", cor: "#378ADD" },
];

const ICONE_PADRAO: IconeMeta = ICONES_META_DISPONIVEIS[0];

/** Resolve o {nome, cor} completo de uma meta já salva a partir do nome do ícone guardado no banco. */
export function obterIconeMeta(nomeIcone: string): IconeMeta {
  return ICONES_META_DISPONIVEIS.find((i) => i.nome === nomeIcone) ?? ICONE_PADRAO;
}