import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { View, Text, ActivityIndicator } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useEffect, useMemo, useState } from "react";
import { listarResumoPorCategoria, FiltrosTransacao } from "@/database/queries";
import { obterCategoriaPorId } from "@/database/categorias";

type Props = {
  filtrosParaQuery: FiltrosTransacao;
};

type FatiaExibicao = {
  nome: string;
  cor: string;
  valor: number;
  percentual: number;
};

const RADIUS = 42;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEWBOX_SIZE = 100;
const DONUT_SIZE = 120; // tamanho fixo — evita recalcular com useWindowDimensions

function useFatiasComOffset(fatias: FatiaExibicao[]) {
  return useMemo(() => {
    let offsetAcumulado = 0;
    return fatias.map((fatia) => {
      const dash = (fatia.percentual / 100) * CIRCUMFERENCE;
      const resultado = {
        ...fatia,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -offsetAcumulado,
      };
      offsetAcumulado += dash;
      return resultado;
    });
  }, [fatias]);
}

function DistribuicaoOrcamentoBase({ filtrosParaQuery }: Props) {
  const cardTitleSize = moderateScale(15);
  const legendTextSize = moderateScale(11);
  const centerValueSize = moderateScale(12);
  const centerLabelSize = moderateScale(9);
  const emptyTextSize = moderateScale(12);

  const [carregando, setCarregando] = useState(true);
  const [fatias, setFatias] = useState<FatiaExibicao[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      try {
        // GROUP BY categoria_id direto no banco, respeitando os filtros
        // atuais (banco/período/categoria) — nenhuma agregação em JS.
        const resumo = await listarResumoPorCategoria(filtrosParaQuery);

        // Só saídas entram na distribuição de orçamento (é sobre gasto,
        // não sobre saldo). Categorias sem nenhuma saída no período
        // filtrado não aparecem na legenda.
        const comSaida = resumo.filter((r) => r.totalSaidas > 0);
        const totalGeral = comSaida.reduce((acc, r) => acc + r.totalSaidas, 0);

        const fatiasCalculadas: FatiaExibicao[] = comSaida.map((r) => {
          const categoria = obterCategoriaPorId(r.categoriaId);
          return {
            nome: categoria?.nome ?? "Sem categoria",
            cor: categoria?.cor ?? colors["desactived-text"],
            valor: r.totalSaidas,
            percentual: totalGeral > 0 ? (r.totalSaidas / totalGeral) * 100 : 0,
          };
        });

        // Maior fatia primeiro — leitura mais natural da legenda.
        fatiasCalculadas.sort((a, b) => b.valor - a.valor);

        if (ativo) {
          setFatias(fatiasCalculadas);
          setTotal(totalGeral);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [filtrosParaQuery]);

  const fatiasComOffset = useFatiasComOffset(fatias);
  const totalFormatado = FormatToCurrency(total);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text
        style={{ fontSize: cardTitleSize }}
        className="text-main-text font-Inter-Medium mb-3.5"
      >
        Distribuição do orçamento
      </Text>

      {carregando ? (
        <View className="items-center py-8">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : fatias.length === 0 ? (
        <View className="items-center py-6">
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center">
            Nenhuma despesa encontrada para os filtros atuais.
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-4">
          {/* DONUT — tamanho fixo, sem depender de useWindowDimensions */}
          <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }} className="items-center justify-center flex-shrink-0">
            <Svg
              viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              style={{ transform: [{ rotate: "-90deg" }] }}
            >
              <Circle
                cx={VIEWBOX_SIZE / 2}
                cy={VIEWBOX_SIZE / 2}
                r={RADIUS}
                stroke={colors["lines-divisions"]}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {fatiasComOffset.map((fatia, index) => (
                <Circle
                  key={`${fatia.nome}-${index}`}
                  cx={VIEWBOX_SIZE / 2}
                  cy={VIEWBOX_SIZE / 2}
                  r={RADIUS}
                  stroke={fatia.cor}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={fatia.dashArray}
                  strokeDashoffset={fatia.dashOffset}
                  fill="none"
                />
              ))}
            </Svg>

            <View className="absolute items-center justify-center px-1">
              <Text
                style={{ fontSize: centerValueSize }}
                className="text-main-text font-Inter-SemiBold"
                numberOfLines={1}
              >
                {totalFormatado}
              </Text>
              <Text style={{ fontSize: centerLabelSize }} className="text-desactived-text">
                Total no período
              </Text>
            </View>
          </View>

          {/* LEGENDA */}
          <View className="flex-1 gap-2">
            {fatias.map((fatia) => (
              <View key={fatia.nome} className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1.5 flex-shrink">
                  <View
                    style={{ width: 8, height: 8, backgroundColor: fatia.cor }}
                    className="rounded-sm"
                  />
                  <Text style={{ fontSize: legendTextSize }} className="text-main-text" numberOfLines={1}>
                    {fatia.nome}
                  </Text>
                </View>
                <Text style={{ fontSize: legendTextSize }} className="text-second-text">
                  {fatia.percentual.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// memo() evita re-render se o componente pai atualizar sem mudar dados relevantes
export const DistribuicaoOrcamento = memo(DistribuicaoOrcamentoBase);
