import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ScrollView } from "react-native";
import { memo } from "react";
import { CATEGORIAS, CategoriaId } from "@/database/categorias";
import { DropdownMenu } from "@/components/common/DropdownMenu";

type Props = {
  categoriasSelecionadas: (CategoriaId | null)[]; // [] = todas
  onAlternar: (categoriaId: CategoriaId | null) => void;
  onLimpar: () => void;
};

type ItemLista = { id: CategoriaId | null; nome: string; icone: keyof typeof Ionicons.glyphMap; cor: string };

const ITEM_SEM_CATEGORIA: ItemLista = {
  id: null,
  nome: "Sem categoria",
  icone: "help-circle-outline",
  cor: colors["desactived-text"],
};

// Altura máxima da lista dentro do card do dropdown — acima disso rola.
const MAX_ALTURA_LISTA = 260;

function SeletorCategoriaMultiploBase({ categoriasSelecionadas, onAlternar, onLimpar }: Props) {
  const triggerTextSize = moderateScale(12);
  const itemTextSize = moderateScale(13);
  const rodapeTextSize = moderateScale(12);

  const itens: ItemLista[] = [ITEM_SEM_CATEGORIA, ...CATEGORIAS];
  const temSelecao = categoriasSelecionadas.length > 0;

  const rotulo =
    categoriasSelecionadas.length === 0
      ? "Categorias"
      : categoriasSelecionadas.length === 1
        ? (itens.find((i) => i.id === categoriasSelecionadas[0])?.nome ?? "1 categoria")
        : `${categoriasSelecionadas.length} categorias`;

  return (
    <DropdownMenu
      largura={240}
      trigger={({ abrir, aberto }) => (
        <Pressable
          onPress={abrir}
          // Sem destaque roxo por ter categoria filtrada — o rótulo já
          // muda ("3 categorias" etc.). Trigger só reage ao menu aberto.
          className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1 ${
            aberto ? "border-active-icon" : "border-lines-divisions bg-input-background/50"
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por categoria. ${rotulo}`}
        >
          <Ionicons name="pricetags-outline" color={colors["second-text"]} size={13} />
          <Text
            style={{ fontSize: triggerTextSize }}
            className="text-main-text font-Inter-Regular"
            numberOfLines={1}
          >
            {rotulo}
          </Text>
          <Ionicons name="chevron-down" color={colors["second-text"]} size={11} />
        </Pressable>
      )}
    >
      {({ fechar }) => (
        <View className="py-1">
          <ScrollView style={{ maxHeight: MAX_ALTURA_LISTA }} showsVerticalScrollIndicator={false}>
            {itens.map((item, index) => {
              const selecionado = categoriasSelecionadas.includes(item.id);
              return (
                <Pressable
                  key={item.id ?? "sem-categoria"}
                  // Multi-select: tocar num item alterna, NÃO fecha o
                  // dropdown. Fechar só via "Aplicar" ou tocando fora.
                  onPress={() => onAlternar(item.id)}
                  className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
                    index < itens.length - 1 ? "border-b border-lines-divisions/60" : ""
                  }`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selecionado }}
                  accessibilityLabel={item.nome}
                >
                  <View
                    className={`w-5 h-5 rounded-md border items-center justify-center flex-shrink-0 ${
                      selecionado ? "bg-active-icon border-active-icon" : "border-input-border"
                    }`}
                  >
                    {selecionado && <Ionicons name="checkmark" color="#fff" size={13} />}
                  </View>
                  <View
                    style={{ backgroundColor: `${item.cor}22` }}
                    className="w-7 h-7 rounded-full items-center justify-center flex-shrink-0"
                  >
                    <Ionicons name={item.icone} color={item.cor} size={15} />
                  </View>
                  <Text
                    style={{ fontSize: itemTextSize }}
                    className={selecionado ? "text-active-icon font-Inter-Medium flex-1" : "text-main-text flex-1"}
                    numberOfLines={1}
                  >
                    {item.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Rodapé de ação — Limpar (só com seleção) + Aplicar */}
          <View className="flex-row items-center justify-between gap-2 px-4 pt-2 pb-1 border-t border-lines-divisions/60">
            {temSelecao ? (
              <Pressable
                onPress={onLimpar}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Limpar filtro de categoria"
              >
                <Text style={{ fontSize: rodapeTextSize }} className="text-second-text font-Inter-Medium">
                  Limpar
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={fechar}
              className="px-4 py-1.5 rounded-lg bg-active-icon active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtro de categoria"
            >
              <Text style={{ fontSize: rodapeTextSize }} className="text-white font-Inter-SemiBold">
                Aplicar
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </DropdownMenu>
  );
}

export const SeletorCategoriaMultiplo = memo(SeletorCategoriaMultiploBase);
