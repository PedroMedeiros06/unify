import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { memo, useMemo } from "react";
import { PontoSerie } from "@/utils/simulacoes";

type Props = {
  serie: PontoSerie[];
  // Formata o rótulo do eixo X (ex: "48 meses"). Recebe o valor de x.
  formatarX: (x: number) => string;
  // Formata o rótulo do eixo Y (ex: "R$ 120 mil"). Recebe o valor de y.
  formatarY: (y: number) => string;
  altura?: number;
};

const PADDING_ESQ = 54; // espaço para os rótulos do eixo Y
const PADDING_DIR = 12;
const PADDING_TOPO = 12;
const PADDING_BASE = 26; // espaço para os rótulos do eixo X
const LINHAS_GRADE = 4;
const ROTULOS_X = 6;

function construirPath(pontos: { x: number; y: number }[]): string {
  return pontos
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
}

function GraficoLinhaSimulacaoBase({ serie, formatarX, formatarY, altura = 200 }: Props) {
  const rotuloSize = moderateScale(9);

  // O componente mede a própria largura via layout — mas para simplificar
  // e evitar um estado de layout, usamos uma largura fixa de viewBox e
  // deixamos o SVG escalar com `width="100%"`.
  const largura = 320;

  const { pathLinha, pathArea, ultimoPonto, linhasGrade, rotulosX, rotulosY } = useMemo(() => {
    const xs = serie.map((p) => p.x);
    const ys = serie.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const larguraPlot = largura - PADDING_ESQ - PADDING_DIR;
    const alturaPlot = altura - PADDING_TOPO - PADDING_BASE;

    const projetar = (p: PontoSerie) => ({
      x: PADDING_ESQ + ((p.x - minX) / rangeX) * larguraPlot,
      y: PADDING_TOPO + (1 - (p.y - minY) / rangeY) * alturaPlot,
    });

    const pontosProjetados = serie.map(projetar);
    const pathLinha = construirPath(pontosProjetados);

    const primeiro = pontosProjetados[0];
    const ultimo = pontosProjetados[pontosProjetados.length - 1];
    const base = PADDING_TOPO + alturaPlot;
    const pathArea = `${pathLinha} L ${ultimo.x} ${base} L ${primeiro.x} ${base} Z`;

    const linhasGrade = Array.from({ length: LINHAS_GRADE + 1 }, (_, i) => {
      const frac = i / LINHAS_GRADE;
      return {
        y: PADDING_TOPO + frac * alturaPlot,
        valor: maxY - frac * rangeY,
      };
    });

    const rotulosX = Array.from({ length: ROTULOS_X }, (_, i) => {
      const frac = i / (ROTULOS_X - 1);
      const valorX = minX + frac * rangeX;
      return {
        x: PADDING_ESQ + frac * larguraPlot,
        valor: valorX,
      };
    });

    return {
      pathLinha,
      pathArea,
      ultimoPonto: ultimo,
      linhasGrade,
      rotulosX,
      rotulosY: linhasGrade,
    };
  }, [serie, altura]);

  return (
    <View>
      <Svg width="100%" height={altura} viewBox={`0 0 ${largura} ${altura}`}>
        <Defs>
          <LinearGradient id="areaSimulacao" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors["active-icon"]} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors["active-icon"]} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Linhas de grade horizontais */}
        {linhasGrade.map((linha, i) => (
          <Line
            key={`grade-${i}`}
            x1={PADDING_ESQ}
            y1={linha.y}
            x2={largura - PADDING_DIR}
            y2={linha.y}
            stroke={colors["lines-divisions"]}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        <Path d={pathArea} fill="url(#areaSimulacao)" />
        <Path d={pathLinha} stroke={colors["active-icon"]} strokeWidth={2.5} fill="none" />
        <Circle cx={ultimoPonto.x} cy={ultimoPonto.y} r={4} fill={colors["active-icon"]} />
      </Svg>

      {/* Rótulos do eixo Y — sobrepostos à esquerda, alinhados às linhas de grade */}
      <View className="absolute left-0 top-0" style={{ height: altura, width: PADDING_ESQ - 6 }}>
        {rotulosY.map((linha, i) => (
          <Text
            key={`roty-${i}`}
            style={{
              fontSize: rotuloSize,
              position: "absolute",
              top: (linha.y / altura) * altura - rotuloSize / 2,
              right: 0,
            }}
            className="text-desactived-text"
            numberOfLines={1}
          >
            {formatarY(linha.valor)}
          </Text>
        ))}
      </View>

      {/* Rótulos do eixo X */}
      <View className="flex-row justify-between mt-1" style={{ marginLeft: PADDING_ESQ, marginRight: PADDING_DIR }}>
        {rotulosX.map((rotulo, i) => (
          <Text key={`rotx-${i}`} style={{ fontSize: rotuloSize }} className="text-desactived-text">
            {formatarX(rotulo.valor)}
          </Text>
        ))}
      </View>
    </View>
  );
}

export const GraficoLinhaSimulacao = memo(GraficoLinhaSimulacaoBase);
