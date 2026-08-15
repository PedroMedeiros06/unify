import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo, useCallback, useState } from "react";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";
import { EditarTransacaoModal } from "@/components/TransacoesComp/EditarTransacaoModal";
import { ListaTransacoesSkeleton } from "@/components/common/ListaTransacoesSkeleton";

const TransferenciaItem = memo(function TransferenciaItem({
  item,
  isLast,
  onLongPress,
}: {
  item: Transacao;
  isLast: boolean;
  onLongPress: (transacao: Transacao) => void;
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
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      className={`flex-row items-center justify-between py-3 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${FormatToCurrency(item.valor)}. Toque e segure para editar ou excluir.`}
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
  const emptyTitleSize = moderateScale(13);

  const { transacoes, carregando, editarTransacao, removerTransacao } = useTransacoes();
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);

  const recentes = transacoes.slice(0, 4);

  const handleLongPress = useCallback((transacao: Transacao) => {
    setTransacaoSelecionada(transacao);
  }, []);

  const handleFecharModal = useCallback(() => {
    setTransacaoSelecionada(null);
  }, []);

  if (carregando) {
    return <ListaTransacoesSkeleton linhas={4} />;
  }

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

      {recentes.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="swap-horizontal-outline" color={colors["desactived-text"]} size={30} />
          <Text style={{ fontSize: emptyTitleSize }} className="text-desactived-text text-center mt-2">
            Nenhuma transferência ainda.
          </Text>
        </View>
      ) : (
        recentes.map((item, index) => (
          <TransferenciaItem
            key={item.id}
            item={item}
            isLast={index === recentes.length - 1}
            onLongPress={handleLongPress}
          />
        ))
      )}

      <EditarTransacaoModal
        transacao={transacaoSelecionada}
        onFechar={handleFecharModal}
        onSalvar={editarTransacao}
        onExcluir={removerTransacao}
      />
    </View>
  );
}

export const TransacoesRecentesTransferencia = memo(TransacoesRecentesTransferenciaBase);
