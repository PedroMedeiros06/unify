import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { PeriodoPreset } from "@/hooks/useFiltrosTransacao";

const OPCOES: { valor: PeriodoPreset; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { valor: "tudo", rotulo: "Tudo", icone: "infinite-outline" },
  { valor: "hoje", rotulo: "Hoje", icone: "today-outline" },
  { valor: "7dias", rotulo: "7 dias", icone: "calendar-outline" },
  { valor: "esteMes", rotulo: "Este mês", icone: "calendar-number-outline" },
  { valor: "personalizado", rotulo: "Personalizado", icone: "options-outline" },
];

const ROTULOS: Record<PeriodoPreset, string> = {
  tudo: "Tudo",
  hoje: "Hoje",
  "7dias": "7 dias",
  esteMes: "Este mês",
  personalizado: "Personalizado",
};

type Props = {
  periodoAtivo: PeriodoPreset;
  // Quando o preset ativo é "personalizado" e há um intervalo definido,
  // o rótulo do trigger mostra as datas em vez de "Personalizado" —
  // mesmo comportamento que BarraFiltros já tinha nos chips antigos.
  rotuloPersonalizado?: string | null;
  onSelecionarPreset: (preset: PeriodoPreset) => void;
  onAbrirPersonalizado: () => void;
};

// "esteMes" é o preset NEUTRO padrão — não deve aparecer como filtro
// ativo (borda/texto roxo). Qualquer outro preset é destaque.
const PRESET_NEUTRO: PeriodoPreset = "esteMes";

function DropdownPeriodoBase({ periodoAtivo, rotuloPersonalizado, onSelecionarPreset, onAbrirPersonalizado }: Props) {
  const triggerTextSize = moderateScale(12);
  const itemTextSize = moderateScale(13);

  const destacado = periodoAtivo !== PRESET_NEUTRO;

  const rotuloExibido =
    periodoAtivo === "personalizado" && rotuloPersonalizado ? rotuloPersonalizado : ROTULOS[periodoAtivo];

  return (
    <DropdownMenu
      largura={200}
      trigger={({ abrir, aberto }) => (
        <Pressable
          onPress={abrir}
          className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1 ${
            aberto || destacado ? "border-active-icon" : "border-lines-divisions bg-input-background/50"
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por período. ${rotuloExibido}`}
        >
          <Ionicons name="calendar-outline" color={destacado ? colors["active-icon"] : colors["second-text"]} size={13} />
          <Text
            style={{ fontSize: triggerTextSize }}
            className={destacado ? "text-active-icon font-Inter-Medium" : "text-main-text font-Inter-Regular"}
            numberOfLines={1}
          >
            {rotuloExibido}
          </Text>
          <Ionicons name="chevron-down" color={destacado ? colors["active-icon"] : colors["second-text"]} size={11} />
        </Pressable>
      )}
    >
      {({ fechar }) => (
        <View className="py-2">
          {OPCOES.map((opcao, index) => {
            const selecionado = periodoAtivo === opcao.valor;
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => {
                  if (opcao.valor === "personalizado") {
                    onAbrirPersonalizado();
                  } else {
                    onSelecionarPreset(opcao.valor);
                  }
                  fechar();
                }}
                className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
                  index < OPCOES.length - 1 ? "border-b border-lines-divisions/60" : ""
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selecionado }}
                accessibilityLabel={opcao.rotulo}
              >
                <View
                  style={{ backgroundColor: selecionado ? `${colors["active-icon"]}22` : colors["input-background"] }}
                  className="w-7 h-7 rounded-full items-center justify-center"
                >
                  <Ionicons name={opcao.icone} color={selecionado ? colors["active-icon"] : colors["second-text"]} size={14} />
                </View>
                <Text
                  style={{ fontSize: itemTextSize }}
                  className={selecionado ? "text-active-icon font-Inter-Medium flex-1" : "text-main-text flex-1"}
                >
                  {opcao.rotulo}
                </Text>
                {selecionado && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </DropdownMenu>
  );
}

export const DropdownPeriodo = memo(DropdownPeriodoBase);