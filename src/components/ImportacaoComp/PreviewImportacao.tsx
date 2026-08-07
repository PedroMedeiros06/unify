import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, FlatList } from "react-native";
import { memo } from "react";
import { ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";

const TAMANHO_AMOSTRA = 5;

const ItemAmostra = memo(function ItemAmostra({
  item,
  isLast,
}: {
  item: TransacaoImportada;
  isLast: boolean;
}) {
  const nomeSize = moderateScale(12);
  const valorSize = moderateScale(12);

  const [ano, mes, dia] = item.data.split("-");

  return (
    <View className={`flex-row justify-between items-center py-2 ${isLast ? "" : "border-b border-lines-divisions/50"}`}>
      <View className="flex-1 pr-2">
        <Text style={{ fontSize: nomeSize }} className="text-main-text" numberOfLines={1}>
          {item.descricao}
        </Text>
        <Text style={{ fontSize: nomeSize - 1 }} className="text-desactived-text">
          {dia}/{mes}/{ano}
        </Text>
      </View>
      <Text
        style={{ fontSize: valorSize }}
        className={item.tipo === "entrada" ? "text-sucess-color font-Inter-Medium" : "text-main-text font-Inter-Medium"}
      >
        {item.tipo === "entrada" ? "+ " : "- "}
        {FormatToCurrency(item.valor)}
      </Text>
    </View>
  );
});

type Props = {
  resultado: ResultadoParse;
  nomeBanco: string;
  nomeArquivo: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  salvando: boolean;
};

function PreviewImportacaoBase({ resultado, nomeBanco, nomeArquivo, onConfirmar, onCancelar, salvando }: Props) {
  const titleSize = moderateScale(15);
  const subtitleSize = moderateScale(11);
  const countLabelSize = moderateScale(11);
  const countValueSize = moderateScale(20);
  const sectionTitleSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  const totalSucesso = resultado.transacoes.length;
  const totalErro = resultado.linhasComErro.length;
  const amostra = resultado.transacoes.slice(0, TAMANHO_AMOSTRA);

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

      {/* CONTADORES */}
      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1 bg-sucess-color/10 border border-sucess-color/30 rounded-xl p-3 items-center">
          <Text style={{ fontSize: countValueSize }} className="text-sucess-color font-Inter-SemiBold">
            {totalSucesso}
          </Text>
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
            transações identificadas
          </Text>
        </View>

        {totalErro > 0 && (
          <View className="flex-1 bg-warn-color/10 border border-warn-color/30 rounded-xl p-3 items-center">
            <Text style={{ fontSize: countValueSize }} className="text-warn-color font-Inter-SemiBold">
              {totalErro}
            </Text>
            <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
              linhas ignoradas
            </Text>
          </View>
        )}
      </View>

      {totalErro > 0 && (
        <View className="flex-row items-start gap-2 bg-warn-color/10 rounded-lg p-2.5 mb-4">
          <Ionicons name="information-circle-outline" color={colors["warn-color"]} size={14} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text flex-1">
            Algumas linhas não puderam ser interpretadas e serão ignoradas. As demais transações serão importadas normalmente.
          </Text>
        </View>
      )}

      {/* AMOSTRA */}
      {amostra.length > 0 && (
        <View className="mb-4">
          <Text style={{ fontSize: sectionTitleSize }} className="text-second-text font-Inter-Medium mb-2">
            Prévia (primeiras {amostra.length} de {totalSucesso})
          </Text>
          <View className="bg-input-background border border-lines-divisions rounded-xl px-3">
            <FlatList
              data={amostra}
              keyExtractor={(_, index) => `${index}`}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <ItemAmostra item={item} isLast={index === amostra.length - 1} />
              )}
            />
          </View>
        </View>
      )}

      {totalSucesso === 0 && (
        <View className="items-center py-4 mb-2">
          <Ionicons name="alert-circle-outline" color={colors["error-color"]} size={28} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center mt-2">
            Nenhuma transação pôde ser identificada neste arquivo.
          </Text>
        </View>
      )}

      {/* AÇÕES */}
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
          disabled={salvando || totalSucesso === 0}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${totalSucesso > 0 && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
          accessibilityRole="button"
          accessibilityLabel="Confirmar importação"
          accessibilityState={{ disabled: salvando || totalSucesso === 0 }}
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
            {salvando ? "Importando..." : `Importar ${totalSucesso} transações`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PreviewImportacao = memo(PreviewImportacaoBase);
