import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { CATEGORIAS_ORCAMENTO_MOCK, CategoriaOrcamento, calcularPercentualCategoria } from "@/database/orcamentoMock";

const ItemCategoria = memo(function ItemCategoria({
  categoria,
  isLast,
  onPress,
}: {
  categoria: CategoriaOrcamento;
  isLast: boolean;
  onPress: (categoria: CategoriaOrcamento) => void;
}) {
  const nomeSize = moderateScale(14);
  const limiteSize = moderateScale(11);
  const valorSize = moderateScale(13);
  const percentualSize = moderateScale(11);

  const percentual = calcularPercentualCategoria(categoria);
  // Acima de 90% do limite, o percentual vira aviso (vermelho) em vez
  // da cor neutra padrão — sinaliza visualmente que a categoria está
  // perto de estourar.
  const percentualEmAlerta = percentual >= 90;

  return (
    <Pressable
      onPress={() => onPress(categoria)}
      className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={`${categoria.nome}, ${FormatToCurrency(categoria.gasto)} de ${FormatToCurrency(categoria.limite)}, ${percentual}% utilizado`}
    >
      <View
        style={{ backgroundColor: `${categoria.cor}22` }}
        className="w-11 h-11 rounded-full items-center justify-center flex-shrink-0"
      >
        <Ionicons name={categoria.icone} color={categoria.cor} size={20} />
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-start mb-1.5">
          <View className="flex-1 pr-2">
            <Text style={{ fontSize: nomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
              {categoria.nome}
            </Text>
            <Text style={{ fontSize: limiteSize }} className="text-desactived-text" numberOfLines={1}>
              Limite: {FormatToCurrency(categoria.limite)}
            </Text>
          </View>

          <View className="items-end flex-shrink-0">
            <Text style={{ fontSize: valorSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
              {FormatToCurrency(categoria.gasto)}
            </Text>
            <Text
              style={{ fontSize: percentualSize }}
              className={percentualEmAlerta ? "text-error-color font-Inter-Medium" : "text-desactived-text"}
            >
              {percentual}%
            </Text>
          </View>
        </View>

        <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden">
          <View
            style={{ width: `${percentual}%`, backgroundColor: percentualEmAlerta ? colors["error-color"] : categoria.cor }}
            className="h-full rounded-full"
          />
        </View>
      </View>

      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
    </Pressable>
  );
});

type Props = {
  onSelecionarCategoria?: (categoria: CategoriaOrcamento) => void;
  onEditarCategorias?: () => void;
};

function CategoriasOrcamentoBase({ onSelecionarCategoria, onEditarCategorias }: Props) {
  const cardTitleSize = moderateScale(15);
  const actionTextSize = moderateScale(12);

  const handlePress = (categoria: CategoriaOrcamento) => {
    onSelecionarCategoria?.(categoria);
  };

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Categorias do orçamento
        </Text>
        <Pressable onPress={onEditarCategorias} hitSlop={8} accessibilityRole="button" accessibilityLabel="Editar categorias">
          <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
            Editar categorias
          </Text>
        </Pressable>
      </View>

      {CATEGORIAS_ORCAMENTO_MOCK.map((categoria, index) => (
        <ItemCategoria
          key={categoria.id}
          categoria={categoria}
          isLast={index === CATEGORIAS_ORCAMENTO_MOCK.length - 1}
          onPress={handlePress}
        />
      ))}
    </View>
  );
}

export const CategoriasOrcamento = memo(CategoriasOrcamentoBase);