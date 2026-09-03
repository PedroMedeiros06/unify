import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { memo, useCallback, useState } from "react";
import { CATEGORIAS, CategoriaId, obterCategoriaPorId } from "@/database/categorias";

type Props = {
  categoriaSelecionada: CategoriaId | null;
  onSelecionar: (categoriaId: CategoriaId | null) => void;
  label?: string;
  // Quando false, remove a opção "Sem categoria" da lista — útil para
  // fluxos onde a transação é obrigada a ter uma categoria válida.
  permitirSemCategoria?: boolean;
  // Slugs a esconder da lista — ex: categorias que já têm limite
  // definido no mês, ao adicionar um novo limite.
  categoriasOcultas?: CategoriaId[];
};

type ItemLista = { id: CategoriaId | null; nome: string; icone: keyof typeof Ionicons.glyphMap; cor: string };

const ITEM_SEM_CATEGORIA: ItemLista = {
  id: null,
  nome: "Sem categoria",
  icone: "help-circle-outline",
  cor: colors["desactived-text"],
};

function SeletorCategoriaBase({
  categoriaSelecionada,
  onSelecionar,
  label = "Categoria",
  permitirSemCategoria = true,
  categoriasOcultas,
}: Props) {
  const labelSize = moderateScale(11);
  const valueSize = moderateScale(14);
  const itemTextSize = moderateScale(14);
  const titleSize = moderateScale(16);

  const [aberto, setAberto] = useState(false);

  const categoriaAtual = obterCategoriaPorId(categoriaSelecionada);

  const categoriasVisiveis =
    categoriasOcultas && categoriasOcultas.length > 0
      ? CATEGORIAS.filter((c) => !categoriasOcultas.includes(c.id))
      : CATEGORIAS;

  const itens: ItemLista[] = permitirSemCategoria
    ? [ITEM_SEM_CATEGORIA, ...categoriasVisiveis]
    : [...categoriasVisiveis];

  const handleAbrir = useCallback(() => setAberto(true), []);
  const handleFechar = useCallback(() => setAberto(false), []);

  const handleSelecionar = useCallback(
    (item: ItemLista) => {
      onSelecionar(item.id);
      setAberto(false);
    },
    [onSelecionar]
  );

  return (
    <View>
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>

      {/* Campo-gatilho — mesmo padrão visual de SeletorData */}
      <Pressable
        onPress={handleAbrir}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${categoriaAtual?.nome ?? "Sem categoria"}`}
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Ionicons
            name={categoriaAtual?.icone ?? "help-circle-outline"}
            color={categoriaAtual?.cor ?? colors["desactived-text"]}
            size={16}
          />
          <Text
            style={{ fontSize: valueSize }}
            className={categoriaAtual ? "text-main-text" : "text-desactived-text"}
            numberOfLines={1}
          >
            {categoriaAtual?.nome ?? "Sem categoria"}
          </Text>
        </View>
        <Ionicons name="chevron-down" color={colors["second-text"]} size={16} />
      </Pressable>

      {/* Lista de opções — a única forma de mudar a categoria; não há
          campo de texto livre, então não é possível criar categoria nova. */}
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={handleFechar} statusBarTranslucent navigationBarTranslucent>
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar seleção de categoria"
        >
          <Pressable className="bg-card-background rounded-t-2xl pt-5 pb-8 max-h-[70%]" onPress={() => {}}>
            <View className="flex-row justify-between items-center px-5 mb-2">
              <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                Selecionar categoria
              </Text>
              <Pressable onPress={handleFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
                <Ionicons name="close" color={colors["second-text"]} size={22} />
              </Pressable>
            </View>

            <FlatList
              data={itens}
              keyExtractor={(item) => item.id ?? "sem-categoria"}
              renderItem={({ item }) => {
                const selecionado = item.id === categoriaSelecionada;
                return (
                  <Pressable
                    onPress={() => handleSelecionar(item)}
                    className={`flex-row items-center gap-3 px-5 py-3.5 ${selecionado ? "bg-active-icon/10" : ""}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selecionado }}
                    accessibilityLabel={item.nome}
                  >
                    <View
                      style={{ backgroundColor: `${item.cor}22` }}
                      className="w-8 h-8 rounded-full items-center justify-center"
                    >
                      <Ionicons name={item.icone} color={item.cor} size={16} />
                    </View>
                    <Text
                      style={{ fontSize: itemTextSize }}
                      className={selecionado ? "text-active-icon font-Inter-Medium flex-1" : "text-main-text flex-1"}
                    >
                      {item.nome}
                    </Text>
                    {selecionado && <Ionicons name="checkmark" color={colors["active-icon"]} size={18} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const SeletorCategoria = memo(SeletorCategoriaBase);