import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable } from "react-native";
import { memo, useCallback, useState } from "react";
import { useLembretes } from "@/context/LembretesContext";
import { Lembrete, CamposLembrete } from "@/database/lembretesQueries";
import { EditarLembreteModal } from "@/components/PlanejamentoComp/EditarLembreteModal";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { CompromissosSkeleton } from "@/components/common/CompromissosSkeleton";

function calcularDiasRestantes(dataIso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const alvo = new Date(ano, mes - 1, dia);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

const LembreteItem = memo(function LembreteItem({
  lembrete,
  onLongPress,
}: {
  lembrete: Lembrete;
  onLongPress: (l: Lembrete) => void;
}) {
  const itemTitleSize = moderateScale(13);
  const itemSubtitleSize = moderateScale(10);
  const badgeSize = moderateScale(9);

  const diasRestantes = calcularDiasRestantes(lembrete.data);
  const passou = diasRestantes < 0;

  const textoPrazo = passou
    ? `Há ${Math.abs(diasRestantes)} dias`
    : diasRestantes === 0
      ? "Hoje"
      : diasRestantes === 1
        ? "Amanhã"
        : `Em ${diasRestantes} dias`;

  const corBadge = passou ? colors["desactived-text"] : colors["active-icon"];

  return (
    <Pressable
      onLongPress={() => onLongPress(lembrete)}
      delayLongPress={350}
      className="flex-row items-center justify-between py-2.5 border-b border-lines-divisions active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${lembrete.titulo}, ${dataIsoParaBR(lembrete.data)} às ${lembrete.hora}, ${textoPrazo}. Toque e segure para editar.`}
    >
      <View
        style={{ backgroundColor: `${colors["active-icon"]}22` }}
        className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 mr-2.5"
      >
        <Ionicons name="alarm-outline" color={colors["active-icon"]} size={15} />
      </View>

      <View className="flex-1">
        <Text
          style={{ fontSize: itemTitleSize }}
          className="text-main-text font-Inter-Medium"
          numberOfLines={1}
        >
          {lembrete.titulo}
        </Text>
        <Text style={{ fontSize: itemSubtitleSize }} className="text-desactived-text" numberOfLines={1}>
          {dataIsoParaBR(lembrete.data)} às {lembrete.hora}
        </Text>
      </View>

      <View className="items-end flex-shrink-0">
        <View style={{ backgroundColor: `${corBadge}22` }} className="px-2 py-0.5 rounded-full">
          <Text style={{ fontSize: badgeSize, color: corBadge }} className="font-Inter-Medium">
            {textoPrazo}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function ProximosLembretesBase() {
  const cardTitleSize = moderateScale(15);
  const { lembretes, carregando, adicionarLembrete, editarLembrete, removerLembrete } = useLembretes();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [lembreteEditando, setLembreteEditando] = useState<Lembrete | null>(null);

  const handleAbrirNovo = useCallback(() => {
    setLembreteEditando(null);
    setModalVisivel(true);
  }, []);

  const handleLongPress = useCallback((l: Lembrete) => {
    setLembreteEditando(l);
    setModalVisivel(true);
  }, []);

  const handleFechar = useCallback(() => {
    setModalVisivel(false);
    setLembreteEditando(null);
  }, []);

  const handleSalvar = useCallback(
    async (id: string | null, campos: CamposLembrete) => {
      if (id) {
        await editarLembrete(id, campos);
      } else {
        await adicionarLembrete(campos);
      }
    },
    [adicionarLembrete, editarLembrete]
  );

  if (carregando) {
    return <CompromissosSkeleton />;
  }

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Lembretes
        </Text>
        <Pressable onPress={handleAbrirNovo} hitSlop={10} accessibilityRole="button" accessibilityLabel="Adicionar lembrete">
          <Ionicons name="add-circle-outline" color={colors["active-icon"]} size={20} />
        </Pressable>
      </View>

      {lembretes.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="alarm-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text text-center mt-2">
            Nenhum lembrete cadastrado. Toque no + para adicionar.
          </Text>
        </View>
      ) : (
        lembretes.map((lembrete) => (
          <LembreteItem key={lembrete.id} lembrete={lembrete} onLongPress={handleLongPress} />
        ))
      )}

      <EditarLembreteModal
        visivel={modalVisivel}
        lembreteEditando={lembreteEditando}
        onFechar={handleFechar}
        onSalvar={handleSalvar}
        onExcluir={removerLembrete}
      />
    </View>
  );
}

export const ProximosLembretes = memo(ProximosLembretesBase);
