import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable, FlatList } from "react-native";
import { memo } from "react";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";

const TransacaoItem = memo(function TransacaoItem({
  item,
  isLast,
}: {
  item: Transacao;
  isLast: boolean;
}) {
  const itemTitleSize = moderateScale(14);
  const itemSubtitleSize = moderateScale(12);
  const bankLogoSize = moderateScale(24);

  const isEntrada = item.tipo === "entrada";

  return (
    <View className={`py-3 flex-row justify-between items-center ${isLast ? "" : "border-b border-lines-divisions/30"}`}>
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View className="w-10 h-10 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
          <Ionicons
            name={(item.categoriaIcone as keyof typeof Ionicons.glyphMap) ?? "swap-horizontal-outline"}
            color={colors["active-icon"]}
            size={20}
          />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text" numberOfLines={1}>
            {item.subtitulo}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 flex-shrink-0">
        <View className="items-end">
          <Text
            style={{ fontSize: itemTitleSize }}
            className={isEntrada ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
            numberOfLines={1}
          >
            {isEntrada ? "+ " : ""}
            {FormatToCurrency(item.valor)}
          </Text>
          <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">
            {item.data}
          </Text>
        </View>
        <View
          style={{ width: bankLogoSize, height: bankLogoSize, backgroundColor: item.banco.cor }}
          className="rounded-md items-center justify-center"
        >
          <Text style={{ fontSize: 9 }} className="text-white font-Inter-Bold">
            {item.banco.sigla}
          </Text>
        </View>
      </View>
    </View>
  );
});

function UltimasTransacoesBase() {
  const sectionTitleSize = moderateScale(20);
  const actionTextSize = moderateScale(12);
  const itemTitleSize = moderateScale(14);

  const { transacoes } = useTransacoes();

  // Mostra só as 5 mais recentes na Home — "Ver todas" leva pra tela cheia
  const transacoesRecentes = transacoes.slice(0, 5);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl px-4 py-4 flex-col gap-4">
      {/* 1. HEADER */}
      <View className="flex-col gap-4">
        <View className="flex-row justify-between items-center">
          <Text
            style={{ fontSize: sectionTitleSize, letterSpacing: sectionTitleSize * -0.03 }}
            className="text-main-text font-Inter-SemiBold"
          >
            Últimas transações
          </Text>

          <Pressable className="flex-row items-center gap-1 active:opacity-60" hitSlop={10} accessibilityRole="button" accessibilityLabel="Ver todas as transações">
            <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
              Ver todas
            </Text>
            <Ionicons name="arrow-forward" color={colors["active-icon"]} size={14} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between flex-wrap gap-y-2">
          <View className="flex-row flex-wrap gap-1.5 flex-1 pr-1">
            <Pressable className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Filtrar por banco">
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Todos os bancos</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>

            <Pressable className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Filtrar por período">
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Hoje</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>

            <Pressable className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Filtrar por categoria">
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Categorias</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>
          </View>

          <Pressable className="p-1 active:opacity-60" hitSlop={8} accessibilityRole="button" accessibilityLabel="Pesquisar transações">
            <Ionicons name="search-outline" color={colors["second-text"]} size={18} />
          </Pressable>
        </View>
      </View>

      {/* 2. LISTA */}
      <FlatList
        data={transacoesRecentes}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <TransacaoItem item={item} isLast={index === transacoesRecentes.length - 1} />
        )}
      />

      {/* 3. BOTÃO ADICIONAR */}
      <Pressable
        className="w-full py-2 rounded-xl border border-dashed border-input-border flex-row items-center justify-center gap-2 active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel="Adicionar transação"
      >
        <Ionicons name="add" color={colors["active-icon"]} size={18} />
        <Text style={{ fontSize: itemTitleSize }} className="text-active-icon font-Inter-Medium">
          Adicionar transação
        </Text>
      </Pressable>
    </View>
  );
}

export const UltimasTransacoes = memo(UltimasTransacoesBase);
