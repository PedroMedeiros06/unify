import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, ScrollView, Pressable } from "react-native";
import { memo } from "react";

export type BancoComSaldo = {
  id: string;
  nome: string;
  cor: string;
  sigla?: string; // usado quando não há ícone Ionicons adequado (ex: "nu")
  icone?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  bancos: BancoComSaldo[];
  bancosSelecionados: string[]; // [] = todos (nenhum filtro ativo)
  onAlternarBanco: (bancoId: string) => void;
};

function BancosConectadosBase({ bancos, bancosSelecionados, onAlternarBanco }: Props) {
  const chipTextSize = moderateScale(12);

  if (bancos.length === 0) return null;

  // [] (nenhum selecionado) = todos contam como "ativos" visualmente,
  // conforme a regra: sem seleção, o resumo mostra o total de todos.
  const nenhumSelecionado = bancosSelecionados.length === 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {bancos.map((banco) => {
        const ativo = nenhumSelecionado || bancosSelecionados.includes(banco.id);

        return (
          <Pressable
            key={banco.id}
            onPress={() => onAlternarBanco(banco.id)}
            style={{
              backgroundColor: `${banco.cor}22`,
              borderColor: `${banco.cor}55`,
              opacity: ativo ? 1 : 0.4,
            }}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border active:opacity-70"
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={`${banco.nome}, ${ativo ? "incluído no resumo" : "excluído do resumo"}. Toque para alternar.`}
          >
            {banco.sigla ? (
              <Text style={{ color: banco.cor, fontSize: 11 }} className="font-Inter-Bold">
                {banco.sigla}
              </Text>
            ) : (
              <Ionicons name={banco.icone ?? "business-outline"} color={banco.cor} size={13} />
            )}
            <Text style={{ fontSize: chipTextSize }} className="text-main-text font-Inter-Medium">
              {banco.nome}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const BancosConectados = memo(BancosConectadosBase);