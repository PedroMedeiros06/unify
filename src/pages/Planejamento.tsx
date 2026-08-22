import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";

import { PlanejamentoTabs, PlanejamentoTab } from "@/components/PlanejamentoComp/PlanejamentoTabs";
import { VisaoGeralMes } from "@/components/PlanejamentoComp/VisaoGeralMes";
import { DistribuicaoOrcamento } from "@/components/PlanejamentoComp/DistribuicaoOrcamento";
import { MetasFinanceiras } from "@/components/PlanejamentoComp/MetasFinanceiras";
import { MinhasMetas } from "@/components/PlanejamentoComp/MinhasMetas";
import { OrcamentoMensal } from "@/components/PlanejamentoComp/OrcamentoMensal";
import { ProximosCompromissos } from "@/components/PlanejamentoComp/ProximosCompromissos";
import { BarraFiltros } from "@/components/common/BarraFiltros";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { useNavigation } from "@/context/NavigationContext";
import { listarBancos, Banco } from "@/database/queries";

export function Planejamento() {
  const [activeTab, setActiveTab] = useState<PlanejamentoTab>("Resumo");

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  const { navigate } = useNavigation();

  // Estado de filtros LOCAL desta tela — independente do estado de
  // filtros da Home (cada tela tem sua própria instância, por decisão
  // de escopo: não há necessidade de sincronizar entre elas agora).
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

  const handleChangeTab = useCallback((tab: PlanejamentoTab) => {
    setActiveTab(tab);
  }, []);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado]
  );

  // Navega para a Agenda — página separada do Planejamento, com
  // calendário mensal de compromissos/metas. Não é uma aba do
  // PlanejamentoTabs de propósito: é uma tela própria, acessada só
  // pelo botão do header.
  const handleAbrirAgenda = useCallback(() => {
    navigate("agenda");
  }, [navigate]);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      scrollEventThrottle={32}
      removeClippedSubviews
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Planejamento
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Organize suas metas e tenha controle do seu futuro financeiro.
            </Text>
          </View>

          <Pressable
            onPress={handleAbrirAgenda}
            className="w-9 h-9 rounded-lg bg-input-background border border-input-border items-center justify-center flex-shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Abrir agenda"
          >
            <Ionicons name="calendar-outline" color={colors["active-icon"]} size={16} />
          </Pressable>
        </View>

        <PlanejamentoTabs activeTab={activeTab} onChangeTab={handleChangeTab} />

        {/* Só a tab ativa é montada — as outras nem entram na árvore de
            componentes, então não consomem memória/processamento à toa. */}
        {activeTab === "Resumo" && (
          <View className="flex-col gap-3">
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
            <VisaoGeralMes />
            <DistribuicaoOrcamento filtrosParaQuery={filtrosParaQuery} />
            <MetasFinanceiras />
            <OrcamentoMensal />
            <ProximosCompromissos />
          </View>
        )}

        {activeTab === "Metas" && <MinhasMetas />}

        {activeTab !== "Resumo" && activeTab !== "Metas" && (
          <View className="items-center justify-center py-16">
            <Text className="text-desactived-text">Em breve: {activeTab}</Text>
          </View>
        )}
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