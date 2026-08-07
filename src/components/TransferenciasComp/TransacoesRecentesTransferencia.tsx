import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, FlatList } from "react-native";
import { memo } from "react";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";

const TransferenciaItem = memo(function TransferenciaItem({
  item,
  isLast,
}: {
  item: Transacao;
  isLast: boolean;
}) {
  const nomeSize = moderateScale(13);
  const subtituloSize = moderateScale(11);
  const valorSize = moderateScale(14);
  const statusSize = moderateScale(10);

  const isEntrada = item.tipo === "entrada";
  const statusLabel = item.status === "pendente" ? "Pendente" : item.status === "agendada" ? "Agendada" : "Concluída";
  const statusColor = item.status === "pendente" ? colors["warn-color"] : colors["sucess-color"];

  return (
    <Pressable
      className={`flex-row items-center justify-between py-3 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes: ${item.nome}, ${FormatToCurrency(item.valor)}`}
    >
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View
          style={{ backgroundColor: item.banco.cor }}
          className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
        >
          <Text style={{ fontSize: 11 }} className="text-white font-Inter-Bold">
            {item.banco.sigla}
          </Text>
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: nomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
            {item.subtitulo}
          </Text>
          <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
            {item.data}
            {item.hora ? ` - ${item.hora}` : ""}
          </Text>
        </View>
      </View>

      <View className="items-end flex-shrink-0 flex-row gap-2">
        <View className="items-end">
          <Text
            style={{ fontSize: valorSize }}
            className={isEntrada ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
            numberOfLines={1}
          >
            {isEntrada ? "+ " : "- "}
            {FormatToCurrency(item.valor)}
          </Text>
          <Text style={{ fontSize: statusSize, color: statusColor }} className="font-Inter-Medium">
            {statusLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
      </View>
    </Pressable>
  );
});

function TransacoesRecentesTransferenciaBase() {
  const cardTitleSize = moderateScale(15);

  const { transacoes } = useTransacoes();
  const recentes = transacoes.slice(0, 4);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Transações recentes
        </Text>
        <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Ver todas as transações">
          <Text style={{ fontSize: moderateScale(12) }} className="text-active-icon font-Inter-Medium">
            Ver todas
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={recentes}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <TransferenciaItem item={item} isLast={index === recentes.length - 1} />
        )}
      />
    </View>
  );
}

export const TransacoesRecentesTransferencia = memo(TransacoesRecentesTransferenciaBase);
