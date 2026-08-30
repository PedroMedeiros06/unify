import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { ScrollView, View, Text, Pressable } from "react-native";
import { memo, useMemo } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useMetas } from "@/context/MetasContext";
import { Meta, metaEstaConcluida } from "@/database/metasQueries";
import { MetasSkeleton } from "@/components/common/MetasSkeleton";

/**
 * Tela "Metas concluídas" — lista somente as metas cujo progresso já
 * atingiu o valor objetivo (metaEstaConcluida). É uma tela separada,
 * sem footer, acessada a partir do card "Minhas metas". "Concluída" é
 * sempre calculado de progressoAtual/valorMeta, nunca um campo no
 * banco.
 */
const MetaConcluidaItem = memo(function MetaConcluidaItem({ meta }: { meta: Meta }) {
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(10);
  const valorSize = moderateScale(12);

  return (
    <View className="bg-input-background border border-lines-divisions rounded-xl p-3">
      <View className="flex-row items-center gap-2.5">
        <View
          style={{ width: 34, height: 34, backgroundColor: `${meta.cor}22` }}
          className="rounded-full items-center justify-center flex-shrink-0"
        >
          <Ionicons name={meta.icone as keyof typeof Ionicons.glyphMap} color={meta.cor} size={16} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {meta.nome}
          </Text>
          <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
            Meta de {FormatToCurrency(meta.valorMeta)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 flex-shrink-0">
          <Ionicons name="checkmark-circle" color={colors["sucess-color"]} size={16} />
          <Text style={{ fontSize: valorSize }} className="text-sucess-color font-Inter-Medium">
            Concluída
          </Text>
        </View>
      </View>
    </View>
  );
});

export function MetasConcluidas() {
  const { goBack } = useNavigation();
  const { metas, carregando } = useMetas();

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  const metasConcluidas = useMemo(
    () =>
      metas
        .filter(metaEstaConcluida)
        // Mais recentes primeiro — não há data de conclusão no schema,
        // então a data de criação é o único critério estável.
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [metas]
  );

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row items-center gap-3">
          <Pressable
            onPress={goBack}
            className="w-9 h-9 rounded-full bg-input-background border border-input-border items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" color={colors["main-text"]} size={18} />
          </Pressable>

          <View className="flex-1">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Metas concluídas
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Objetivos que já atingiram o valor planejado.
            </Text>
          </View>
        </View>

        {carregando ? (
          <MetasSkeleton />
        ) : metasConcluidas.length === 0 ? (
          <View className="bg-card-background border border-lines-divisions rounded-xl items-center py-10 px-4">
            <Ionicons name="trophy-outline" color={colors["desactived-text"]} size={28} />
            <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text text-center mt-2">
              Nenhuma meta concluída ainda. Continue registrando transações vinculadas às suas metas.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {metasConcluidas.map((meta) => (
              <MetaConcluidaItem key={meta.id} meta={meta} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
