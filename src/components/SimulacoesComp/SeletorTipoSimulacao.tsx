import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { TipoSimulacao } from "@/database/simulacoesQueries";
import { DropdownMenu } from "@/components/common/DropdownMenu";

export const TIPOS_SIMULACAO: {
  tipo: TipoSimulacao;
  titulo: string;
  descricao: string;
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
}[] = [
  {
    tipo: "financiamento",
    titulo: "Financiamento",
    descricao: "Parcelas e custos de um financiamento, com entrada opcional",
    icone: "business-outline",
    cor: colors["active-icon"],
  },
  {
    tipo: "emprestimo",
    titulo: "Empréstimo",
    descricao: "Parcelas de um empréstimo pessoal, sem entrada",
    icone: "cash-outline",
    cor: colors["warn-color"],
  },
  {
    tipo: "investimento",
    titulo: "Investimentos",
    descricao: "Veja quanto seu investimento pode render",
    icone: "trending-up-outline",
    cor: colors["sucess-color"],
  },
  {
    tipo: "cambio",
    titulo: "Câmbio",
    descricao: "Calcule IOF e spread ao trocar de moeda",
    icone: "swap-horizontal-outline",
    cor: "#378ADD",
  },
];

type Props = {
  selecionado: TipoSimulacao;
  onSelecionar: (tipo: TipoSimulacao) => void;
};

function SeletorTipoSimulacaoBase({ selecionado, onSelecionar }: Props) {
  const labelSize = moderateScale(11);
  const valorSize = moderateScale(14);
  const descSize = moderateScale(10);

  const atual = TIPOS_SIMULACAO.find((t) => t.tipo === selecionado)!;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Tipo de simulação
      </Text>

      <DropdownMenu
        larguraDoTrigger
        alinhamento="esquerda"
        trigger={({ abrir }) => (
          <Pressable
            onPress={abrir}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center gap-3 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Tipo de simulação: ${atual.titulo}`}
          >
            <View
              style={{ backgroundColor: `${atual.cor}22` }}
              className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
            >
              <Ionicons name={atual.icone} color={atual.cor} size={17} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: valorSize }} className="text-main-text font-Inter-Medium">
                {atual.titulo}
              </Text>
              <Text style={{ fontSize: descSize }} className="text-desactived-text" numberOfLines={1}>
                {atual.descricao}
              </Text>
            </View>
            <Ionicons name="chevron-down" color={colors["active-icon"]} size={18} />
          </Pressable>
        )}
      >
        {({ fechar }) => (
          <View className="py-1">
            {TIPOS_SIMULACAO.map((item) => {
              const ativo = item.tipo === selecionado;
              return (
                <Pressable
                  key={item.tipo}
                  onPress={() => {
                    onSelecionar(item.tipo);
                    fechar();
                  }}
                  className="px-3 py-2.5 flex-row items-center gap-3 active:bg-input-background"
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                >
                  <View
                    style={{ backgroundColor: `${item.cor}22` }}
                    className="w-8 h-8 rounded-full items-center justify-center flex-shrink-0"
                  >
                    <Ionicons name={item.icone} color={item.cor} size={15} />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontSize: valorSize }}
                      className={ativo ? "text-active-icon font-Inter-Medium" : "text-main-text"}
                    >
                      {item.titulo}
                    </Text>
                    <Text style={{ fontSize: descSize }} className="text-desactived-text" numberOfLines={2}>
                      {item.descricao}
                    </Text>
                  </View>
                  {ativo && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </DropdownMenu>
    </View>
  );
}

export const SeletorTipoSimulacao = memo(SeletorTipoSimulacaoBase);
