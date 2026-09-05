import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useMemo, useState } from "react";
import { CampoMoeda, CampoTaxa, CampoNumero } from "@/components/SimulacoesComp/CamposSimulacao";
import { StatTilesSimulacao, CORES_TILE } from "@/components/SimulacoesComp/StatTilesSimulacao";
import { GraficoLinhaSimulacao } from "@/components/SimulacoesComp/GraficoLinhaSimulacao";
import { BlocoAcoesSimulacao } from "@/components/SimulacoesComp/BlocoAcoesSimulacao";
import { simularEmprestimo, ParametrosEmprestimo } from "@/utils/simulacoes";
import { FormatToCurrency } from "@/utils/formatNumber";

function formatarMilhar(valor: number): string {
  if (Math.abs(valor) >= 1000) return `R$ ${Math.round(valor / 1000)} mil`;
  return `R$ ${Math.round(valor)}`;
}

type Props = {
  parametrosIniciais?: ParametrosEmprestimo;
};

function SimuladorEmprestimoBase({ parametrosIniciais }: Props) {
  const tituloSecaoSize = moderateScale(15);
  const legendaSize = moderateScale(11);

  const [valorSolicitado, setValorSolicitado] = useState(parametrosIniciais?.valorSolicitado ?? 0);
  const [prazoMeses, setPrazoMeses] = useState(parametrosIniciais?.prazoMeses ?? 24);
  const [taxaAnualPct, setTaxaAnualPct] = useState(parametrosIniciais?.taxaAnualPct ?? 0);

  const parametros: ParametrosEmprestimo = { valorSolicitado, prazoMeses, taxaAnualPct };
  const resultado = useMemo(() => simularEmprestimo(parametros), [parametros]);

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
          Simulação de empréstimo
        </Text>
        <Text style={{ fontSize: legendaSize }} className="text-second-text mb-4">
          Simule as parcelas de um empréstimo pessoal e o custo total dos juros.
        </Text>

        <View className="flex-row gap-3 mb-4">
          <CampoMoeda label="Valor do empréstimo" valor={valorSolicitado} onChange={setValorSolicitado} />
          <CampoNumero label="Prazo" valor={prazoMeses} onChange={setPrazoMeses} sufixo="meses" />
        </View>

        <CampoTaxa
          label="Taxa de juros ao ano"
          valor={taxaAnualPct}
          onChange={setTaxaAnualPct}
          minimo={0}
          maximo={120}
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

        <Text style={{ fontSize: legendaSize }} className="text-desactived-text mt-3">
          Os valores são estimativas e podem variar de acordo com as condições reais.
        </Text>
      </View>

      <BlocoAcoesSimulacao
        tipo="emprestimo"
        parametros={parametros}
        resultado={resultado}
        tituloPadrao="Empréstimo"
        textoCompartilhar={[
          "Simulação de empréstimo — Unify",
          `Valor: ${FormatToCurrency(valorSolicitado)}`,
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

export const SimuladorEmprestimo = memo(SimuladorEmprestimoBase);
