import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo, useMemo } from "react";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { JanelaEvolucao } from "@/database/queries";

type Props = {
  janela: JanelaEvolucao;
  onSelecionar: (janela: JanelaEvolucao) => void;
  // Quantos anos para trás oferecer, além do ano atual. Default 4
  // (ou seja, ano atual + 4 anteriores).
  anosParaTras?: number;
  alinhamento?: "esquerda" | "direita";
};

// Opção fixa de "últimos 6 meses" — a janela deslizante que o gráfico
// sempre teve. Fica no topo da lista, antes dos anos.
const OPCAO_ULTIMOS_6: JanelaEvolucao = { modo: "ultimos", meses: 6 };

function rotuloDaJanela(janela: JanelaEvolucao): string {
  return janela.modo === "ano" ? String(janela.ano) : "Últimos 6 meses";
}

function janelasIguais(a: JanelaEvolucao, b: JanelaEvolucao): boolean {
  if (a.modo === "ano" && b.modo === "ano") return a.ano === b.ano;
  if (a.modo === "ultimos" && b.modo === "ultimos") return a.meses === b.meses;
  return false;
}

function SeletorJanelaEvolucaoBase({
  janela,
  onSelecionar,
  anosParaTras = 4,
  alinhamento = "direita",
}: Props) {
  const triggerTextSize = moderateScale(10);
  const itemTextSize = moderateScale(13);

  const opcoes: JanelaEvolucao[] = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    const anos: JanelaEvolucao[] = [];
    for (let i = 0; i <= anosParaTras; i++) {
      anos.push({ modo: "ano", ano: anoAtual - i });
    }
    return [OPCAO_ULTIMOS_6, ...anos];
  }, [anosParaTras]);

  return (
    <DropdownMenu
      largura={180}
      alinhamento={alinhamento}
      trigger={({ abrir, aberto }) => (
        <Pressable
          onPress={abrir}
          className="flex-row items-center gap-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={`Janela do gráfico: ${rotuloDaJanela(janela)}`}
        >
          <Text style={{ fontSize: triggerTextSize }} className="text-desactived-text font-Inter-Regular">
            {rotuloDaJanela(janela)}
          </Text>
          <Ionicons
            name={aberto ? "chevron-up" : "chevron-down"}
            color={colors["desactived-text"]}
            size={11}
          />
        </Pressable>
      )}
    >
      {({ fechar }) => (
        <View className="py-2">
          {opcoes.map((opcao, index) => {
            const selecionado = janelasIguais(opcao, janela);
            return (
              <Pressable
                key={rotuloDaJanela(opcao)}
                onPress={() => {
                  onSelecionar(opcao);
                  fechar();
                }}
                className={`flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70 ${
                  index < opcoes.length - 1 ? "border-b border-lines-divisions/60" : ""
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selecionado }}
                accessibilityLabel={rotuloDaJanela(opcao)}
              >
                <Text
                  style={{ fontSize: itemTextSize }}
                  className={selecionado ? "text-active-icon font-Inter-Medium" : "text-main-text"}
                >
                  {rotuloDaJanela(opcao)}
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

export const SeletorJanelaEvolucao = memo(SeletorJanelaEvolucaoBase);
