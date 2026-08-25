import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, FlatList, Modal } from "react-native";
import { memo, useState } from "react";
import { TransacaoComCategoria } from "@/hooks/useImportacaoCsv";
import { obterCategoriaPorId, CategoriaId } from "@/database/categorias";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";

const ItemPreview = memo(function ItemPreview({
  item,
  index,
  incluida,
  onToggle,
  onAbrirSeletorCategoria,
  isLast,
}: {
  item: TransacaoComCategoria;
  index: number;
  incluida: boolean;
  onToggle: (index: number) => void;
  onAbrirSeletorCategoria: (index: number) => void;
  isLast: boolean;
}) {
  const nomeSize = moderateScale(12);
  const valorSize = moderateScale(12);
  const avisoSize = moderateScale(10);
  const categoriaSize = moderateScale(10);

  const [ano, mes, dia] = item.data.split("-");
  const categoria = obterCategoriaPorId(item.categoriaId);

  return (
    <View className={`py-2.5 ${isLast ? "" : "border-b border-lines-divisions/50"}`}>
      <Pressable
        onPress={() => onToggle(index)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: incluida }}
        accessibilityLabel={`${item.descricao}, ${FormatToCurrency(item.valor)}${item.possivelDuplicata ? ", possível duplicata" : ""}`}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className={`w-5 h-5 rounded-md border items-center justify-center flex-shrink-0 ${
              incluida ? "bg-active-icon border-active-icon" : "border-input-border bg-transparent"
            }`}
          >
            {incluida && <Ionicons name="checkmark" color="#fff" size={13} />}
          </View>

          <View className="flex-1">
            <Text
              style={{ fontSize: nomeSize }}
              className={incluida ? "text-main-text" : "text-desactived-text"}
              numberOfLines={1}
            >
              {item.descricao}
            </Text>
            <Text style={{ fontSize: nomeSize - 1 }} className="text-desactived-text">
              {dia}/{mes}/{ano}
            </Text>
          </View>

          <Text
            style={{ fontSize: valorSize }}
            className={
              !incluida
                ? "text-desactived-text font-Inter-Medium"
                : item.tipo === "entrada"
                  ? "text-sucess-color font-Inter-Medium"
                  : "text-main-text font-Inter-Medium"
            }
          >
            {item.tipo === "entrada" ? "+ " : "- "}
            {FormatToCurrency(item.valor)}
          </Text>
        </View>
      </Pressable>

      {/* Chip de categoria — toque abre o dropdown para corrigir antes de importar */}
      <Pressable
        onPress={() => onAbrirSeletorCategoria(index)}
        className="flex-row items-center gap-1.5 mt-1.5 ml-7 self-start"
        accessibilityRole="button"
        accessibilityLabel={`Categoria: ${categoria?.nome ?? "sem categoria"}. Toque para alterar.`}
      >
        <View
          style={{ backgroundColor: categoria ? `${categoria.cor}22` : `${colors["warn-color"]}22` }}
          className="flex-row items-center gap-1 px-2 py-1 rounded-full"
        >
          <Ionicons
            name={categoria?.icone ?? "help-circle-outline"}
            color={categoria?.cor ?? colors["warn-color"]}
            size={11}
          />
          <Text
            style={{ fontSize: categoriaSize, color: categoria?.cor ?? colors["warn-color"] }}
            className="font-Inter-Medium"
          >
            {categoria?.nome ?? "Sem categoria"}
          </Text>
        </View>
        <Ionicons name="pencil" color={colors["desactived-text"]} size={10} />
      </Pressable>

      {item.possivelDuplicata && (
        <View className="flex-row items-start gap-1.5 mt-1.5 ml-7">
          <Ionicons name="alert-circle-outline" color={colors["warn-color"]} size={12} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: avisoSize }} className="text-warn-color flex-1">
            {item.motivoDuplicata}
          </Text>
        </View>
      )}

      {/* Sinalização de possível movimentação para meta — puramente
          informativa. Não é uma opção de ação aqui (não vincula nada);
          o usuário decide vincular de fato depois de importada, na
          tela de edição da transação. */}
      {item.possivelMovimentacaoMeta && (
        <View className="flex-row items-center gap-1.5 mt-1.5 ml-7">
          <Text style={{ fontSize: avisoSize }} className="text-active-icon">
            🎯 Pode ser uma movimentação para meta — revise depois de importar
          </Text>
        </View>
      )}
    </View>
  );
});

type Props = {
  transacoes: TransacaoComCategoria[];
  transacoesExcluidas: Set<number>;
  linhasComErro: { numeroLinha: number; conteudoOriginal: string; motivo: string }[];
  nomeBanco: string;
  nomeArquivo: string;
  onToggleTransacao: (index: number) => void;
  onDefinirCategoria: (index: number, categoriaId: CategoriaId) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  salvando: boolean;
};

function PreviewImportacaoBase({
  transacoes,
  transacoesExcluidas,
  linhasComErro,
  nomeBanco,
  nomeArquivo,
  onToggleTransacao,
  onDefinirCategoria,
  onConfirmar,
  onCancelar,
  salvando,
}: Props) {
  const titleSize = moderateScale(15);
  const subtitleSize = moderateScale(11);
  const countLabelSize = moderateScale(11);
  const countValueSize = moderateScale(20);
  const sectionTitleSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  const [indiceEditandoCategoria, setIndiceEditandoCategoria] = useState<number | null>(null);

  const totalDuplicatas = transacoes.filter((t) => t.possivelDuplicata).length;
  const totalMovimentacoesMeta = transacoes.filter((t) => t.possivelMovimentacaoMeta).length;
  const totalSelecionadas = transacoes.length - transacoesExcluidas.size;
  const totalErro = linhasComErro.length;
  const totalSemCategoria = transacoes.filter((t) => !t.categoriaId).length;

  // No preview, o seletor não oferece "Sem categoria" — o item já
  // começa sem categoria por padrão quando a categorização automática
  // não encontra nada; abrir o dropdown aqui é sempre para ATRIBUIR
  // uma categoria válida, nunca para removê-la.
  const handleSelecionarCategoria = (categoriaId: CategoriaId | null) => {
    if (indiceEditandoCategoria === null || !categoriaId) return;
    onDefinirCategoria(indiceEditandoCategoria, categoriaId);
    setIndiceEditandoCategoria(null);
  };

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="checkmark-circle-outline" color={colors["sucess-color"]} size={18} />
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-Medium flex-1" numberOfLines={1}>
          {nomeBanco} identificado
        </Text>
      </View>
      <Text style={{ fontSize: subtitleSize }} className="text-desactived-text mb-4" numberOfLines={1}>
        {nomeArquivo}
      </Text>

      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1 bg-sucess-color/10 border border-sucess-color/30 rounded-xl p-3 items-center">
          <Text style={{ fontSize: countValueSize }} className="text-sucess-color font-Inter-SemiBold">
            {totalSelecionadas}
          </Text>
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
            selecionadas
          </Text>
        </View>

        {totalDuplicatas > 0 && (
          <View className="flex-1 bg-warn-color/10 border border-warn-color/30 rounded-xl p-3 items-center">
            <Text style={{ fontSize: countValueSize }} className="text-warn-color font-Inter-SemiBold">
              {totalDuplicatas}
            </Text>
            <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
              possíveis duplicatas
            </Text>
          </View>
        )}

        {totalErro > 0 && (
          <View className="flex-1 bg-error-color/10 border border-error-color/30 rounded-xl p-3 items-center">
            <Text style={{ fontSize: countValueSize }} className="text-error-color font-Inter-SemiBold">
              {totalErro}
            </Text>
            <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
              linhas ignoradas
            </Text>
          </View>
        )}
      </View>

      {/* Badge de possíveis movimentações para metas — separado dos
          demais contadores acima de propósito, para reforçar
          visualmente que é uma categoria de aviso diferente (não é
          erro nem duplicata, é só "vale revisar depois"). */}
      {totalMovimentacoesMeta > 0 && (
        <View className="flex-row items-center gap-2 bg-active-icon/10 border border-active-icon/30 rounded-xl p-3 mb-4">
          <Text style={{ fontSize: countLabelSize }} className="text-active-icon flex-1">
            🎯 {totalMovimentacoesMeta} possível{totalMovimentacoesMeta === 1 ? "" : "eis"} movimentaç
            {totalMovimentacoesMeta === 1 ? "ão" : "ões"} para metas — nenhum vínculo é criado agora, você poderá
            vincular manualmente depois de importar.
          </Text>
        </View>
      )}

      {totalSemCategoria > 0 && (
        <View className="flex-row items-start gap-2 bg-warn-color/10 rounded-lg p-2.5 mb-4">
          <Ionicons name="pricetag-outline" color={colors["warn-color"]} size={14} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text flex-1">
            {totalSemCategoria} {totalSemCategoria === 1 ? "transação ficará" : "transações ficarão"} sem categoria. Toque no chip de categoria de cada linha para definir agora, se quiser.
          </Text>
        </View>
      )}

      {totalDuplicatas > 0 && (
        <View className="flex-row items-start gap-2 bg-warn-color/10 rounded-lg p-2.5 mb-4">
          <Ionicons name="information-circle-outline" color={colors["warn-color"]} size={14} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text flex-1">
            Encontramos transações parecidas com o que já está no seu histórico. Elas vêm desmarcadas por padrão — toque para incluir mesmo assim, se quiser.
          </Text>
        </View>
      )}

      {transacoes.length > 0 && (
        <View className="mb-4">
          <Text style={{ fontSize: sectionTitleSize }} className="text-second-text font-Inter-Medium mb-2">
            Revise antes de importar
          </Text>
          <View className="bg-input-background border border-lines-divisions rounded-xl px-3">
            <FlatList
              data={transacoes}
              keyExtractor={(_, index) => `${index}`}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <ItemPreview
                  item={item}
                  index={index}
                  incluida={!transacoesExcluidas.has(index)}
                  onToggle={onToggleTransacao}
                  onAbrirSeletorCategoria={setIndiceEditandoCategoria}
                  isLast={index === transacoes.length - 1}
                />
              )}
            />
          </View>
        </View>
      )}

      {transacoes.length === 0 && (
        <View className="items-center py-4 mb-2">
          <Ionicons name="alert-circle-outline" color={colors["error-color"]} size={28} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center mt-2">
            Nenhuma transação pôde ser identificada neste arquivo.
          </Text>
        </View>
      )}

      <View className="flex-row gap-2.5">
        <Pressable
          onPress={onCancelar}
          disabled={salvando}
          className="flex-1 py-3 rounded-xl items-center justify-center border border-input-border active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Cancelar importação"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-second-text font-Inter-Medium">
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirmar}
          disabled={salvando || totalSelecionadas === 0}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${totalSelecionadas > 0 && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
          accessibilityRole="button"
          accessibilityLabel="Confirmar importação"
          accessibilityState={{ disabled: salvando || totalSelecionadas === 0 }}
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-white text-center font-Inter-SemiBold">
            {salvando ? "Importando..." : `Importar ${totalSelecionadas} transações`}
          </Text>
        </Pressable>
      </View>

      {/* Dropdown de categoria para corrigir uma linha específica —
          "Sem categoria" não é oferecido aqui, ver comentário acima. */}
      <Modal
        visible={indiceEditandoCategoria !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setIndiceEditandoCategoria(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card-background rounded-t-2xl p-5 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                Definir categoria
              </Text>
              <Pressable
                onPress={() => setIndiceEditandoCategoria(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" color={colors["second-text"]} size={22} />
              </Pressable>
            </View>

            <SeletorCategoria
              categoriaSelecionada={
                indiceEditandoCategoria !== null ? transacoes[indiceEditandoCategoria]?.categoriaId ?? null : null
              }
              onSelecionar={handleSelecionarCategoria}
              permitirSemCategoria={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const PreviewImportacao = memo(PreviewImportacaoBase);