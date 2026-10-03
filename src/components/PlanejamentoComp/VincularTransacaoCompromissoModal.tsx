import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, FlatList, Modal, Animated, Easing } from "react-native";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useDialogo } from "@/context/DialogoContext";
import { useTransacoes, Transacao, mapearParaTransacaoUI } from "@/context/TransacoesContext";
import { listarTransacoesFiltradas } from "@/database/queries";
import { useCompromissos } from "@/context/CompromissosContext";
import { Compromisso } from "@/database/compromissosQueries";
import { dataBRParaIso } from "@/utils/dateUtils";

/**
 * Seleção de uma transação JÁ EXISTENTE para vincular a um compromisso.
 *
 * O Unify NÃO cria transações — ele organiza/visualiza a vida
 * financeira. "Pagar" um compromisso aqui é só apontar qual transação
 * real (importada ou cadastrada pelo usuário) corresponde a ele. Se não
 * existir transação correspondente, o compromisso continua pendente.
 *
 * Vincular NUNCA altera o valor nem qualquer dado da transação — só
 * grava `compromissos.transacao_id`. Desvincular (feito fora deste
 * modal) remove só o vínculo, a transação permanece intacta.
 *
 * As transações são apenas ORDENADAS por compatibilidade (mesmo tipo =
 * saída, valor igual, data próxima do vencimento) para facilitar achar
 * a certa — a escolha final é sempre manual do usuário.
 *
 * PERFORMANCE: a base de transações pode ter centenas/milhares de
 * linhas. Para não travar ao abrir:
 * - o cálculo da lista só roda quando o modal está `visivel` (antes
 *   disso `useMemo` devolve `[]` de imediato);
 * - a data ISO de cada transação é resolvida UMA vez, no map inicial, e
 *   reaproveitada no `sort` (antes o comparador re-parseava a cada
 *   passo);
 * - a renderização é virtualizada com `FlatList` (não um `.map` que
 *   monta todas as linhas de uma vez);
 * - um campo de busca por nome permite estreitar a lista sem depender
 *   de rolar tudo.
 */

type Props = {
  visivel: boolean;
  compromisso: Compromisso | null;
  onFechar: () => void;
  onVincular: (transacaoId: string) => void | Promise<void>;
};

const TOLERANCIA_VALOR = 0.01;

function diasDeDiferenca(isoA: string, isoB: string): number {
  const [ay, am, ad] = isoA.split("-").map(Number);
  const [by, bm, bd] = isoB.split("-").map(Number);
  const a = new Date(ay, (am ?? 1) - 1, ad ?? 1).getTime();
  const b = new Date(by, (bm ?? 1) - 1, bd ?? 1).getTime();
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

// Normaliza para busca: minúsculas + sem acento, para "agua" casar com
// "Água" etc.
function normalizarBusca(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type TransacaoAvaliada = {
  transacao: Transacao;
  // ISO "aaaa-mm-dd" já resolvido do `transacao.data` (dd/mm/aaaa) —
  // calculado uma vez para o comparador de ordenação não re-parsear.
  dataIso: string;
  // Nome normalizado (minúsculas, sem acento) para o filtro de busca.
  nomeBusca: string;
  compativel: boolean;
  distanciaDias: number;
  jaVinculada: boolean;
};

const LinhaTransacao = memo(function LinhaTransacao({
  item,
  onSelecionar,
}: {
  item: TransacaoAvaliada;
  onSelecionar: (item: TransacaoAvaliada) => void;
}) {
  const colors = useThemeColors();
  const rowTitleSize = moderateScale(13);
  const rowMetaSize = moderateScale(10);
  const rowValueSize = moderateScale(13);
  const badgeSize = moderateScale(9);

  const { transacao } = item;

  return (
    <Pressable
      onPress={() => onSelecionar(item)}
      disabled={item.jaVinculada}
      className={`flex-row items-center gap-3 border rounded-xl p-3 ${
        item.jaVinculada
          ? "border-lines-divisions opacity-40"
          : "border-lines-divisions bg-input-background active:opacity-70"
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${transacao.nome}, ${FormatToCurrency(transacao.valor)}, ${transacao.data}${
        item.compativel ? ", compatível" : ""
      }${item.jaVinculada ? ", já vinculada a outro compromisso" : ""}`}
    >
      <View
        style={{ backgroundColor: `${transacao.banco.cor}22` }}
        className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
      >
        <Text style={{ fontSize: 9, color: transacao.banco.cor }} className="font-Inter-Bold">
          {transacao.banco.sigla}
        </Text>
      </View>

      <View className="flex-1">
        <Text style={{ fontSize: rowTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
          {transacao.nome}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <Text style={{ fontSize: rowMetaSize }} className="text-desactived-text">
            {transacao.data}
          </Text>
          {item.compativel && !item.jaVinculada && (
            <View style={{ backgroundColor: `${colors["sucess-color"]}22` }} className="px-1.5 py-0.5 rounded-full">
              <Text style={{ fontSize: badgeSize, color: colors["sucess-color"] }} className="font-Inter-Medium">
                Compatível
              </Text>
            </View>
          )}
          {item.jaVinculada && (
            <Text style={{ fontSize: badgeSize }} className="text-desactived-text">
              Já vinculada a outro compromisso
            </Text>
          )}
        </View>
      </View>

      <Text style={{ fontSize: rowValueSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
        {FormatToCurrency(transacao.valor)}
      </Text>
    </Pressable>
  );
});

function VincularTransacaoCompromissoModalBase({ visivel, compromisso, onFechar, onVincular }: Props) {
  const colors = useThemeColors();
  const { confirmar } = useDialogo();
  const titleSize = moderateScale(17);
  const subtitleSize = moderateScale(12);
  const noteSize = moderateScale(11);
  const inputSize = moderateScale(13);
  const emptySize = moderateScale(12);

  const { versaoDados } = useTransacoes();

  // Saídas carregadas do banco SÓ enquanto o modal está aberto (antes
  // vinham da lista completa em memória do TransacoesContext, que
  // deixou de existir). Fechado não consulta nada — `listaCompleta`
  // abaixo já ignora a lista quando o modal não está visível.
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  useEffect(() => {
    if (!visivel) return;
    let ativo = true;
    listarTransacoesFiltradas({ tipo: "saida" })
      .then((linhas) => {
        if (ativo) setTransacoes(linhas.map(mapearParaTransacaoUI));
      })
      .catch((e) => console.warn("[VincularTransacaoCompromisso] Falha ao carregar saídas:", e));
    return () => {
      ativo = false;
    };
  }, [visivel, versaoDados]);
  const { compromissos } = useCompromissos();

  const [busca, setBusca] = useState("");

  // Zera a busca sempre que o modal reabre — não faz sentido carregar o
  // filtro de uma consulta anterior para outro compromisso.
  useEffect(() => {
    if (visivel) setBusca("");
  }, [visivel]);

  // Animação simples de entrada/saída (fade + leve scale), no mesmo
  // padrão do ModalCentralizado. Este modal não usa aquele shell porque
  // precisa de um FlatList como raiz do conteúdo (um ScrollView externo
  // anularia a virtualização).
  const [montado, setMontado] = useState(visivel);
  const progresso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visivel) {
      setMontado(true);
      progresso.setValue(0);
      Animated.timing(progresso, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progresso, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
  }, [visivel, progresso]);

  const escala = progresso.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  // Transações já usadas por OUTRO compromisso — continuam aparecendo,
  // mas desabilitadas, para o usuário não vincular a mesma transação a
  // dois compromissos sem perceber.
  const idsJaVinculados = useMemo(() => {
    const set = new Set<string>();
    for (const c of compromissos) {
      if (c.transacaoId && c.id !== compromisso?.id) set.add(c.transacaoId);
    }
    return set;
  }, [compromissos, compromisso?.id]);

  // Lista COMPLETA avaliada e ordenada. Só é calculada quando o modal
  // está aberto — enquanto `visivel` é false devolve [] sem tocar em
  // `transacoes` (evita reprocessar a cada nova transação importada).
  const listaCompleta = useMemo<TransacaoAvaliada[]>(() => {
    if (!visivel || !compromisso) return [];

    // Compromisso é sempre uma despesa — só faz sentido casar com
    // transações de saída.
    const avaliadas: TransacaoAvaliada[] = [];
    for (const transacao of transacoes) {
      if (transacao.tipo !== "saida") continue;
      const dataIso = dataBRParaIso(transacao.data);
      avaliadas.push({
        transacao,
        dataIso,
        nomeBusca: normalizarBusca(transacao.nome),
        compativel: Math.abs(transacao.valor - compromisso.valor) < TOLERANCIA_VALOR,
        distanciaDias: diasDeDiferenca(dataIso, compromisso.dataVencimento),
        jaVinculada: idsJaVinculados.has(transacao.id),
      });
    }

    // Ordena: compatíveis primeiro; dentro de cada grupo, mais perto do
    // vencimento primeiro; empate, mais recente primeiro. Usa `dataIso`
    // já resolvido (ordena corretamente como texto puro).
    avaliadas.sort((a, b) => {
      if (a.compativel !== b.compativel) return a.compativel ? -1 : 1;
      if (a.distanciaDias !== b.distanciaDias) return a.distanciaDias - b.distanciaDias;
      return b.dataIso.localeCompare(a.dataIso);
    });

    return avaliadas;
  }, [visivel, transacoes, compromisso, idsJaVinculados]);

  // Filtro de busca aplicado por cima da lista já ordenada.
  const listaVisivel = useMemo<TransacaoAvaliada[]>(() => {
    const termo = normalizarBusca(busca.trim());
    if (!termo) return listaCompleta;
    return listaCompleta.filter((item) => item.nomeBusca.includes(termo));
  }, [listaCompleta, busca]);

  const handleSelecionar = async (item: TransacaoAvaliada) => {
    if (!compromisso || item.jaVinculada) return;
    const { transacao } = item;
    const ok = await confirmar({
      titulo: "Vincular esta transação?",
      mensagem:
        `${transacao.nome} · ${FormatToCurrency(transacao.valor)} · ${transacao.data}\n\n` +
        "Isso só marca o compromisso como pago. O valor e os dados da transação não são alterados.",
      textoConfirmar: "Vincular",
    });
    if (ok) {
      await Promise.resolve(onVincular(transacao.id));
      onFechar();
    }
  };

  return (
    <Modal
      visible={montado}
      transparent
      animationType="none"
      onRequestClose={onFechar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 items-center justify-center px-5">
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: progresso,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar" />
        </Animated.View>

        <Animated.View
          style={{
            opacity: progresso,
            transform: [{ scale: escala }],
            width: "100%",
            maxWidth: 400,
            maxHeight: "85%",
          }}
        >
          <View className="bg-card-background border border-lines-divisions rounded-2xl overflow-hidden">
            <View className="p-5 pb-3">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                    Vincular transação
                  </Text>
                  {compromisso && (
                    <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1" numberOfLines={2}>
                      {compromisso.nome} · {FormatToCurrency(compromisso.valor)} · vence{" "}
                      {compromisso.dataVencimento.split("-").reverse().join("/")}
                    </Text>
                  )}
                </View>
                <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
                  <Ionicons name="close" color={colors["second-text"]} size={22} />
                </Pressable>
              </View>

              <View className="flex-row items-start gap-2 bg-input-background border border-lines-divisions rounded-xl p-3 mb-3">
                <Ionicons name="information-circle-outline" color={colors["active-icon"]} size={16} />
                <Text style={{ fontSize: noteSize }} className="text-second-text flex-1">
                  Selecionar uma transação apenas marca o compromisso como pago. O valor e os dados da
                  transação não são alterados. O Unify não cria transações — cadastre ou importe a
                  transação real antes.
                </Text>
              </View>

              <View className="flex-row items-center gap-2 bg-input-background border border-input-border rounded-xl px-3 py-2">
                <Ionicons name="search-outline" color={colors["second-text"]} size={16} />
                <TextInput
                  value={busca}
                  onChangeText={setBusca}
                  placeholder="Buscar por nome"
                  placeholderTextColor={colors["desactived-text"]}
                  returnKeyType="search"
                  style={{ flex: 1, color: colors["main-text"], fontSize: inputSize, padding: 0 }}
                  className="font-Inter-Regular"
                  accessibilityLabel="Buscar transação por nome"
                />
                {busca.length > 0 && (
                  <Pressable onPress={() => setBusca("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpar busca">
                    <Ionicons name="close-circle" color={colors["second-text"]} size={16} />
                  </Pressable>
                )}
              </View>
            </View>

            {listaVisivel.length === 0 ? (
              <View className="items-center px-5 pb-8 pt-2">
                <Ionicons name="receipt-outline" color={colors["desactived-text"]} size={26} />
                <Text style={{ fontSize: emptySize }} className="text-desactived-text text-center mt-2">
                  {listaCompleta.length === 0
                    ? "Nenhuma transação de saída cadastrada. Importe ou registre a transação real primeiro — o compromisso continua pendente até lá."
                    : "Nenhuma transação encontrada para essa busca."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={listaVisivel}
                keyExtractor={(item) => item.transacao.id}
                renderItem={({ item }) => <LinhaTransacao item={item} onSelecionar={handleSelecionar} />}
                ItemSeparatorComponent={SeparadorLista}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={7}
                removeClippedSubviews
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SeparadorLista() {
  return <View style={{ height: 8 }} />;
}

export const VincularTransacaoCompromissoModal = memo(VincularTransacaoCompromissoModalBase);
