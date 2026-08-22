import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo, useState, useEffect } from "react";
import { DropdownMenu } from "@/components/common/DropdownMenu";

const NOMES_MES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NOMES_MES_COMPLETO = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Props = {
  ano: number;
  mes: number; // 0-11
  onSelecionar: (ano: number, mes: number) => void;
  // Alinhamento do card do dropdown — "direita" quando o gatilho fica
  // no canto direito do header (caso do VisaoGeralMes), "esquerda"
  // quando fica mais à esquerda/centro (caso da Agenda).
  alinhamento?: "esquerda" | "direita";
};

function SeletorMesAnoBase({ ano, mes, onSelecionar, alinhamento = "esquerda" }: Props) {
  const triggerTextSize = moderateScale(13);
  const anoNavSize = moderateScale(14);
  const mesTextSize = moderateScale(12);

  // Ano exibido dentro do grid — começa igual ao ano selecionado
  // sempre que o dropdown é reaberto, para não "lembrar" de uma
  // navegação de ano anterior que o usuário não confirmou.
  const [anoNoGrid, setAnoNoGrid] = useState(ano);

  useEffect(() => {
    setAnoNoGrid(ano);
  }, [ano]);

  return (
    <DropdownMenu
      largura={260}
      alinhamento={alinhamento}
      trigger={({ abrir, aberto }) => (
        <Pressable
          onPress={() => {
            setAnoNoGrid(ano);
            abrir();
          }}
          className="flex-row items-center gap-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={`Selecionar mês e ano, atualmente ${NOMES_MES_COMPLETO[mes]} de ${ano}`}
        >
          <Text style={{ fontSize: triggerTextSize }} className="text-active-icon font-Inter-Medium">
            {NOMES_MES_COMPLETO[mes]}/{ano}
          </Text>
          <Ionicons name={aberto ? "chevron-up" : "chevron-down"} color={colors["active-icon"]} size={13} />
        </Pressable>
      )}
    >
      {({ fechar }) => (
        <View className="p-3">
          {/* Navegação de ano dentro do card — não fecha o dropdown */}
          <View className="flex-row justify-between items-center mb-3">
            <Pressable
              onPress={() => setAnoNoGrid((a) => a - 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ano anterior"
            >
              <Ionicons name="chevron-back" color={colors["active-icon"]} size={18} />
            </Pressable>
            <Text style={{ fontSize: anoNavSize }} className="text-main-text font-Inter-SemiBold">
              {anoNoGrid}
            </Text>
            <Pressable
              onPress={() => setAnoNoGrid((a) => a + 1)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Próximo ano"
            >
              <Ionicons name="chevron-forward" color={colors["active-icon"]} size={18} />
            </Pressable>
          </View>

          {/* Grid de 12 meses, 4 colunas x 3 linhas */}
          <View className="flex-row flex-wrap">
            {NOMES_MES_ABREV.map((nomeMes, indiceMes) => {
              const selecionado = anoNoGrid === ano && indiceMes === mes;
              return (
                <View key={nomeMes} style={{ width: "25%" }} className="p-1">
                  <Pressable
                    onPress={() => {
                      onSelecionar(anoNoGrid, indiceMes);
                      fechar();
                    }}
                    style={selecionado ? { backgroundColor: colors["active-icon"] } : undefined}
                    className={`py-2.5 rounded-lg items-center justify-center ${!selecionado ? "bg-input-background" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selecionado }}
                    accessibilityLabel={`${NOMES_MES_COMPLETO[indiceMes]} de ${anoNoGrid}`}
                  >
                    <Text
                      style={{ fontSize: mesTextSize }}
                      className={selecionado ? "text-white font-Inter-SemiBold" : "text-main-text font-Inter-Regular"}
                    >
                      {nomeMes}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </DropdownMenu>
  );
}

export const SeletorMesAno = memo(SeletorMesAnoBase);