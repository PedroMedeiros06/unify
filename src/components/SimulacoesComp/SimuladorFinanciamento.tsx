import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useMemo, useState } from "react";
import {
  CampoMoeda,
  CampoMoedaSomenteLeitura,
  CampoSlider,
  CampoDropdown,
} from "@/components/SimulacoesComp/CamposSimulacao";
import { StatTilesSimulacao, CORES_TILE } from "@/components/SimulacoesComp/StatTilesSimulacao";
import { GraficoLinhaSimulacao } from "@/components/SimulacoesComp/GraficoLinhaSimulacao";
import { BlocoAcoesSimulacao } from "@/components/SimulacoesComp/BlocoAcoesSimulacao";
import { simularFinanciamento, ParametrosFinanciamento } from "@/utils/simulacoes";
import { FormatToCurrency } from "@/utils/formatNumber";

const PRAZOS = [
  { valor: 60, rotulo: "60 meses (5 anos)" },
  { valor: 120, rotulo: "120 meses (10 anos)" },
  { valor: 180, rotulo: "180 meses (15 anos)" },
  { valor: 240, rotulo: "240 meses (20 anos)" },
  { valor: 300, rotulo: "300 meses (25 anos)" },
  { valor: 360, rotulo: "360 meses (30 anos)" },
];

function formatarMilhar(valor: number): string {
  if (Math.abs(valor) >= 1000) return `R$ ${Math.round(valor / 1000)} mil`;
  return `R$ ${Math.round(valor)}`;
}

type Props = {
  parametrosIniciais?: ParametrosFinanciamento;
};

function SimuladorFinanciamentoBase({ parametrosIniciais }: Props) {
  const tituloSecaoSize = moderateScale(15);
  const legendaSize = moderateScale(11);

  const [valorBem, setValorBem] = useState(parametrosIniciais?.valorBem ?? 0);
  const [entrada, setEntrada] = useState(parametrosIniciais?.entrada ?? 0);
  const [prazoMeses, setPrazoMeses] = useState(parametrosIniciais?.prazoMeses ?? 240);
  const [taxaAnualPct, setTaxaAnualPct] = useState(parametrosIniciais?.taxaAnualPct ?? 0);

  const parametros: ParametrosFinanciamento = { valorBem, entrada, prazoMeses, taxaAnualPct };
  const resultado = useMemo(() => simularFinanciamento(parametros), [valorBem, entrada, prazoMeses, taxaAnualPct]);

  const pctEntrada = valorBem > 0 ? (entrada / valorBem) * 100 : 0;

  const tiles = [
    { icone: "card-outline" as const, cor: CORES_TILE[0], rotulo: "Parcela mensal", valor: FormatToCurrency(resultado.parcelaMensal) },
    { icone: "cash-outline" as const, cor: CORES_TILE[1], rotulo: "Valor total pago", valor: FormatToCurrency(resultado.totalPago) },
    { icone: "trending-up-outline" as const, cor: CORES_TILE[2], rotulo: "Juros pagos", valor: FormatToCurrency(resultado.jurosPagos) },
    { icone: "pie-chart-outline" as const, cor: CORES_TILE[3], rotulo: "Custo efetivo total", valor: `${resultado.custoEfetivoTotalPct.toFixed(1)}%` },
  ];

  return (
    <View className="flex-col gap-4">
      {/* FORMULÁRIO */}
      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-1">
          Simulação de financiamento
        </Text>
        <Text style={{ fontSize: legendaSize }} className="text-second-text mb-4">
          Simule seu financiamento e veja o impacto no seu bolso.
        </Text>

        <View className="flex-row gap-3 mb-4">
          <CampoMoeda label="Valor do imóvel ou bem" valor={valorBem} onChange={setValorBem} />
          <View className="flex-1">
            <CampoMoeda label="Entrada" valor={entrada} onChange={setEntrada} />
            <Text style={{ fontSize: legendaSize }} className="text-active-icon mt-1">
              {pctEntrada.toFixed(0)}% do valor
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-4">
          <CampoMoedaSomenteLeitura label="Valor a financiar" valor={resultado.valorFinanciado} destaque />
          <CampoDropdown label="Prazo" valor={prazoMeses} opcoes={PRAZOS} onChange={setPrazoMeses} />
        </View>

        <CampoSlider
          label="Taxa de juros ao ano"
          valor={taxaAnualPct}
          onChange={setTaxaAnualPct}
          minimo={2}
          maximo={20}
          passo={0.1}
        />
      </View>

      {/* RESULTADO */}
      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-3">
          Resultado da simulação
        </Text>

        <StatTilesSimulacao tiles={tiles} />

        <View className="mt-4 bg-input-background border border-lines-divisions rounded-xl p-3">
          <Text style={{ fontSize: legendaSize }} className="text-second-text mb-2">
            Evolução do saldo devedor
          </Text>
          <GraficoLinhaSimulacao
            serie={resultado.saldoDevedor}
            formatarX={(x) => `${Math.round(x)}m`}
            formatarY={formatarMilhar}
          />
        </View>

        <View className="flex-row items-start gap-2 mt-3">
          <Text style={{ fontSize: legendaSize }} className="text-desactived-text flex-1">
            Os valores são estimativas e podem variar de acordo com as condições reais.
          </Text>
        </View>
      </View>

      <BlocoAcoesSimulacao
        tipo="financiamento"
        parametros={parametros}
        resultado={resultado}
        tituloPadrao="Financiamento"
        textoCompartilhar={[
          "Simulação de financiamento — Unify",
          `Valor do bem: ${FormatToCurrency(valorBem)}`,
          `Entrada: ${FormatToCurrency(entrada)} (${pctEntrada.toFixed(0)}%)`,
          `Valor financiado: ${FormatToCurrency(resultado.valorFinanciado)}`,
          `Prazo: ${prazoMeses} meses`,
          `Taxa: ${taxaAnualPct}% a.a.`,
          "",
          `Parcela mensal: ${FormatToCurrency(resultado.parcelaMensal)}`,
          `Total pago: ${FormatToCurrency(resultado.totalPago)}`,
          `Juros pagos: ${FormatToCurrency(resultado.jurosPagos)}`,
          `Custo efetivo total: ${resultado.custoEfetivoTotalPct.toFixed(1)}%`,
        ].join("\n")}
      />
    </View>
  );
}

export const SimuladorFinanciamento = memo(SimuladorFinanciamentoBase);
