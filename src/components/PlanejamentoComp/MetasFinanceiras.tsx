import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable } from "react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { useMetas } from "@/context/MetasContext";
import { Meta, CamposMeta, calcularPercentualMeta, metaEstaConcluida } from "@/database/metasQueries";
import { EditarMetaModal } from "@/components/PlanejamentoComp/EditarMetaModal";
import { MetasSkeleton } from "@/components/common/MetasSkeleton";

const MAX_METAS_EXIBIDAS = 3;

const MetaItem = memo(function MetaItem({ meta, onLongPress }: { meta: Meta; onLongPress: (meta: Meta) => void }) {
  const metaTitleSize = moderateScale(13);
  const metaSubtitleSize = moderateScale(10);
  const valueSize = moderateScale(12);

  const percentual = calcularPercentualMeta(meta);

  return (
    <Pressable
      onLongPress={() => onLongPress(meta)}
      delayLongPress={350}
      className="bg-input-background border border-lines-divisions rounded-xl p-3 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${meta.nome}, toque e segure para editar`}
    >
      <View className="flex-row items-center gap-2.5 mb-2.5">
        <View
          style={{ width: 34, height: 34, backgroundColor: `${meta.cor}22` }}
          className="rounded-full items-center justify-center"
        >
          <Ionicons name={meta.icone as keyof typeof Ionicons.glyphMap} color={meta.cor} size={16} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: metaTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {meta.nome}
          </Text>
          <Text style={{ fontSize: metaSubtitleSize }} className="text-desactived-text" numberOfLines={1}>
            Meta de {FormatToCurrency(meta.valorMeta)}
          </Text>
        </View>
      </View>

      <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden mb-1.5">
        <View style={{ width: `${percentual}%`, backgroundColor: meta.cor }} className="h-full rounded-full" />
      </View>

      <Text style={{ fontSize: valueSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
        {FormatToCurrency(meta.progressoAtual)}
        <Text className="text-desactived-text font-Inter-Regular"> · {percentual}% concluído</Text>
      </Text>
    </Pressable>
  );
});

function MetasFinanceirasBase() {
  const cardTitleSize = moderateScale(15);
  const { metas, carregando, adicionarMeta, editarMeta, removerMeta } = useMetas();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [metaEditando, setMetaEditando] = useState<Meta | null>(null);

  // Mostra no máximo 3 metas: as que estão mais perto de concluir
  // (maior % de progresso) primeiro. Se NENHUMA meta em andamento tem
  // progresso (todas em 0%), não faz sentido ordenar por % — nesse
  // caso caímos para as criadas mais recentemente, que é o único
  // critério que ainda diz algo útil sobre "o que priorizar agora".
  const metasExibidas = useMemo(() => {
    const emAndamento = metas.filter((m) => !metaEstaConcluida(m));
    const algumaComProgresso = emAndamento.some((m) => m.progressoAtual > 0);

    const ordenadas = algumaComProgresso
      ? [...emAndamento].sort((a, b) => calcularPercentualMeta(b) - calcularPercentualMeta(a))
      : [...emAndamento].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

    return ordenadas.slice(0, MAX_METAS_EXIBIDAS);
  }, [metas]);

  const handleAbrirNova = useCallback(() => {
    setMetaEditando(null);
    setModalVisivel(true);
  }, []);

  const handleLongPress = useCallback((meta: Meta) => {
    setMetaEditando(meta);
    setModalVisivel(true);
  }, []);

  const handleFechar = useCallback(() => {
    setModalVisivel(false);
    setMetaEditando(null);
  }, []);

  const handleSalvar = useCallback(
    async (id: string | null, campos: CamposMeta) => {
      if (id) {
        await editarMeta(id, campos);
      } else {
        await adicionarMeta(campos);
      }
    },
    [adicionarMeta, editarMeta]
  );

  if (carregando) {
    return <MetasSkeleton />;
  }

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Metas financeiras
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={handleAbrirNova} hitSlop={10} accessibilityRole="button" accessibilityLabel="Adicionar meta">
            <Ionicons name="add-circle-outline" color={colors["active-icon"]} size={20} />
          </Pressable>
        </View>
      </View>

      {metasExibidas.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="flag-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text text-center mt-2">
            Nenhuma meta criada ainda. Toque no + para começar.
          </Text>
        </View>
      ) : (
        <View className="gap-2.5">
          {metasExibidas.map((meta) => (
            <MetaItem key={meta.id} meta={meta} onLongPress={handleLongPress} />
          ))}
        </View>
      )}

      <EditarMetaModal
        visivel={modalVisivel}
        metaEditando={metaEditando}
        onFechar={handleFechar}
        onSalvar={handleSalvar}
        onExcluir={removerMeta}
      />
    </View>
  );
}

export const MetasFinanceiras = memo(MetasFinanceirasBase);