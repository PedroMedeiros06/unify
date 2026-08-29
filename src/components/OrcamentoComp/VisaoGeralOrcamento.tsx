import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useMemo } from "react";
import { SeletorMesAno } from "@/components/common/SeletorMesAno";
import { RESUMO_ORCAMENTO_MOCK } from "@/database/orcamentoMock";

const RADIUS = 60;
const STROKE_WIDTH = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEWBOX_SIZE = 140;
const DONUT_SIZE = 190;

type FatiaResumo = {
  label: string;
  valor: number;
  percentual: number;
  cor: string;
};

type Props = {
  anoExibido: number;
  mesExibido: number; // 0-11
  onSelecionarMesAno: (ano: number, mes: number) => void;
  onDefinirLimite?: () => void;
};

function useFatiasComOffset(fatias: FatiaResumo[]) {
  return useMemo(() => {
    let offsetAcumulado = 0;
    return fatias.map((fatia) => {
      const dash = (fatia.percentual / 100) * CIRCUMFERENCE;
      const resultado = { ...fatia, dashArray: `${dash} ${CIRCUMFERENCE - dash}`, dashOffset: -offsetAcumulado };
      offsetAcumulado += dash;
      return resultado;
    });
  }, [fatias]);
}

function VisaoGeralOrcamentoBase({ anoExibido, mesExibido, onSelecionarMesAno, onDefinirLimite }: Props) {
  const cardTitleSize = moderateScale(15);
  const centerValueSize = moderateScale(19);
  const centerLabelSize = moderateScale(11);
  const centerPercentSize = moderateScale(13);
  const legendLabelSize = moderateScale(12);
  const legendValueSize = moderateScale(14);
  const legendPercentSize = moderateScale(12);
  const avisoTextSize = moderateScale(12);
  const avisoSubtextSize = moderateScale(11);
  const buttonTextSize = moderateScale(12);

  const { receitaPrevista, gastosObrigatorios, gastosVariaveis, disponivel } = RESUMO_ORCAMENTO_MOCK;

  const percentualUtilizado = receitaPrevista > 0
    ? Math.round(((gastosObrigatorios + gastosVariaveis) / receitaPrevista) * 100)
    : 0;

  const fatias: FatiaResumo[] = [
    {
      label: "Gastos obrigatórios",
      valor: gastosObrigatorios,
      percentual: receitaPrevista > 0 ? (gastosObrigatorios / receitaPrevista) * 100 : 0,
      cor: colors["sucess-color"],
    },
    {
      label: "Gastos variáveis",
      valor: gastosVariaveis,
      percentual: receitaPrevista > 0 ? (gastosVariaveis / receitaPrevista) * 100 : 0,
      cor: colors["error-color"],
    },
    {
      label: "Disponível",
      valor: disponivel,
      percentual: receitaPrevista > 0 ? (disponivel / receitaPrevista) * 100 : 0,
      cor: colors["desactived-text"],
    },
  ];

  const fatiasComOffset = useFatiasComOffset(fatias);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Visão geral do orçamento
        </Text>
        <SeletorMesAno ano={anoExibido} mes={mesExibido} onSelecionar={onSelecionarMesAno} alinhamento="direita" />
      </View>

      <View className="flex-row items-center gap-5">
        {/* DONUT */}
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
              stroke={colors["active-icon"]}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {fatiasComOffset.map((fatia, index) => (
              <Circle
                key={`${fatia.label}-${index}`}
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
            <Text style={{ fontSize: centerValueSize }} className="text-main-text font-Inter-Bold" numberOfLines={1}>
              {FormatToCurrency(gastosObrigatorios + gastosVariaveis)}
            </Text>
            <Text style={{ fontSize: centerLabelSize }} className="text-desactived-text mb-1">
              Utilizado
            </Text>
            <Text style={{ fontSize: centerPercentSize }} className="text-main-text font-Inter-SemiBold">
              {percentualUtilizado}%
            </Text>
          </View>
        </View>

        {/* LEGENDA */}
        <View className="flex-1 gap-3.5">
          <LegendaLinha
            cor={colors["active-icon"]}
            label="Receita prevista"
            valor={receitaPrevista}
            percentual={100}
            labelSize={legendLabelSize}
            valueSize={legendValueSize}
            percentSize={legendPercentSize}
          />
          <LegendaLinha
            cor={colors["sucess-color"]}
            label="Gastos obrigatórios"
            valor={gastosObrigatorios}
            percentual={Math.round((gastosObrigatorios / receitaPrevista) * 100)}
            labelSize={legendLabelSize}
            valueSize={legendValueSize}
            percentSize={legendPercentSize}
          />
          <LegendaLinha
            cor={colors["error-color"]}
            label="Gastos variáveis"
            valor={gastosVariaveis}
            percentual={Math.round((gastosVariaveis / receitaPrevista) * 100)}
            labelSize={legendLabelSize}
            valueSize={legendValueSize}
            percentSize={legendPercentSize}
          />
          <LegendaLinha
            cor={colors["desactived-text"]}
            label="Disponível"
            valor={disponivel}
            percentual={Math.round((disponivel / receitaPrevista) * 100)}
            labelSize={legendLabelSize}
            valueSize={legendValueSize}
            percentSize={legendPercentSize}
          />
        </View>
      </View>

      {/* AVISO + AÇÃO */}
      <View className="flex-row items-center gap-3 bg-active-icon/10 border border-active-icon/30 rounded-xl p-3 mt-4">
        <View className="w-10 h-10 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
          <Ionicons name="rocket-outline" color={colors["active-icon"]} size={18} />
        </View>

        <View className="flex-1">
          <Text style={{ fontSize: avisoTextSize }} className="text-main-text" numberOfLines={2}>
            Você ainda tem <Text className="text-active-icon font-Inter-SemiBold">{FormatToCurrency(disponivel)} disponíveis</Text>
          </Text>
          <Text style={{ fontSize: avisoSubtextSize }} className="text-second-text mt-0.5">
            Mantenha o foco e continue assim!
          </Text>
        </View>

        <Pressable
          onPress={onDefinirLimite}
          className="border border-active-icon rounded-lg px-3 py-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Definir limite do orçamento"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-active-icon font-Inter-Medium">
            Definir limite
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const LegendaLinha = memo(function LegendaLinha({
  cor,
  label,
  valor,
  percentual,
  labelSize,
  valueSize,
  percentSize,
}: {
  cor: string;
  label: string;
  valor: number;
  percentual: number;
  labelSize: number;
  valueSize: number;
  percentSize: number;
}) {
  return (
    <View className="flex-row items-start justify-between">
      <View className="flex-row items-start gap-2 flex-1 pr-2">
        <View style={{ backgroundColor: cor }} className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" />
        <View>
          <Text style={{ fontSize: labelSize }} className="text-second-text" numberOfLines={1}>
            {label}
          </Text>
          <Text style={{ fontSize: valueSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
            {FormatToCurrency(valor)}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: percentSize }} className="text-desactived-text">
        {percentual}%
      </Text>
    </View>
  );
});

export const VisaoGeralOrcamento = memo(VisaoGeralOrcamentoBase);