import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";

const DEBUG = {
  receitasPrevistas: 8942.10,
  receitasVariacao: 12.6,
  despesasPrevistas: 6385.40,
  despesasVariacao: -8.7,
  saldoProjetado: 2556.70,
  saldoEstavel: true,
  mesReferencia: "Junho/2026",
};

const DEBUG_MODE = true;

function VisaoGeralMesBase() {
  const cardTitleSize = moderateScale(15);
  const labelSize = moderateScale(11);
  const valueSize = moderateScale(16);
  const variationSize = moderateScale(11);

  const data = DEBUG_MODE ? DEBUG : null;

  const receitasPrevistas = data?.receitasPrevistas ?? 0;
  const receitasVariacao = data?.receitasVariacao ?? 0;
  const despesasPrevistas = data?.despesasPrevistas ?? 0;
  const despesasVariacao = data?.despesasVariacao ?? 0;
  const saldoProjetado = data?.saldoProjetado ?? 0;
  const saldoEstavel = data?.saldoEstavel ?? true;
  const mesReferencia = data?.mesReferencia ?? "";

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3.5">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Visão geral do mês
        </Text>

        <Pressable
          className="flex-row items-center gap-1 active:opacity-60"
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Selecionar mês, atualmente ${mesReferencia}`}
        >
          <Text style={{ fontSize: labelSize }} className="text-active-icon font-Inter-Medium">
            {mesReferencia}
          </Text>
          <Ionicons name="chevron-down" color={colors["active-icon"]} size={11} />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-y-3">
        {/* RECEITAS */}
        <View className="w-1/2 pr-2">
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
            Receitas previstas
          </Text>
          {/* numberOfLines simples em vez de adjustsFontSizeToFit (caro em performance):
              trunca com "..." se o valor for grande demais, sem custo de remedição */}
          <Text
            style={{ fontSize: valueSize }}
            className="text-sucess-color font-Inter-Medium mb-1"
            numberOfLines={1}
          >
            {FormatToCurrency(receitasPrevistas)}
          </Text>
          <View className="flex-row items-center gap-0.5">
            <Ionicons
              name={receitasVariacao >= 0 ? "arrow-up" : "arrow-down"}
              color={receitasVariacao >= 0 ? colors["sucess-color"] : colors["error-color"]}
              size={10}
            />
            <Text
              style={{ fontSize: variationSize }}
              className={receitasVariacao >= 0 ? "text-sucess-color" : "text-error-color"}
              numberOfLines={1}
            >
              {Math.abs(receitasVariacao)}% vs mês anterior
            </Text>
          </View>
        </View>

        {/* DESPESAS */}
        <View className="w-1/2 pl-2">
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
            Despesas previstas
          </Text>
          <Text
            style={{ fontSize: valueSize }}
            className="text-error-color font-Inter-Medium mb-1"
            numberOfLines={1}
          >
            {FormatToCurrency(despesasPrevistas)}
          </Text>
          <View className="flex-row items-center gap-0.5">
            <Ionicons
              name={despesasVariacao >= 0 ? "arrow-up" : "arrow-down"}
              color={despesasVariacao >= 0 ? colors["error-color"] : colors["sucess-color"]}
              size={10}
            />
            <Text
              style={{ fontSize: variationSize }}
              className={despesasVariacao >= 0 ? "text-error-color" : "text-sucess-color"}
              numberOfLines={1}
            >
              {Math.abs(despesasVariacao)}% vs mês anterior
            </Text>
          </View>
        </View>

        {/* SALDO PROJETADO */}
        <View className="w-full pt-3 border-t border-lines-divisions">
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
            Saldo projetado
          </Text>
          <Text
            style={{ fontSize: valueSize }}
            className="text-main-text font-Inter-Medium mb-1"
            numberOfLines={1}
          >
            {FormatToCurrency(saldoProjetado)}
          </Text>
          <Text style={{ fontSize: variationSize }} className="text-desactived-text">
            {saldoEstavel ? "＝ Estável vs mês anterior" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const VisaoGeralMes = memo(VisaoGeralMesBase);
