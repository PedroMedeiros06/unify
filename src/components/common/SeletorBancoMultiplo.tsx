import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { memo, useCallback, useState } from "react";
import { Banco } from "@/database/queries";

type Props = {
  bancos: Banco[];
  bancosSelecionados: string[]; // [] = todos
  onAlternar: (bancoId: string) => void;
  onLimpar: () => void;
};

function SeletorBancoMultiploBase({ bancos, bancosSelecionados, onAlternar, onLimpar }: Props) {
  const chipTextSize = moderateScale(12);
  const itemTextSize = moderateScale(14);
  const titleSize = moderateScale(16);

  const [aberto, setAberto] = useState(false);

  const handleAbrir = useCallback(() => setAberto(true), []);
  const handleFechar = useCallback(() => setAberto(false), []);

  const rotulo =
    bancosSelecionados.length === 0
      ? "Todos os bancos"
      : bancosSelecionados.length === 1
        ? (bancos.find((b) => b.id === bancosSelecionados[0])?.nome ?? "1 banco")
        : `${bancosSelecionados.length} bancos`;

  return (
    <>
      <Pressable
        onPress={handleAbrir}
        className={`bg-input-background/50 px-2 py-1.5 rounded-lg border flex-row items-center gap-1 ${
          bancosSelecionados.length > 0 ? "border-active-icon" : "border-lines-divisions"
        }`}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por banco. ${rotulo}`}
      >
        <Text
          style={{ fontSize: chipTextSize }}
          className={bancosSelecionados.length > 0 ? "text-active-icon font-Inter-Medium" : "text-main-text font-Inter-Regular"}
        >
          {rotulo}
        </Text>
        <Ionicons name="chevron-down" color={bancosSelecionados.length > 0 ? colors["active-icon"] : colors["second-text"]} size={10} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={handleFechar}>
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar filtro de banco"
        >
          <Pressable className="bg-card-background rounded-t-2xl pt-5 pb-8 max-h-[70%]" onPress={() => {}}>
            <View className="flex-row justify-between items-center px-5 mb-2">
              <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                Filtrar por banco
              </Text>
              {bancosSelecionados.length > 0 && (
                <Pressable onPress={onLimpar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar filtro de banco">
                  <Text style={{ fontSize: chipTextSize }} className="text-active-icon font-Inter-Medium">
                    Limpar
                  </Text>
                </Pressable>
              )}
            </View>

            {bancos.length === 0 ? (
              <View className="items-center py-6 px-5">
                <Text style={{ fontSize: itemTextSize }} className="text-desactived-text text-center">
                  Nenhum banco conectado ainda.
                </Text>
              </View>
            ) : (
              <FlatList
                data={bancos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const selecionado = bancosSelecionados.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => onAlternar(item.id)}
                      className="flex-row items-center gap-3 px-5 py-3.5"
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
                        className="w-8 h-8 rounded-lg items-center justify-center"
                      >
                        <Text style={{ fontSize: 11 }} className="text-white font-Inter-Bold">
                          {item.sigla}
                        </Text>
                      </View>
                      <Text style={{ fontSize: itemTextSize }} className="text-main-text flex-1">
                        {item.nome}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}

            <View className="px-5 pt-3">
              <Pressable
                onPress={handleFechar}
                className="w-full py-3 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Aplicar filtro de banco"
              >
                <Text style={{ fontSize: itemTextSize }} className="text-white font-Inter-SemiBold">
                  Aplicar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const SeletorBancoMultiplo = memo(SeletorBancoMultiploBase);
