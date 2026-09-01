import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, Alert, Share } from "react-native";
import { memo, useCallback } from "react";
import { useSimulacoes } from "@/context/SimulacoesContext";
import { SimulacaoSalva } from "@/database/simulacoesQueries";
import { FormatToCurrency } from "@/utils/formatNumber";
import { TIPOS_SIMULACAO } from "@/components/SimulacoesComp/SeletorTipoSimulacao";

/** Linha-resumo (valor destacado + subtítulo) de cada tipo de simulação. */
function resumoDaSimulacao(s: SimulacaoSalva): { destaque: string; subtitulo: string; positivo: boolean } {
  if (s.tipo === "financiamento") {
    return {
      destaque: `${FormatToCurrency(s.resultado.parcelaMensal)} /mês`,
      subtitulo: `${FormatToCurrency(s.parametros.valorBem)} · ${s.parametros.prazoMeses}m · ${s.parametros.taxaAnualPct}% a.a.`,
      positivo: false,
    };
  }
  if (s.tipo === "emprestimo") {
    return {
      destaque: `${FormatToCurrency(s.resultado.parcelaMensal)} /mês`,
      subtitulo: `${FormatToCurrency(s.parametros.valorSolicitado)} · ${s.parametros.prazoMeses}m · ${s.parametros.taxaAnualPct}% a.a.`,
      positivo: false,
    };
  }
  if (s.tipo === "investimento") {
    return {
      destaque: FormatToCurrency(s.resultado.montanteFinal),
      subtitulo: `${FormatToCurrency(s.parametros.aporteMensal)}/mês · ${s.parametros.meses}m · ${s.parametros.taxaAnualPct}% a.a.`,
      positivo: true,
    };
  }
  return {
    destaque: `${s.resultado.valorConvertido.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${s.parametros.moedaCodigo}`,
    subtitulo: `${FormatToCurrency(s.parametros.valorBrl)} · custo ${s.resultado.custoTotalPct.toFixed(1)}%`,
    positivo: false,
  };
}

function textoCompartilhar(s: SimulacaoSalva): string {
  const r = resumoDaSimulacao(s);
  return `${s.titulo} — Unify\n${r.subtitulo}\n${r.destaque}`;
}

type Props = {
  onAbrir: (s: SimulacaoSalva) => void;
};

const SimulacaoItem = memo(function SimulacaoItem({
  simulacao,
  onAbrir,
  onExcluir,
}: {
  simulacao: SimulacaoSalva;
  onAbrir: (s: SimulacaoSalva) => void;
  onExcluir: (id: string) => void;
}) {
  const tituloSize = moderateScale(13);
  const subSize = moderateScale(10);
  const valorSize = moderateScale(13);

  const meta = TIPOS_SIMULACAO.find((t) => t.tipo === simulacao.tipo)!;
  const resumo = resumoDaSimulacao(simulacao);

  const handleLongPress = useCallback(() => {
    Alert.alert(simulacao.titulo, undefined, [
      { text: "Cancelar", style: "cancel" },
      { text: "Compartilhar", onPress: () => void Share.share({ message: textoCompartilhar(simulacao) }) },
      { text: "Excluir", style: "destructive", onPress: () => onExcluir(simulacao.id) },
    ]);
  }, [simulacao, onExcluir]);

  return (
    <Pressable
      onPress={() => onAbrir(simulacao)}
      onLongPress={handleLongPress}
      delayLongPress={350}
      className="flex-row items-center gap-3 py-2.5 border-b border-lines-divisions active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${simulacao.titulo}. Toque para abrir, segure para mais opções.`}
    >
      <View
        style={{ backgroundColor: `${meta.cor}22` }}
        className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
      >
        <Ionicons name={meta.icone} color={meta.cor} size={15} />
      </View>

      <View className="flex-1">
        <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
          {simulacao.titulo}
        </Text>
        <Text style={{ fontSize: subSize }} className="text-desactived-text" numberOfLines={1}>
          {resumo.subtitulo}
        </Text>
      </View>

      <Text
        style={{ fontSize: valorSize }}
        className={resumo.positivo ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
        numberOfLines={1}
      >
        {resumo.destaque}
      </Text>
      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
    </Pressable>
  );
});

function SimulacoesRecentesBase({ onAbrir }: Props) {
  const cardTitleSize = moderateScale(15);
  const { simulacoes, carregando, removerSimulacao } = useSimulacoes();

  const handleExcluir = useCallback(
    (id: string) => {
      void removerSimulacao(id);
    },
    [removerSimulacao]
  );

  if (carregando || simulacoes.length === 0) {
    // Sem simulações salvas ainda: não mostra o card (a tela já tem
    // bastante conteúdo com o simulador ativo).
    return null;
  }

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium mb-2">
        Simulações salvas
      </Text>

      {simulacoes.map((simulacao) => (
        <SimulacaoItem
          key={simulacao.id}
          simulacao={simulacao}
          onAbrir={onAbrir}
          onExcluir={handleExcluir}
        />
      ))}
    </View>
  );
}

export const SimulacoesRecentes = memo(SimulacoesRecentesBase);
