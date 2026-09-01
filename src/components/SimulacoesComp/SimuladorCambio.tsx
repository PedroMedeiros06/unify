import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useMemo, useState } from "react";
import {
  CampoMoeda,
  CampoNumero,
  CampoDropdown,
  OpcaoDropdown,
} from "@/components/SimulacoesComp/CamposSimulacao";
import { StatTilesSimulacao, CORES_TILE } from "@/components/SimulacoesComp/StatTilesSimulacao";
import { BlocoAcoesSimulacao } from "@/components/SimulacoesComp/BlocoAcoesSimulacao";
import { simularCambio, ParametrosCambio } from "@/utils/simulacoes";
import { FormatToCurrency } from "@/utils/formatNumber";
import { useCotacoes } from "@/context/CotacoesContext";
import { dataIsoParaBR } from "@/utils/dateUtils";

// Presets de IOF mais comuns no Brasil, para o usuário não precisar
// decorar: cartão internacional 3,5%; remessa/transferência e espécie 1,1%.
const PRESETS_IOF: OpcaoDropdown<number>[] = [
  { valor: 3.5, rotulo: "Cartão internacional (3,5%)" },
  { valor: 1.1, rotulo: "Transferência / espécie (1,1%)" },
  { valor: 0, rotulo: "Sem IOF (0%)" },
];

function formatarMoedaEstrangeira(valor: number, codigo: string): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${codigo}`;
}

type Props = {
  parametrosIniciais?: ParametrosCambio;
};

function SimuladorCambioBase({ parametrosIniciais }: Props) {
  const tituloSecaoSize = moderateScale(15);
  const legendaSize = moderateScale(11);

  const { cotacoes, carregando: carregandoCotacoes, atualizando, ultimaAtualizacao } = useCotacoes();

  const opcoesMoeda: OpcaoDropdown<string>[] = useMemo(
    () => cotacoes.map((c) => ({ valor: c.codigo, rotulo: `${c.codigo} — ${c.nome}` })),
    [cotacoes]
  );

  const [moedaCodigo, setMoedaCodigo] = useState(parametrosIniciais?.moedaCodigo ?? "USD");
  const [valorBrl, setValorBrl] = useState(parametrosIniciais?.valorBrl ?? 0);
  const [iofPct, setIofPct] = useState(parametrosIniciais?.iofPct ?? 3.5);
  const [spreadPct, setSpreadPct] = useState(parametrosIniciais?.spreadPct ?? 0);

  const cotacaoAtual = cotacoes.find((c) => c.codigo === moedaCodigo);
  // Se a moeda escolhida não está mais no histórico (ex: simulação antiga),
  // cai na cotação salva junto da simulação.
  const cotacao = cotacaoAtual?.cotacaoBrl ?? parametrosIniciais?.cotacao ?? 0;

  const parametros: ParametrosCambio = { moedaCodigo, valorBrl, cotacao, iofPct, spreadPct };
  const resultado = useMemo(
    () => simularCambio(parametros),
    [moedaCodigo, valorBrl, cotacao, iofPct, spreadPct]
  );

  const tiles = [
    {
      icone: "swap-horizontal-outline" as const,
      cor: CORES_TILE[0],
      rotulo: `Você recebe em ${moedaCodigo}`,
      valor: formatarMoedaEstrangeira(resultado.valorConvertido, moedaCodigo),
    },
    {
      icone: "pricetag-outline" as const,
      cor: CORES_TILE[3],
      rotulo: "Cotação efetiva (com spread)",
      valor: FormatToCurrency(resultado.cotacaoEfetiva),
    },
    { icone: "receipt-outline" as const, cor: CORES_TILE[2], rotulo: "IOF", valor: FormatToCurrency(resultado.custoIof) },
    {
      icone: "remove-circle-outline" as const,
      cor: CORES_TILE[1],
      rotulo: "Custo total",
      valor: `${FormatToCurrency(resultado.custoTotal)} (${resultado.custoTotalPct.toFixed(1)}%)`,
    },
  ];

  return (
    <View className="flex-col gap-4">
      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-1">
          Simulação de câmbio
        </Text>
        <Text style={{ fontSize: legendaSize }} className="text-second-text mb-4">
          Veja quanto de moeda estrangeira o seu dinheiro compra, já com IOF e spread.
        </Text>

        <View className="mb-4">
          <CampoDropdown
            label="Moeda que quero comprar"
            valor={moedaCodigo}
            opcoes={opcoesMoeda.length > 0 ? opcoesMoeda : [{ valor: moedaCodigo, rotulo: moedaCodigo }]}
            onChange={setMoedaCodigo}
          />
        </View>

        {/* Cotação de mercado — vem do histórico, não é editável */}
        <View className="bg-input-background border border-lines-divisions rounded-xl p-3 mb-4 flex-row items-center justify-between">
          <View>
            <Text style={{ fontSize: legendaSize }} className="text-second-text">
              Cotação de mercado (1 {moedaCodigo})
            </Text>
            <Text style={{ fontSize: moderateScale(15) }} className="text-main-text font-Inter-SemiBold mt-0.5">
              {FormatToCurrency(cotacao)}
            </Text>
          </View>
          <Text style={{ fontSize: moderateScale(9) }} className="text-desactived-text text-right" numberOfLines={2}>
            {carregandoCotacoes
              ? "carregando..."
              : atualizando
                ? "atualizando..."
                : cotacaoAtual
                  ? `ref. ${dataIsoParaBR(cotacaoAtual.dataReferencia)}`
                  : "cotação salva"}
          </Text>
        </View>

        <CampoMoeda label="Quanto tenho para gastar (BRL)" valor={valorBrl} onChange={setValorBrl} />

        <View className="flex-row gap-3 mt-4">
          <CampoDropdown label="IOF" valor={iofPct} opcoes={PRESETS_IOF} onChange={setIofPct} />
          <CampoNumero label="Spread do banco" valor={spreadPct} onChange={setSpreadPct} decimais={2} sufixo="%" />
        </View>
      </View>

      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <Text style={{ fontSize: tituloSecaoSize }} className="text-main-text font-Inter-Medium mb-3">
          Resultado da simulação
        </Text>

        <StatTilesSimulacao tiles={tiles} />

        <Text style={{ fontSize: legendaSize }} className="text-desactived-text mt-4">
          {ultimaAtualizacao
            ? `Cotações do Banco Central Europeu (Frankfurter), atualizadas ao abrir o app. IOF e spread variam por instituição.`
            : `Sem cotações baixadas ainda — conecte-se à internet e reabra o app para atualizar.`}
        </Text>
      </View>

      <BlocoAcoesSimulacao
        tipo="cambio"
        parametros={parametros}
        resultado={resultado}
        tituloPadrao={`Câmbio ${moedaCodigo}`}
        textoCompartilhar={[
          "Simulação de câmbio — Unify",
          `Moeda: ${moedaCodigo}${cotacaoAtual ? ` (${cotacaoAtual.nome})` : ""}`,
          `Cotação de mercado: ${FormatToCurrency(cotacao)}`,
          `Valor: ${FormatToCurrency(valorBrl)}`,
          `IOF: ${iofPct}%  |  Spread: ${spreadPct}%`,
          "",
          `Você recebe: ${formatarMoedaEstrangeira(resultado.valorConvertido, moedaCodigo)}`,
          `Cotação efetiva: ${FormatToCurrency(resultado.cotacaoEfetiva)}`,
          `Custo total: ${FormatToCurrency(resultado.custoTotal)} (${resultado.custoTotalPct.toFixed(1)}%)`,
        ].join("\n")}
      />
    </View>
  );
}

export const SimuladorCambio = memo(SimuladorCambioBase);
