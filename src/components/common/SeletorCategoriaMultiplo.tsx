import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { memo, useCallback, useState } from "react";
import { CATEGORIAS, CategoriaId } from "@/database/categorias";

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

function SeletorCategoriaMultiploBase({ categoriasSelecionadas, onAlternar, onLimpar }: Props) {
  const chipTextSize = moderateScale(12);
  const itemTextSize = moderateScale(14);
  const titleSize = moderateScale(16);

  const [aberto, setAberto] = useState(false);

  const itens: ItemLista[] = [ITEM_SEM_CATEGORIA, ...CATEGORIAS];

  const handleAbrir = useCallback(() => setAberto(true), []);
  const handleFechar = useCallback(() => setAberto(false), []);

  const rotulo =
    categoriasSelecionadas.length === 0
      ? "Categorias"
      : categoriasSelecionadas.length === 1
        ? (itens.find((i) => i.id === categoriasSelecionadas[0])?.nome ?? "1 categoria")
        : `${categoriasSelecionadas.length} categorias`;

  return (
    <>
      <Pressable
        onPress={handleAbrir}
        className={`bg-input-background/50 px-2 py-1.5 rounded-lg border flex-row items-center gap-1 ${
          categoriasSelecionadas.length > 0 ? "border-active-icon" : "border-lines-divisions"
        }`}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por categoria. ${rotulo}`}
      >
        <Text
          style={{ fontSize: chipTextSize }}
          className={categoriasSelecionadas.length > 0 ? "text-active-icon font-Inter-Medium" : "text-main-text font-Inter-Regular"}
        >
          {rotulo}
        </Text>
        <Ionicons name="chevron-down" color={categoriasSelecionadas.length > 0 ? colors["active-icon"] : colors["second-text"]} size={10} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={handleFechar}>
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar filtro de categoria"
        >
          <Pressable className="bg-card-background rounded-t-2xl pt-5 pb-8 max-h-[70%]" onPress={() => {}}>
            <View className="flex-row justify-between items-center px-5 mb-2">
              <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                Filtrar por categoria
              </Text>
              {categoriasSelecionadas.length > 0 && (
                <Pressable onPress={onLimpar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar filtro de categoria">
                  <Text style={{ fontSize: chipTextSize }} className="text-active-icon font-Inter-Medium">
                    Limpar
                  </Text>
                </Pressable>
              )}
            </View>

            <FlatList
              data={itens}
              keyExtractor={(item) => item.id ?? "sem-categoria"}
              renderItem={({ item }) => {
                const selecionado = categoriasSelecionadas.includes(item.id);
                return (
                  <Pressable
                    onPress={() => onAlternar(item.id)}
                    className="flex-row items-center gap-3 px-5 py-3.5"
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
                      className="w-8 h-8 rounded-full items-center justify-center"
                    >
                      <Ionicons name={item.icone} color={item.cor} size={16} />
                    </View>
                    <Text style={{ fontSize: itemTextSize }} className="text-main-text flex-1">
                      {item.nome}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <View className="px-5 pt-3">
              <Pressable
                onPress={handleFechar}
                className="w-full py-3 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Aplicar filtro de categoria"
              >
                <Text style={{ fontSize: itemTextSize }} className="text-white font-Inter-SemiBold">
                  Aplicar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const SeletorCategoriaMultiplo = memo(SeletorCategoriaMultiploBase);
