import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, FlatList } from "react-native";
import { memo } from "react";
import { TransacaoComStatusDuplicata } from "@/database/deduplicacao";

const ItemPreview = memo(function ItemPreview({
  item,
  index,
  incluida,
  onToggle,
  isLast,
}: {
  item: TransacaoComStatusDuplicata;
  index: number;
  incluida: boolean;
  onToggle: (index: number) => void;
  isLast: boolean;
}) {
  const nomeSize = moderateScale(12);
  const valorSize = moderateScale(12);
  const avisoSize = moderateScale(10);

  const [ano, mes, dia] = item.data.split("-");

  return (
    <Pressable
      onPress={() => onToggle(index)}
      className={`py-2.5 ${isLast ? "" : "border-b border-lines-divisions/50"}`}
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

      {item.possivelDuplicata && (
        <View className="flex-row items-center gap-1.5 mt-1.5 ml-7">
          <Ionicons name="alert-circle-outline" color={colors["warn-color"]} size={12} />
          <Text style={{ fontSize: avisoSize }} className="text-warn-color flex-1">
            {item.motivoDuplicata}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

type Props = {
  transacoes: TransacaoComStatusDuplicata[];
  transacoesExcluidas: Set<number>;
  linhasComErro: { numeroLinha: number; conteudoOriginal: string; motivo: string }[];
  nomeBanco: string;
  nomeArquivo: string;
  onToggleTransacao: (index: number) => void;
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

  const totalDuplicatas = transacoes.filter((t) => t.possivelDuplicata).length;
  const totalSelecionadas = transacoes.length - transacoesExcluidas.size;
  const totalErro = linhasComErro.length;

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
    </View>
  );
}

export const PreviewImportacao = memo(PreviewImportacaoBase);
