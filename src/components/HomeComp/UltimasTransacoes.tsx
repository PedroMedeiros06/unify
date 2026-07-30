import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable } from "react-native";

export function UltimasTransacoes() {
  // Padronização de escalas dinâmicas baseadas no seu design
  const sectionTitleSize = moderateScale(20);
  const actionTextSize = moderateScale(12);
  const itemTitleSize = moderateScale(14);
  const itemSubtitleSize = moderateScale(12);
  const bankLogoSize = moderateScale(24);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl px-4 py-4 flex-col gap-4">
      
      {/* 1. HEADER */}
      <View className="flex-col gap-4">

        {/* TÍTULO */}
        <View className="flex-row justify-between items-center">
          <Text
            style={{ fontSize: sectionTitleSize, letterSpacing: sectionTitleSize * -0.03 }}
            className="text-main-text font-Inter-SemiBold"
          >
            Últimas transações
          </Text>
          
          <Pressable
            className="flex-row items-center gap-1 active:opacity-60"
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ver todas as transações"
          >
            <Text 
              style={{ fontSize: actionTextSize }}
              className="text-active-icon font-Inter-Medium"
            >
              Ver todas
            </Text>
            <Ionicons name="arrow-forward" color={colors["active-icon"]} size={14} />
          </Pressable>
        </View>

        {/* FILTROS */}
    <View className="flex-row items-center justify-between flex-wrap gap-y-2">
          <View className="flex-row flex-wrap gap-1.5 flex-1 pr-1">
            
            {/* Dropdown 1 */}
            <Pressable
              className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="Filtrar por banco"
            >
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Todos os bancos</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>
            
            {/* Dropdown 2 */}
            <Pressable
              className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="Filtrar por período"
            >
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Hoje</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>

            {/* Dropdown 3 */}
            <Pressable
              className="bg-input-background/50 px-2 py-1.5 rounded-lg border border-lines-divisions flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="Filtrar por categoria"
            >
              <Text style={{ fontSize: actionTextSize }} className="text-main-text font-Inter-Regular">Categorias</Text>
              <Ionicons name="chevron-down" color={colors["second-text"]} size={10} />
            </Pressable>
          </View>

          {/* Ícone de Lupa para pesquisa */}
          <Pressable
            className="p-1 active:opacity-60"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Pesquisar transações"
          >
            <Ionicons name="search-outline" color={colors["second-text"]} size={18} />
          </Pressable>
        </View>
      </View>

      {/* 2. LISTA DE TRANSAÇÕES */}
      <View className="flex-col h-47">
        {/* Exemplo de Linha de Transação (UBER) */}
        <View className="py-3 flex-row justify-between items-center border-b border-lines-divisions/30">
          <View className="flex-row items-center gap-3">
            {/* Ícone da Categoria Redondo */}
            <View className="w-10 h-10 rounded-full bg-purple-icon-bg/20 items-center justify-center">
              <Ionicons name="car-outline" color={colors["active-icon"]} size={20} />
            </View>
            <View className="flex-col">
              <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium">UBER</Text>
              <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">Transporte</Text>
            </View>
          </View>

          {/* Lado Direito: Valor, Data e Banco */}
          <View className="flex-row items-center gap-2">
            <View className="flex-col items-end">
              <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-SemiBold">R$ 25,50</Text>
              <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">05/06/2026</Text>
            </View>
            {/* Logo do Banco (Simulado por uma caixinha com a cor do Nubank) */}
            <View 
              style={{ width: bankLogoSize, height: bankLogoSize }} 
              className="bg-nubank-purple rounded-md items-center justify-center"
            >
              {/* Aqui entraria a logo do Nubank */}
            </View>
          </View>
        </View>

        {/* Exemplo de Linha de Transação (Transferência Recebida) */}
        <View className="py-3 flex-row justify-between items-center border-b border-lines-divisions/30">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-purple-icon-bg/20 items-center justify-center">
              <Ionicons name="swap-horizontal-outline" color={colors["active-icon"]} size={20} />
            </View>
            <View className="flex-col">
              <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium">Transferência recebida</Text>
              <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">Transferência</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="flex-col items-end">
              <Text style={{ fontSize: itemTitleSize }} className="text-sucess-color font-Inter-SemiBold">+ R$ 2.500,00</Text>
              <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">05/06/2026</Text>
            </View>
            <View style={{ width: bankLogoSize, height: bankLogoSize }} className="bg-inter-orange rounded-md" />
          </View>
        </View>
      </View>

      {/* 3. BOTÃO ADICIONAR TRANSAÇÃO */}
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