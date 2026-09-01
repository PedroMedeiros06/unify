import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ScrollView } from "react-native";
import { memo } from "react";
import { Banco } from "@/database/queries";
import { DropdownMenu } from "@/components/common/DropdownMenu";

type Props = {
  bancos: Banco[];
  bancosSelecionados: string[]; // [] = todos
  onAlternar: (bancoId: string) => void;
  onLimpar: () => void;
};

// Altura máxima da lista dentro do card do dropdown — acima disso rola.
const MAX_ALTURA_LISTA = 240;

function SeletorBancoMultiploBase({ bancos, bancosSelecionados, onAlternar, onLimpar }: Props) {
  const triggerTextSize = moderateScale(12);
  const itemTextSize = moderateScale(13);
  const rodapeTextSize = moderateScale(12);

  const temSelecao = bancosSelecionados.length > 0;

  const rotulo =
    bancosSelecionados.length === 0
      ? "Todos os bancos"
      : bancosSelecionados.length === 1
        ? (bancos.find((b) => b.id === bancosSelecionados[0])?.nome ?? "1 banco")
        : `${bancosSelecionados.length} bancos`;

  return (
    <DropdownMenu
      largura={240}
      trigger={({ abrir, aberto }) => (
        <Pressable
          onPress={abrir}
          className={`px-3 py-1.5 rounded-lg border flex-row items-center gap-1 ${
            aberto || temSelecao ? "border-active-icon" : "border-lines-divisions bg-input-background/50"
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar por banco. ${rotulo}`}
        >
          <Ionicons
            name="business-outline"
            color={temSelecao ? colors["active-icon"] : colors["second-text"]}
            size={13}
          />
          <Text
            style={{ fontSize: triggerTextSize }}
            className={temSelecao ? "text-active-icon font-Inter-Medium" : "text-main-text font-Inter-Regular"}
            numberOfLines={1}
          >
            {rotulo}
          </Text>
          <Ionicons
            name="chevron-down"
            color={temSelecao ? colors["active-icon"] : colors["second-text"]}
            size={11}
          />
        </Pressable>
      )}
    >
      {({ fechar }) => (
        <View className="py-1">
          {bancos.length === 0 ? (
            <View className="items-center py-6 px-4">
              <Text style={{ fontSize: itemTextSize }} className="text-desactived-text text-center">
                Nenhum banco conectado ainda.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: MAX_ALTURA_LISTA }} showsVerticalScrollIndicator={false}>
              {bancos.map((item, index) => {
                const selecionado = bancosSelecionados.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    // Multi-select: tocar num item alterna, NÃO fecha o
                    // dropdown. Fechar só via "Aplicar" ou tocando fora.
                    onPress={() => onAlternar(item.id)}
                    className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
                      index < bancos.length - 1 ? "border-b border-lines-divisions/60" : ""
                    }`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selecionado }}
                    accessibilityLabel={item.nome}
                  >
                    <View
                      className={`w-5 h-5 rounded-md border items-center justify-center flex-shrink-0 ${
                        selecionado ? "bg-active-icon border-active-icon" : "border-input-border"
                      }`}
                    >
                      {selecionado && <Ionicons name="checkmark" color="#fff" size={13} />}
                    </View>
                    <View
                      style={{ backgroundColor: item.cor }}
                      className="w-7 h-7 rounded-lg items-center justify-center flex-shrink-0"
                    >
                      <Text style={{ fontSize: 10 }} className="text-white font-Inter-Bold">
                        {item.sigla}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: itemTextSize }}
                      className={selecionado ? "text-active-icon font-Inter-Medium flex-1" : "text-main-text flex-1"}
                      numberOfLines={1}
                    >
                      {item.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Rodapé de ação — Limpar (só com seleção) + Aplicar */}
          <View className="flex-row items-center justify-between gap-2 px-4 pt-2 pb-1 border-t border-lines-divisions/60">
            {temSelecao ? (
              <Pressable
                onPress={onLimpar}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Limpar filtro de banco"
              >
                <Text style={{ fontSize: rodapeTextSize }} className="text-second-text font-Inter-Medium">
                  Limpar
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={fechar}
              className="px-4 py-1.5 rounded-lg bg-active-icon active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtro de banco"
            >
              <Text style={{ fontSize: rodapeTextSize }} className="text-white font-Inter-SemiBold">
                Aplicar
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </DropdownMenu>
  );
}

export const SeletorBancoMultiplo = memo(SeletorBancoMultiploBase);
