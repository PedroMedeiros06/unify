import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { memo, useEffect, useMemo, useState } from "react";
import { obterResumoPrevistoDoMes } from "@/database/orcamentoQueries";
import { calcularResumoReceitasDespesas } from "@/database/queries";
import { dataHojeIso } from "@/utils/dateUtils";

type Props = {
  onEditarOrcamento?: () => void;
};

function OrcamentoMensalBase({ onEditarOrcamento }: Props) {
  const cardTitleSize = moderateScale(15);
  const labelSize = moderateScale(12);
  const percentSize = moderateScale(14);
  const subtitleSize = moderateScale(11);

  // Sem seletor de mês aqui (fica na aba Resumo) — sempre o mês corrente,
  // igual VisaoGeralMes.
  const hojeIso = useMemo(() => dataHojeIso(), []);
  const [ano, mesHumano] = useMemo(() => hojeIso.split("-").map(Number), [hojeIso]);
  const mesAno = useMemo(() => hojeIso.slice(0, 7), [hojeIso]);

  // Base (100%) = receita prevista do mês.
  // "Utilizado" = despesa prevista + despesa realizada — quanto da
  // receita prevista já está comprometido (planejado + já gasto).
  const [dados, setDados] = useState<{
    receitaPrevista: number;
    despesaPrevista: number;
    despesaRealizada: number;
  } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    Promise.all([
      obterResumoPrevistoDoMes(mesAno),
      calcularResumoReceitasDespesas(ano, mesHumano),
    ])
      .then(([previsto, realizado]) => {
        if (!ativo) return;
        setDados({
          receitaPrevista: previsto.receitasPrevistas,
          despesaPrevista: previsto.despesasPrevistas,
          despesaRealizada: realizado.despesasMesAtual,
        });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [mesAno, ano, mesHumano]);

  const valorUtilizado = (dados?.despesaPrevista ?? 0) + (dados?.despesaRealizada ?? 0);
  const valorTotal = dados?.receitaPrevista ?? 0;

  const percentual = valorTotal > 0 ? Math.min(100, Math.round((valorUtilizado / valorTotal) * 100)) : 0;
  const estourou = valorTotal > 0 && valorUtilizado > valorTotal;
  const corPercentual = estourou ? colors["error-color"] : colors["active-icon"];

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Orçamento mensal
        </Text>
        <Pressable onPress={onEditarOrcamento} hitSlop={10} accessibilityRole="button" accessibilityLabel="Editar orçamento">
          <Text style={{ fontSize: moderateScale(12) }} className="text-active-icon font-Inter-Medium">
            Editar orçamento
          </Text>
        </Pressable>
      </View>

      {carregando ? (
        <View className="items-center py-4">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : valorTotal <= 0 ? (
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
            <Ionicons name="wallet-outline" color={colors["active-icon"]} size={17} />
          </View>
          <Text style={{ fontSize: subtitleSize }} className="text-desactived-text flex-1" numberOfLines={2}>
            Nenhuma receita prevista para este mês. Cadastre recorrências de receita para acompanhar o orçamento.
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
            <Ionicons name="wallet-outline" color={colors["active-icon"]} size={17} />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-baseline mb-1">
              <Text style={{ fontSize: labelSize }} className="text-main-text">
                Orçamento utilizado
              </Text>
              <Text style={{ fontSize: percentSize, color: corPercentual }} className="font-Inter-SemiBold">
                {percentual}%
              </Text>
            </View>

            <Text style={{ fontSize: subtitleSize }} className="text-desactived-text mb-2" numberOfLines={1}>
              {FormatToCurrency(valorUtilizado)} de {FormatToCurrency(valorTotal)}
            </Text>

            <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden">
              <View
                style={{ width: `${percentual}%`, backgroundColor: corPercentual }}
                className="h-full rounded-full"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export const OrcamentoMensal = memo(OrcamentoMensalBase);
