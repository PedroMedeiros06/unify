import { moderateScale } from "@/utils/scale";
import { View, Text, Pressable, ScrollView } from "react-native";
import { memo } from "react";
import { Banco } from "@/database/queries";
import { CategoriaId } from "@/database/categorias";
import { EstadoFiltros, PeriodoPreset } from "@/hooks/useFiltrosTransacao";
import { SeletorBancoMultiplo } from "@/components/common/SeletorBancoMultiplo";
import { SeletorCategoriaMultiplo } from "@/components/common/SeletorCategoriaMultiplo";
import { DropdownPeriodo } from "@/components/common/DropdownPeriodo";

type Props = {
  bancos: Banco[];
  filtros: EstadoFiltros;
  possuiFiltrosAtivos: boolean;
  onAlternarBanco: (bancoId: string) => void;
  onLimparBanco: () => void;
  onAlternarCategoria: (categoriaId: CategoriaId | null) => void;
  onLimparCategoria: () => void;
  onDefinirPeriodoPreset: (preset: PeriodoPreset) => void;
  onAbrirPeriodoPersonalizado: () => void;
  onLimparTodos: () => void;
};

function BarraFiltrosBase({
  bancos,
  filtros,
  possuiFiltrosAtivos,
  onAlternarBanco,
  onLimparBanco,
  onAlternarCategoria,
  onLimparCategoria,
  onDefinirPeriodoPreset,
  onAbrirPeriodoPersonalizado,
  onLimparTodos,
}: Props) {
  const titleSize = moderateScale(13);
  const limparTextSize = moderateScale(11);

  const rotuloPersonalizado =
    filtros.periodoPreset === "personalizado" && filtros.periodoInicioPersonalizado && filtros.periodoFimPersonalizado
      ? `${filtros.periodoInicioPersonalizado.split("-").reverse().join("/")} - ${filtros.periodoFimPersonalizado.split("-").reverse().join("/")}`
      : null;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-3">
      <View className="flex-row justify-between items-center mb-2.5">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-Medium">
          Filtros
        </Text>
        {possuiFiltrosAtivos && (
          <Pressable onPress={onLimparTodos} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpar todos os filtros">
            <Text style={{ fontSize: limparTextSize }} className="text-active-icon font-Inter-Medium">
              Limpar tudo
            </Text>
          </Pressable>
        )}
      </View>

      {/* Rolagem horizontal em vez de flex-wrap: os rótulos dos chips
          têm larguras variáveis ("Este mês", "Personalizado", bancos) e
          quebravam feio para a linha de baixo. Mesmo padrão da barra de
          filtros das Últimas transações. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, alignItems: "center" }}
      >
        <SeletorBancoMultiplo
          bancos={bancos}
          bancosSelecionados={filtros.bancosSelecionados}
          onAlternar={onAlternarBanco}
          onLimpar={onLimparBanco}
        />
        <SeletorCategoriaMultiplo
          categoriasSelecionadas={filtros.categoriasSelecionadas}
          onAlternar={onAlternarCategoria}
          onLimpar={onLimparCategoria}
        />
        <DropdownPeriodo
          periodoAtivo={filtros.periodoPreset}
          rotuloPersonalizado={rotuloPersonalizado}
          onSelecionarPreset={onDefinirPeriodoPreset}
          onAbrirPersonalizado={onAbrirPeriodoPersonalizado}
        />
      </ScrollView>
    </View>
  );
}

export const BarraFiltros = memo(BarraFiltrosBase);