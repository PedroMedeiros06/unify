import { memo, useCallback, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { dataHojeIso } from "@/utils/dateUtils";
import { useNavigation } from "@/context/NavigationContext";
import { CategoriaId } from "@/database/categorias";
import { LimiteCategoria } from "@/database/limitesCategoriaQueries";
import { useLimitesOrcamento } from "@/context/LimitesOrcamentoContext";
import { VisaoGeralOrcamento } from "@/components/OrcamentoComp/VisaoGeralOrcamento";
import { CategoriasOrcamento } from "@/components/OrcamentoComp/CategoriasOrcamento";
import { AnaliseOrcamento } from "@/components/OrcamentoComp/AnaliseOrcamento";
import { DicasOrcamento } from "@/components/OrcamentoComp/DicasOrcamento";
import { DefinirLimiteCategoriaModal } from "@/components/OrcamentoComp/DefinirLimiteCategoriaModal";

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
 * Todos os cards já leem dados reais: previsão via obterResumoPrevistoDoMes,
 * realizado via calcularResumoReceitasDespesas / listarResumoPorCategoria,
 * limites via LimitesOrcamentoContext. As dicas são conteúdo fixo de
 * educação financeira. A correspondência automática previsão × transação
 * é de uma fase seguinte.
 */
function OrcamentoResumoBase() {
  // Mês/ano exibido no card de Visão geral — começa no mês corrente e é
  // navegável via SeletorMesAno (mesmo padrão de VisaoGeralMes).
  const hojeIso = useMemo(() => dataHojeIso(), []);
  const [anoHoje, mesHoje] = hojeIso.split("-").map(Number);

  const [anoExibido, setAnoExibido] = useState(anoHoje);
  const [mesExibido, setMesExibido] = useState(mesHoje - 1); // 0-11, para bater com SeletorMesAno

  const { navigate } = useNavigation();

  // Modal de limite de categoria vive AQUI (não dentro de
  // CategoriasOrcamento) porque dois cards o abrem: o próprio card de
  // categorias e o botão "Definir limite" da Visão geral (donut).
  const { mesAno, limites, adicionarLimite, editarLimite, removerLimite } = useLimitesOrcamento();
  const [modalLimiteAberto, setModalLimiteAberto] = useState(false);
  const [limiteEditando, setLimiteEditando] = useState<LimiteCategoria | null>(null);

  const categoriasComLimite = useMemo(() => limites.map((l) => l.categoriaId), [limites]);

  const handleSelecionarMesAno = useCallback((ano: number, mes: number) => {
    setAnoExibido(ano);
    setMesExibido(mes);
  }, []);

  const handleAbrirRecorrencias = useCallback(() => {
    navigate("recorrencias");
  }, [navigate]);

  const handleAbrirNovoLimite = useCallback(() => {
    setLimiteEditando(null);
    setModalLimiteAberto(true);
  }, []);

  const handleEditarLimite = useCallback((limite: LimiteCategoria) => {
    setLimiteEditando(limite);
    setModalLimiteAberto(true);
  }, []);

  const handleFecharModalLimite = useCallback(() => {
    setModalLimiteAberto(false);
    setLimiteEditando(null);
  }, []);

  const handleSalvarLimite = useCallback(
    async (categoriaId: CategoriaId, valorLimite: number) => {
      if (limiteEditando) {
        await editarLimite(categoriaId, valorLimite);
      } else {
        await adicionarLimite(categoriaId, valorLimite);
      }
    },
    [limiteEditando, adicionarLimite, editarLimite]
  );

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
        onDefinirLimite={handleAbrirNovoLimite}
      />

      <CategoriasOrcamento
        anoExibido={anoExibido}
        mesExibido={mesExibido}
        onAbrirNovoLimite={handleAbrirNovoLimite}
        onEditarLimite={handleEditarLimite}
      />

      <AnaliseOrcamento anoExibido={anoExibido} mesExibido={mesExibido} />

      <DicasOrcamento />

      <DefinirLimiteCategoriaModal
        visivel={modalLimiteAberto}
        mesAno={mesAno}
        limiteEditando={limiteEditando}
        categoriasComLimite={categoriasComLimite}
        onFechar={handleFecharModalLimite}
        onSalvar={handleSalvarLimite}
        onExcluir={removerLimite}
      />
    </View>
  );
}

export const OrcamentoResumo = memo(OrcamentoResumoBase);
