import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";

import { BarraFiltros } from "@/components/common/BarraFiltros";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { EditarTransacaoModal } from "@/components/TransacoesComp/EditarTransacaoModal";
import { ListaTransacoesSkeleton } from "@/components/common/ListaTransacoesSkeleton";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { useNavigation } from "@/context/NavigationContext";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";
import {
  listarBancos,
  listarTransacoesFiltradas,
  Banco,
  TransacaoComBanco,
} from "@/database/queries";
import { dataIsoParaBR } from "@/utils/dateUtils";

function mapearParaTransacaoUI(t: TransacaoComBanco): Transacao {
  return {
    id: t.id,
    nome: t.nome,
    subtitulo: t.subtitulo,
    valor: t.valor,
    tipo: t.tipo,
    data: dataIsoParaBR(t.data),
    hora: t.hora ?? undefined,
    banco: { sigla: t.banco.sigla, cor: t.banco.cor },
    status: t.status,
    categoriaIcone: t.categoriaIcone ?? undefined,
    categoriaId: t.categoriaId,
  };
}

const TransacaoItem = ({
  item,
  isLast,
  onLongPress,
}: {
  item: Transacao;
  isLast: boolean;
  onLongPress: (transacao: Transacao) => void;
}) => {
  const nomeSize = moderateScale(13);
  const subtituloSize = moderateScale(11);
  const valorSize = moderateScale(13);

  const isEntrada = item.tipo === "entrada";

  return (
    <Pressable
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      className={`flex-row items-center justify-between py-3 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${FormatToCurrency(item.valor)}. Toque e segure para editar.`}
    >
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View className="w-10 h-10 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
          <Ionicons
            name={
              (item.categoriaIcone as keyof typeof Ionicons.glyphMap) ??
              "swap-horizontal-outline"
            }
            color={colors["active-icon"]}
            size={18}
          />
        </View>
        <View className="flex-1">
          <Text
            style={{ fontSize: nomeSize }}
            className="text-main-text font-Inter-Medium"
            numberOfLines={1}
          >
            {item.nome}
          </Text>
          <Text
            style={{ fontSize: subtituloSize }}
            className="text-desactived-text"
            numberOfLines={1}
          >
            {item.subtitulo} · {item.data}
          </Text>
        </View>
      </View>

      <View className="items-end flex-shrink-0 flex-row gap-2">
        <Text
          style={{ fontSize: valorSize }}
          className={
            isEntrada
              ? "text-sucess-color font-Inter-SemiBold"
              : "text-main-text font-Inter-SemiBold"
          }
          numberOfLines={1}
        >
          {isEntrada ? "+ " : "- "}
          {FormatToCurrency(item.valor)}
        </Text>
        <View
          style={{ backgroundColor: item.banco.cor }}
          className="w-6 h-6 rounded-md items-center justify-center"
        >
          <Text style={{ fontSize: 9 }} className="text-white font-Inter-Bold">
            {item.banco.sigla}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export function TodasTransacoes() {
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);
  const emptyTitleSize = moderateScale(13);
  const countTextSize = moderateScale(11);

  const { goBack } = useNavigation();
  const { transacoes: transacoesContext, editarTransacao, removerTransacao } = useTransacoes();

  // Estado de filtros LOCAL desta tela — independente do card de
  // "Últimas transações" na Home, por decisão de escopo.
  const {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    limparTodosFiltros,
    possuiFiltrosAtivos,
    filtrosParaQuery,
  } = useFiltrosTransacao();

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [transacaoSelecionada, setTransacaoSelecionada] =
    useState<Transacao | null>(null);

  useEffect(() => {
    listarBancos().then(setBancos);
  }, []);

  const carregarTransacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const linhas = await listarTransacoesFiltradas(filtrosParaQuery);
      setTransacoes(linhas.map(mapearParaTransacaoUI));
    } finally {
      setCarregando(false);
    }
  }, [filtrosParaQuery]);

  // Recarrega quando os filtros mudam OU quando a lista global muda
  // (transação criada pelo modal global, edição, exclusão).
  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes, transacoesContext]);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado],
  );

  const handleLongPress = useCallback((transacao: Transacao) => {
    setTransacaoSelecionada(transacao);
  }, []);

  const handleFecharModal = useCallback(() => {
    setTransacaoSelecionada(null);
  }, []);

  // Edição/exclusão passam pelo TransacoesContext (fonte única de
  // verdade para escrita), depois recarregamos esta lista filtrada
  // para refletir a mudança — o Context mantém sua própria lista
  // paralela (não filtrada) para o resto do app.
  const handleSalvarEdicao = useCallback(
    async (id: string, campos: Parameters<typeof editarTransacao>[1]) => {
      await editarTransacao(id, campos);
      await carregarTransacoes();
    },
    [editarTransacao, carregarTransacoes],
  );

  const handleExcluir = useCallback(
    async (id: string) => {
      await removerTransacao(id);
      await carregarTransacoes();
    },
    [removerTransacao, carregarTransacoes],
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
              Todas as transações
            </Text>
            <Text
              style={{ fontSize: subtitleSize }}
              className="text-second-text mt-1"
            >
              Use os filtros para refinar sua busca.
            </Text>
          </View>
        </View>

        <BarraFiltros
          bancos={bancos}
          filtros={filtros}
          possuiFiltrosAtivos={possuiFiltrosAtivos}
          onAlternarBanco={alternarBanco}
          onLimparBanco={limparFiltroBanco}
          onAlternarCategoria={alternarCategoria}
          onLimparCategoria={limparFiltroCategoria}
          onDefinirPeriodoPreset={definirPeriodoPreset}
          onAbrirPeriodoPersonalizado={() => setModalPeriodoAberto(true)}
          onLimparTodos={limparTodosFiltros}
        />

        {carregando ? (
          <ListaTransacoesSkeleton linhas={8} titulo={false} />
        ) : (
          <View className="bg-card-background border border-lines-divisions rounded-xl px-4 py-2">
            <View className="flex-row justify-between items-center py-2 border-b border-lines-divisions">
              <Text
                style={{ fontSize: countTextSize }}
                className="text-second-text"
              >
                {transacoes.length}{" "}
                {transacoes.length === 1
                  ? "transação encontrada"
                  : "transações encontradas"}
              </Text>
            </View>

            {transacoes.length === 0 ? (
              <View className="items-center py-10">
                <Ionicons
                  name="receipt-outline"
                  color={colors["desactived-text"]}
                  size={30}
                />
                <Text
                  style={{ fontSize: emptyTitleSize }}
                  className="text-desactived-text text-center mt-2"
                >
                  Nenhuma transação encontrada para os filtros atuais.
                </Text>
              </View>
            ) : (
              <FlatList
                data={transacoes}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <TransacaoItem
                    item={item}
                    isLast={index === transacoes.length - 1}
                    onLongPress={handleLongPress}
                  />
                )}
              />
            )}
          </View>
        )}
      </View>

      <SeletorPeriodoPersonalizado
        visivel={modalPeriodoAberto}
        inicioIso={filtros.periodoInicioPersonalizado}
        fimIso={filtros.periodoFimPersonalizado}
        onConfirmar={handleConfirmarPeriodo}
        onFechar={() => setModalPeriodoAberto(false)}
      />

      <EditarTransacaoModal
        transacao={transacaoSelecionada}
        onFechar={handleFecharModal}
        onSalvar={handleSalvarEdicao}
        onExcluir={handleExcluir}
      />
    </ScrollView>
  );
}
