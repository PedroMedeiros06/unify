import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, Alert } from "react-native";
import { memo, useCallback, useRef, useState } from "react";
import { useCompromissos } from "@/context/CompromissosContext";
import { Compromisso, CamposCompromisso } from "@/database/compromissosQueries";
import { EditarCompromissoModal } from "@/components/PlanejamentoComp/EditarCompromissoModal";
import { VincularTransacaoCompromissoModal } from "@/components/PlanejamentoComp/VincularTransacaoCompromissoModal";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { CompromissosSkeleton } from "@/components/common/CompromissosSkeleton";

function calcularDiasRestantes(dataVencimentoIso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataVencimentoIso.split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);

  const diffMs = vencimento.getTime() - hoje.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

const CompromissoItem = memo(function CompromissoItem({
  compromisso,
  onLongPress,
  onToggle,
}: {
  compromisso: Compromisso;
  onLongPress: (c: Compromisso) => void;
  // Toca no checkbox: se não pago, o pai abre o fluxo de registrar a
  // transação; se pago, o pai pede confirmação e remove o vínculo.
  onToggle: (c: Compromisso) => void;
}) {
  const itemTitleSize = moderateScale(13);
  const itemSubtitleSize = moderateScale(10);
  const valueSize = moderateScale(13);
  const badgeSize = moderateScale(9);

  const processando = useRef(false);

  const handleTogglePago = useCallback(() => {
    if (processando.current) return;
    processando.current = true;

    onToggle(compromisso);

    setTimeout(() => {
      processando.current = false;
    }, 400);
  }, [compromisso, onToggle]);

  const diasRestantes = calcularDiasRestantes(compromisso.dataVencimento);
  const vencido = diasRestantes < 0 && !compromisso.pago;

  const textoPrazo = compromisso.pago
    ? "Pago"
    : vencido
      ? `Venceu há ${Math.abs(diasRestantes)} dias`
      : diasRestantes === 0
        ? "Vence hoje"
        : `Em ${diasRestantes} dias`;

  const corBadge = compromisso.pago ? colors["sucess-color"] : vencido ? colors["error-color"] : colors["active-icon"];

  return (
    <Pressable
      onLongPress={() => onLongPress(compromisso)}
      delayLongPress={350}
      className="flex-row items-center justify-between py-2.5 border-b border-lines-divisions active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${compromisso.nome}, ${FormatToCurrency(compromisso.valor)}, ${textoPrazo}. Toque e segure para editar.`}
    >
      <Pressable
        onPress={handleTogglePago}
        hitSlop={8}
        className="mr-2.5"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: compromisso.pago }}
        accessibilityLabel={compromisso.pago ? "Marcar como não pago" : "Marcar como pago"}
      >
        <View
          className={`w-5 h-5 rounded-full border items-center justify-center ${compromisso.pago ? "bg-sucess-color border-sucess-color" : "border-input-border"}`}
        >
          {compromisso.pago && <Ionicons name="checkmark" color="#fff" size={12} />}
        </View>
      </Pressable>

      <View
        style={{ backgroundColor: `${compromisso.cor}22` }}
        className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 mr-2.5"
      >
        <Ionicons name={compromisso.icone as keyof typeof Ionicons.glyphMap} color={compromisso.cor} size={15} />
      </View>

      <View className="flex-1">
        <Text
          style={{ fontSize: itemTitleSize }}
          className={compromisso.pago ? "text-desactived-text font-Inter-Medium line-through" : "text-main-text font-Inter-Medium"}
          numberOfLines={1}
        >
          {compromisso.nome}
        </Text>
        <Text style={{ fontSize: itemSubtitleSize }} className="text-desactived-text" numberOfLines={1}>
          Vencimento: {dataIsoParaBR(compromisso.dataVencimento)}
        </Text>
      </View>

      <View className="items-end flex-shrink-0">
        <Text style={{ fontSize: valueSize }} className="text-main-text font-Inter-Medium mb-1" numberOfLines={1}>
          {FormatToCurrency(compromisso.valor)}
        </Text>
        <View style={{ backgroundColor: `${corBadge}22` }} className="px-2 py-0.5 rounded-full">
          <Text style={{ fontSize: badgeSize, color: corBadge }} className="font-Inter-Medium">
            {textoPrazo}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function ProximosCompromissosBase() {
  const cardTitleSize = moderateScale(15);
  const {
    compromissos,
    carregando,
    adicionarCompromisso,
    editarCompromisso,
    pagarCompromissoComTransacao,
    desmarcarPagoCompromisso,
    removerCompromisso,
  } = useCompromissos();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [compromissoEditando, setCompromissoEditando] = useState<Compromisso | null>(null);

  // Compromisso para o qual o usuário vai escolher uma transação real
  // JÁ EXISTENTE (o Unify não cria transações). Vincular = marcar pago.
  const [compromissoVinculando, setCompromissoVinculando] = useState<Compromisso | null>(null);

  const handleToggle = useCallback(
    (c: Compromisso) => {
      if (c.pago) {
        Alert.alert(
          "Remover pagamento?",
          "Isso remove apenas o vínculo com a transação e o compromisso volta a ficar pendente. A transação em si não é alterada nem excluída.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Remover", style: "destructive", onPress: () => void desmarcarPagoCompromisso(c.id) },
          ]
        );
        return;
      }
      setCompromissoVinculando(c);
    },
    [desmarcarPagoCompromisso]
  );

  const handleVincularTransacao = useCallback(
    async (transacaoId: string) => {
      if (compromissoVinculando) {
        await pagarCompromissoComTransacao(compromissoVinculando.id, transacaoId);
      }
    },
    [compromissoVinculando, pagarCompromissoComTransacao]
  );

  const handleAbrirNovo = useCallback(() => {
    setCompromissoEditando(null);
    setModalVisivel(true);
  }, []);

  const handleLongPress = useCallback((c: Compromisso) => {
    setCompromissoEditando(c);
    setModalVisivel(true);
  }, []);

  const handleFechar = useCallback(() => {
    setModalVisivel(false);
    setCompromissoEditando(null);
  }, []);

  const handleSalvar = useCallback(
    async (id: string | null, campos: CamposCompromisso) => {
      if (id) {
        await editarCompromisso(id, campos);
      } else {
        await adicionarCompromisso(campos);
      }
    },
    [adicionarCompromisso, editarCompromisso]
  );

  if (carregando) {
    return <CompromissosSkeleton />;
  }

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Próximos compromissos
        </Text>
        <Pressable onPress={handleAbrirNovo} hitSlop={10} accessibilityRole="button" accessibilityLabel="Adicionar compromisso">
          <Ionicons name="add-circle-outline" color={colors["active-icon"]} size={20} />
        </Pressable>
      </View>

      {compromissos.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="calendar-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text text-center mt-2">
            Nenhum compromisso cadastrado. Toque no + para adicionar.
          </Text>
        </View>
      ) : (
        compromissos.map((compromisso) => (
          <CompromissoItem
            key={compromisso.id}
            compromisso={compromisso}
            onLongPress={handleLongPress}
            onToggle={handleToggle}
          />
        ))
      )}

      <EditarCompromissoModal
        visivel={modalVisivel}
        compromissoEditando={compromissoEditando}
        onFechar={handleFechar}
        onSalvar={handleSalvar}
        onExcluir={removerCompromisso}
      />

      <VincularTransacaoCompromissoModal
        visivel={compromissoVinculando !== null}
        compromisso={compromissoVinculando}
        onFechar={() => setCompromissoVinculando(null)}
        onVincular={handleVincularTransacao}
      />
    </View>
  );
}

export const ProximosCompromissos = memo(ProximosCompromissosBase);
