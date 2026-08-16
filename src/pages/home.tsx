import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { moderateScale, scale } from "@/utils/scale";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Resumo } from "@/components/HomeComp/Resumo";
import { UltimasTransacoes } from "@/components/HomeComp/UltimasTransacoes";
import { AnaliseGrafica } from "@/components/HomeComp/AnaliseGrafica";
import { BarraFiltros } from "@/components/common/BarraFiltros";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { listarBancos, Banco } from "@/database/queries";

export function Home() {
  const titleSize = moderateScale(20);
  const subtitleSize = moderateScale(12);
  const avatarSize = moderateScale(40);

  // Estado de filtros LOCAL desta tela — independente do Planejamento
  // (ver decisão de escopo em useFiltrosTransacao.ts).
  const {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    limparTodosFiltros,
    possuiFiltrosAtivos,
    filtrosParaQuery,
  } = useFiltrosTransacao();

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);

  useEffect(() => {
    listarBancos().then(setBancos);
  }, []);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado],
  );

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      removeClippedSubviews
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row justify-between items-center">
          <View className="flex-1">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.05 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Olá Usuário
            </Text>
            <Text
              style={{
                fontSize: subtitleSize,
                letterSpacing: subtitleSize * -0.04,
              }}
              className="text-second-text"
            >
              Aqui está o resumo de sua vida financeira.
            </Text>
          </View>

          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
            className="bg-input-background border border-input-border/50 flex items-center justify-center"
          >
            <Ionicons
              name="notifications-outline"
              color={colors["desactived-text"]}
              size={scale(16)}
            />
          </View>
        </View>

        {/* BODY */}
        <View className="flex-col gap-4">
          <Resumo />
          <UltimasTransacoes />

          <BarraFiltros
            bancos={bancos}
            filtros={filtros}
            possuiFiltrosAtivos={possuiFiltrosAtivos}
            onAlternarBanco={alternarBanco}
            onLimparBanco={limparFiltroBanco}
            onAlternarCategoria={alternarCategoria}
            onLimparCategoria={limparFiltroCategoria}
            onDefinirPeriodoPreset={definirPeriodoPreset}
            onAbrirPeriodoPersonalizado={() => setModalPeriodoAberto(true)}
            onLimparTodos={limparTodosFiltros}
          />
          <AnaliseGrafica filtrosParaQuery={filtrosParaQuery} />
        </View>
      </View>

      <SeletorPeriodoPersonalizado
        visivel={modalPeriodoAberto}
        inicioIso={filtros.periodoInicioPersonalizado}
        fimIso={filtros.periodoFimPersonalizado}
        onConfirmar={handleConfirmarPeriodo}
        onFechar={() => setModalPeriodoAberto(false)}
      />
    </ScrollView>
  );
}
