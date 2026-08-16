import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ScrollView } from "react-native";
import { memo } from "react";
import { Banco } from "@/database/queries";
import { CategoriaId } from "@/database/categorias";
import { EstadoFiltros, PeriodoPreset } from "@/hooks/useFiltrosTransacao";
import { SeletorBancoMultiplo } from "@/components/common/SeletorBancoMultiplo";
import { SeletorCategoriaMultiplo } from "@/components/common/SeletorCategoriaMultiplo";

const PERIODOS: { valor: PeriodoPreset; rotulo: string }[] = [
  { valor: "tudo", rotulo: "Tudo" },
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "7dias", rotulo: "7 dias" },
  { valor: "esteMes", rotulo: "Este mês" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

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
  const chipTextSize = moderateScale(12);
  const limparTextSize = moderateScale(11);

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

      <View className="flex-row items-center gap-1.5 mb-2.5">
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
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {PERIODOS.map((periodo) => {
          const ativo = filtros.periodoPreset === periodo.valor;
          return (
            <Pressable
              key={periodo.valor}
              onPress={() =>
                periodo.valor === "personalizado" ? onAbrirPeriodoPersonalizado() : onDefinirPeriodoPreset(periodo.valor)
              }
              className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${
                ativo ? "bg-active-icon border-active-icon" : "bg-input-background/50 border-lines-divisions"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Período: ${periodo.rotulo}`}
            >
              {periodo.valor === "personalizado" && (
                <Ionicons name="calendar-outline" color={ativo ? "#fff" : colors["second-text"]} size={11} />
              )}
              <Text
                style={{ fontSize: chipTextSize }}
                className={ativo ? "text-white font-Inter-Medium" : "text-second-text font-Inter-Regular"}
              >
                {periodo.valor === "personalizado" && ativo && filtros.periodoInicioPersonalizado && filtros.periodoFimPersonalizado
                  ? `${filtros.periodoInicioPersonalizado.split("-").reverse().join("/")} - ${filtros.periodoFimPersonalizado.split("-").reverse().join("/")}`
                  : periodo.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const BarraFiltros = memo(BarraFiltrosBase);
