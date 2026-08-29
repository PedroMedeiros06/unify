import { memo, useCallback, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { dataHojeIso } from "@/utils/dateUtils";
import { useNavigation } from "@/context/NavigationContext";
import { VisaoGeralOrcamento } from "@/components/OrcamentoComp/VisaoGeralOrcamento";
import { CategoriasOrcamento } from "@/components/OrcamentoComp/CategoriasOrcamento";
import { AnaliseOrcamento } from "@/components/OrcamentoComp/AnaliseOrcamento";
import { DicasOrcamento } from "@/components/OrcamentoComp/DicasOrcamento";

/**
 * Painel da aba "Orçamento" do Planejamento.
 *
 * IMPORTANTE: NÃO é uma tela própria. É renderizado INLINE dentro de
 * Planejamento.tsx quando `activeTab === "Orçamento"`, exatamente no
 * mesmo padrão da aba "Metas" (que renderiza <MinhasMetas />). Por
 * isso aqui não tem header, não tem ScrollView e não tem botão de
 * voltar — tudo isso já vem do Planejamento (header "Planejamento" +
 * PlanejamentoTabs + footer continuam visíveis).
 *
 * O card "Visão geral" (VisaoGeralOrcamento) já lê dados reais: previsto
 * via obterResumoPrevistoDoMes, realizado via calcularResumoReceitasDespesas.
 * Categorias, análise e dicas ainda são mockadas (ver
 * src/database/orcamentoMock.ts) — limites por categoria, economia/maior
 * gasto e correspondência com transações são de fases seguintes.
 */
function OrcamentoResumoBase() {
  // Mês/ano exibido no card de Visão geral — começa no mês corrente e é
  // navegável via SeletorMesAno (mesmo padrão de VisaoGeralMes).
  const hojeIso = useMemo(() => dataHojeIso(), []);
  const [anoHoje, mesHoje] = hojeIso.split("-").map(Number);

  const [anoExibido, setAnoExibido] = useState(anoHoje);
  const [mesExibido, setMesExibido] = useState(mesHoje - 1); // 0-11, para bater com SeletorMesAno

  const { navigate } = useNavigation();

  const handleSelecionarMesAno = useCallback((ano: number, mes: number) => {
    setAnoExibido(ano);
    setMesExibido(mes);
  }, []);

  const handleAbrirRecorrencias = useCallback(() => {
    navigate("recorrencias");
  }, [navigate]);

  return (
    <View className="flex-col gap-4">
      <Pressable
        onPress={handleAbrirRecorrencias}
        className="bg-card-background border border-lines-divisions rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Abrir recorrências"
      >
        <View className="w-10 h-10 rounded-full bg-active-icon/15 items-center justify-center flex-shrink-0">
          <Ionicons name="repeat-outline" color={colors["active-icon"]} size={18} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: moderateScale(13) }} className="text-main-text font-Inter-Medium">
            Recorrências
          </Text>
          <Text style={{ fontSize: moderateScale(11) }} className="text-second-text mt-0.5">
            Receitas e despesas que se repetem todo mês
          </Text>
        </View>
        <Ionicons name="chevron-forward" color={colors["second-text"]} size={18} />
      </Pressable>

      <VisaoGeralOrcamento
        anoExibido={anoExibido}
        mesExibido={mesExibido}
        onSelecionarMesAno={handleSelecionarMesAno}
      />

      <CategoriasOrcamento />

      <AnaliseOrcamento />

      <DicasOrcamento />
    </View>
  );
}

export const OrcamentoResumo = memo(OrcamentoResumoBase);
