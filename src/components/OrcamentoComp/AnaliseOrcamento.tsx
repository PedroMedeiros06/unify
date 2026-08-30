import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ActivityIndicator } from "react-native";
import { memo, useEffect, useMemo, useState } from "react";
import { obterResumoPrevistoDoMes } from "@/database/orcamentoQueries";
import { calcularResumoReceitasDespesas, listarResumoPorCategoria } from "@/database/queries";
import { obterCategoriaPorId } from "@/database/categorias";

type Props = {
  anoExibido: number;
  mesExibido: number; // 0-11, igual aos outros cards do Orçamento
};

const CardAnalise = memo(function CardAnalise({
  icone,
  corIcone,
  label,
  valor,
  subtitulo,
  corValor,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  label: string;
  valor: string;
  subtitulo: string;
  // Cor do valor em destaque. Por padrão acompanha a cor do ícone,
  // mas alguns cards (ex: "Maior gasto") destacam o valor numa cor
  // diferente da do ícone — nesse caso passa-se `corValor` explícito.
  corValor?: string;
}) {
  const labelSize = moderateScale(11);
  const valorSize = moderateScale(15);
  const subtituloSize = moderateScale(10);

  return (
    <View className="flex-1 min-w-[30%] bg-input-background border border-lines-divisions rounded-xl p-3">
      <View style={{ backgroundColor: `${corIcone}22` }} className="w-8 h-8 rounded-lg items-center justify-center mb-2.5">
        <Ionicons name={icone} color={corIcone} size={16} />
      </View>
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1" numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: valorSize, color: corValor ?? corIcone }} className="font-Inter-SemiBold mb-0.5" numberOfLines={1}>
        {valor}
      </Text>
      <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
        {subtitulo}
      </Text>
    </View>
  );
});

type DadosAnalise = {
  receitaPrevista: number;
  receitaRealizada: number;
  despesaPrevista: number;
  despesaRealizada: number;
  // Categoria com maior gasto REALIZADO no mês anterior.
  maiorGastoCategoriaNome: string | null;
  maiorGastoValor: number;
  maiorGastoPercentualDasSaidas: number;
};

/** Percentual de `valor` sobre `base`, arredondado; 0 se base <= 0. */
function percentualDe(valor: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round((valor / base) * 100);
}

/**
 * Variação percentual do realizado sobre o previsto, já com rótulo:
 * "+16%" quando entrou/saiu mais do que o previsto, "-9%" quando menos.
 * Sem previsto (base 0) não há o que comparar.
 */
function rotuloVariacao(realizado: number, previsto: number): string {
  if (previsto <= 0) return "sem previsão";
  const variacao = Math.round(((realizado - previsto) / previsto) * 100);
  return `${variacao > 0 ? "+" : ""}${variacao}% vs previsto`;
}

function AnaliseOrcamentoBase({ anoExibido, mesExibido }: Props) {
  const cardTitleSize = moderateScale(15);
  const descricaoSize = moderateScale(11);

  // A análise SEMPRE olha o mês ANTERIOR ao exibido — mês fechado, com
  // previsão e realizado já comparáveis. mesExibido é 0-11.
  const { anoAnterior, mesAnterior0a11 } = useMemo(() => {
    const d = new Date(anoExibido, mesExibido - 1, 1);
    return { anoAnterior: d.getFullYear(), mesAnterior0a11: d.getMonth() };
  }, [anoExibido, mesExibido]);

  const mesAnoAnterior = useMemo(
    () => `${anoAnterior}-${String(mesAnterior0a11 + 1).padStart(2, "0")}`,
    [anoAnterior, mesAnterior0a11]
  );

  const [dados, setDados] = useState<DadosAnalise | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    const mesHumanoAnterior = mesAnterior0a11 + 1; // 1-12
    const inicioMes = `${mesAnoAnterior}-01`;
    const ultimoDia = new Date(anoAnterior, mesHumanoAnterior, 0).getDate();
    const fimMes = `${mesAnoAnterior}-${String(ultimoDia).padStart(2, "0")}`;

    Promise.all([
      obterResumoPrevistoDoMes(mesAnoAnterior),
      // Passando o mês anterior como alvo, *MesAtual* já vem sendo o mês anterior.
      calcularResumoReceitasDespesas(anoAnterior, mesHumanoAnterior),
      listarResumoPorCategoria({ dataInicio: inicioMes, dataFim: fimMes }),
    ])
      .then(([previsto, realizado, porCategoria]) => {
        if (!ativo) return;

        const totalSaidas = porCategoria.reduce((soma, linha) => soma + linha.totalSaidas, 0);
        // listarResumoPorCategoria já vem ordenado por totalSaidas desc.
        const maior = porCategoria.find((linha) => linha.totalSaidas > 0) ?? null;

        setDados({
          receitaPrevista: previsto.receitasPrevistas,
          receitaRealizada: realizado.receitasMesAtual,
          despesaPrevista: previsto.despesasPrevistas,
          despesaRealizada: realizado.despesasMesAtual,
          maiorGastoCategoriaNome: maior
            ? obterCategoriaPorId(maior.categoriaId)?.nome ?? "Sem categoria"
            : null,
          maiorGastoValor: maior?.totalSaidas ?? 0,
          maiorGastoPercentualDasSaidas: maior ? percentualDe(maior.totalSaidas, totalSaidas) : 0,
        });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [mesAnoAnterior, anoAnterior, mesAnterior0a11]);

  const semDados =
    !dados ||
    (dados.receitaPrevista === 0 &&
      dados.receitaRealizada === 0 &&
      dados.despesaPrevista === 0 &&
      dados.despesaRealizada === 0);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Análise do orçamento
      </Text>
      <Text style={{ fontSize: descricaoSize }} className="text-desactived-text mb-3" numberOfLines={2}>
        Os dados utilizados são referentes ao mês anterior.
      </Text>

      {carregando ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : semDados ? (
        <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text" numberOfLines={2}>
          Sem previsão nem transações no mês anterior para analisar.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2.5">
          <CardAnalise
            icone="arrow-down-circle-outline"
            corIcone={colors["sucess-color"]}
            label="Receitas"
            valor={FormatToCurrency(dados.receitaRealizada)}
            subtitulo={rotuloVariacao(dados.receitaRealizada, dados.receitaPrevista)}
          />
          <CardAnalise
            icone="arrow-up-circle-outline"
            corIcone={colors["error-color"]}
            label="Saídas"
            valor={FormatToCurrency(dados.despesaRealizada)}
            subtitulo={rotuloVariacao(dados.despesaRealizada, dados.despesaPrevista)}
          />
          <CardAnalise
            icone="pie-chart-outline"
            corIcone="#378ADD"
            corValor={colors["active-icon"]}
            label="Maior gasto"
            valor={dados.maiorGastoCategoriaNome ?? "—"}
            subtitulo={
              dados.maiorGastoCategoriaNome
                ? `${FormatToCurrency(dados.maiorGastoValor)} (${dados.maiorGastoPercentualDasSaidas}%)`
                : "Nenhum gasto no mês"
            }
          />
        </View>
      )}
    </View>
  );
}

export const AnaliseOrcamento = memo(AnaliseOrcamentoBase);
