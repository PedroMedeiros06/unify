import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useMemo, useState } from "react";
import { CampoMoeda, CampoNumero, CampoTaxa } from "@/components/SimulacoesComp/CamposSimulacao";
import { SeletorTaxaReferencia } from "@/components/SimulacoesComp/SeletorTaxaReferencia";
import { StatTilesSimulacao, CORES_TILE } from "@/components/SimulacoesComp/StatTilesSimulacao";
import { GraficoLinhaSimulacao } from "@/components/SimulacoesComp/GraficoLinhaSimulacao";
import { BlocoAcoesSimulacao } from "@/components/SimulacoesComp/BlocoAcoesSimulacao";
import { simularInvestimento, ParametrosInvestimento } from "@/utils/simulacoes";
import { FormatToCurrency } from "@/utils/formatNumber";

function formatarMilhar(valor: number): string {
  if (Math.abs(valor) >= 1000) return `R$ ${Math.round(valor / 1000)} mil`;
  return `R$ ${Math.round(valor)}`;
}

type Props = {
  parametrosIniciais?: ParametrosInvestimento;
};

function SimuladorInvestimentoBase({ parametrosIniciais }: Props) {
  const tituloSecaoSize = moderateScale(15);
  const legendaSize = moderateScale(11);

  const [aporteInicial, setAporteInicial] = useState(parametrosIniciais?.aporteInicial ?? 0);
  const [aporteMensal, setAporteMensal] = useState(parametrosIniciais?.aporteMensal ?? 0);
  const [meses, setMeses] = useState(parametrosIniciais?.meses ?? 60);
  const [taxaAnualPct, setTaxaAnualPct] = useState(parametrosIniciais?.taxaAnualPct ?? 0);

  const parametros: ParametrosInvestimento = { aporteInicial, aporteMensal, meses, taxaAnualPct };
  const resultado = useMemo(() => simularInvestimento(parametros), [parametros]);

  const tiles = [
    { icone: "wallet-outline" as const, cor: CORES_TILE[0], rotulo: "Montante final", valor: FormatToCurrency(resultado.montanteFinal) },
    { icone: "cash-outline" as const, cor: CORES_TILE[3], rotulo: "Total investido", valor: FormatToCurrency(resultado.totalInvestido) },
    { icone: "trending-up-outline" as const, cor: CORES_TILE[1], rotulo: "Rendimento", valor: FormatToCurrency(resultado.rendimento) },
    { icone: "stats-chart-outline" as const, cor: CORES_TILE[2], rotulo: "Rentabilidade", valor: `${resultado.rendimentoPct.toFixed(1)}%` },
  ];

  return (
    <View className="flex-col gap-4">
      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-1">
          Simulação de investimento
        </Text>
        <Text style={{ fontSize: legendaSize }} className="text-second-text mb-4">
          Veja quanto seu dinheiro pode render ao longo do tempo.
        </Text>

        <View className="flex-row gap-3 mb-4">
          <CampoMoeda label="Aporte inicial" valor={aporteInicial} onChange={setAporteInicial} />
          <CampoMoeda label="Aporte mensal" valor={aporteMensal} onChange={setAporteMensal} />
        </View>

        <View className="flex-row items-start gap-3 mb-4">
          <CampoNumero label="Período" valor={meses} onChange={setMeses} sufixo="meses" />
          {/* Atalho: preenche o campo de rentabilidade abaixo com uma
              taxa real do mercado (Selic/CDI/poupança/IPCA). */}
          <SeletorTaxaReferencia onSelecionar={setTaxaAnualPct} valorAtual={taxaAnualPct} />
        </View>

        <CampoTaxa
          label="Rentabilidade ao ano"
          valor={taxaAnualPct}
          onChange={setTaxaAnualPct}
          minimo={0}
          maximo={30}
        />
      </View>

      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-3">
          Resultado da simulação
        </Text>

        <StatTilesSimulacao tiles={tiles} />

        <View className="mt-4 bg-input-background border border-lines-divisions rounded-xl p-3">
          <Text style={{ fontSize: legendaSize }} className="text-second-text mb-2">
            Evolução do patrimônio
          </Text>
          <GraficoLinhaSimulacao
            serie={resultado.evolucao}
            formatarX={(x) => `${Math.round(x)}m`}
            formatarY={formatarMilhar}
          />
        </View>

        <Text style={{ fontSize: legendaSize }} className="text-desactived-text mt-3">
          Os valores são estimativas e não consideram impostos nem inflação.
        </Text>
      </View>

      <BlocoAcoesSimulacao
        tipo="investimento"
        parametros={parametros}
        resultado={resultado}
        tituloPadrao="Investimento"
        textoCompartilhar={[
          "Simulação de investimento — Unify",
          `Aporte inicial: ${FormatToCurrency(aporteInicial)}`,
          `Aporte mensal: ${FormatToCurrency(aporteMensal)}`,
          `Período: ${meses} meses`,
          `Rentabilidade: ${taxaAnualPct}% a.a.`,
          "",
          `Montante final: ${FormatToCurrency(resultado.montanteFinal)}`,
          `Total investido: ${FormatToCurrency(resultado.totalInvestido)}`,
          `Rendimento: ${FormatToCurrency(resultado.rendimento)} (${resultado.rendimentoPct.toFixed(1)}%)`,
        ].join("\n")}
      />
    </View>
  );
}

export const SimuladorInvestimento = memo(SimuladorInvestimentoBase);
