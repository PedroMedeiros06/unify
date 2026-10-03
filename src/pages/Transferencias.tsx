import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";

import { BarraFiltros } from "@/components/common/BarraFiltros";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { EditarTransacaoModal } from "@/components/TransacoesComp/EditarTransacaoModal";
import { useNovaTransacao } from "@/context/NovaTransacaoContext";
import { ListaTransacoesSkeleton } from "@/components/common/ListaTransacoesSkeleton";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { useTransacoes, Transacao, mapearParaTransacaoUI } from "@/context/TransacoesContext";
import { listarTransacoesFiltradas, contarTransacoesFiltradas } from "@/database/queries";
import { useContas } from "@/context/ContasContext";

// Linhas por página do scroll infinito. ~4 telas de altura: a primeira
// carga é rápida e o usuário raramente chega à 2ª página sem filtrar.
const TAMANHO_PAGINA = 50;

const TransacaoItem = memo(function TransacaoItem({
  item,
  isLast,
  onLongPress,
}: {
  item: Transacao;
  isLast: boolean;
  onLongPress: (transacao: Transacao) => void;
}) {
  const colors = useThemeColors();
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
            name={(item.categoriaIcone as keyof typeof Ionicons.glyphMap) ?? "swap-horizontal-outline"}
            color={colors["active-icon"]}
            size={18}
          />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: nomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
            {item.subtitulo} · {item.data}
          </Text>
        </View>
      </View>

      <View className="items-end flex-shrink-0 flex-row gap-2">
        <Text
          style={{ fontSize: valorSize }}
          className={isEntrada ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
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
});

/**
 * Lista completa de transações (rota `transations`, aba do footer).
 *
 * Performance:
 *  - a tela inteira é UM FlatList raiz (header/filtros/contador em
 *    ListHeaderComponent). Antes era ScrollView + FlatList com
 *    scrollEnabled={false}, que anula a virtualização e montava TODAS
 *    as linhas de uma vez;
 *  - paginação no SQL (LIMIT/OFFSET de TAMANHO_PAGINA) com scroll
 *    infinito em onEndReached — nunca traz o histórico inteiro;
 *  - o total do contador vem de um COUNT(*) separado.
 *
 * Recarrega do zero quando os filtros mudam ou quando qualquer
 * transação é escrita (versaoDados do TransacoesContext).
 */
export function Transferencias() {
  const colors = useThemeColors();
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);
  const emptyTitleSize = moderateScale(13);
  const countTextSize = moderateScale(11);
  const buttonTextSize = moderateScale(13);

  const { editarTransacao, removerTransacao, versaoDados } = useTransacoes();
  const { abrir: abrirNovaTransacao } = useNovaTransacao();

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
    consultaTemRecorte,
    filtrosParaQuery,
  } = useFiltrosTransacao({ presetInicial: "esteMes" });

  // Contas para o filtro de banco — do ContasContext, então uma conta
  // criada em Minhas contas já aparece aqui sem recarregar a tela.
  const { contas: bancos } = useContas();
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);

  // Geração da consulta atual: cada recarga do zero incrementa. Uma
  // página que chegar de uma geração antiga (filtro trocado no meio) é
  // descartada em vez de se misturar à lista nova.
  const geracao = useRef(0);

  useEffect(() => {
    const minhaGeracao = ++geracao.current;
    setCarregando(true);

    Promise.all([
      listarTransacoesFiltradas(filtrosParaQuery, TAMANHO_PAGINA, 0),
      contarTransacoesFiltradas(filtrosParaQuery),
    ])
      .then(([linhas, contagem]) => {
        if (geracao.current !== minhaGeracao) return;
        setTransacoes(linhas.map(mapearParaTransacaoUI));
        setTotal(contagem);
      })
      .catch((e) => console.warn("[Transferencias] Falha ao carregar transações:", e))
      .finally(() => {
        if (geracao.current === minhaGeracao) setCarregando(false);
      });
  }, [filtrosParaQuery, versaoDados]);

  const temMais = transacoes.length < total;

  const carregarMais = useCallback(() => {
    if (carregando || carregandoMais || !temMais) return;
    const minhaGeracao = geracao.current;
    setCarregandoMais(true);

    listarTransacoesFiltradas(filtrosParaQuery, TAMANHO_PAGINA, transacoes.length)
      .then((linhas) => {
        if (geracao.current !== minhaGeracao) return;
        setTransacoes((prev) => [...prev, ...linhas.map(mapearParaTransacaoUI)]);
      })
      .catch((e) => console.warn("[Transferencias] Falha ao carregar mais transações:", e))
      .finally(() => setCarregandoMais(false));
  }, [carregando, carregandoMais, temMais, filtrosParaQuery, transacoes.length]);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado]
  );

  const handleLongPress = useCallback((transacao: Transacao) => {
    setTransacaoSelecionada(transacao);
  }, []);

  const handleFecharModal = useCallback(() => {
    setTransacaoSelecionada(null);
  }, []);

  // Edição/exclusão passam pelo TransacoesContext (porta única de
  // escrita); o versaoDados que ele incrementa já dispara a recarga
  // desta lista — não precisa recarregar à mão aqui.
  const handleSalvarEdicao = useCallback(
    (id: string, campos: Parameters<typeof editarTransacao>[1]) => editarTransacao(id, campos),
    [editarTransacao]
  );

  const handleExcluir = useCallback((id: string) => removerTransacao(id), [removerTransacao]);

  const Cabecalho = useMemo(
    () => (
      <View className="flex-col gap-4 mb-4">
        {/* HEADER */}
        <View className="w-full flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Transações
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Todo o seu histórico, com filtros para refinar a busca.
            </Text>
          </View>

          <Pressable
            onPress={abrirNovaTransacao}
            className="flex-row items-center gap-1.5 bg-active-icon px-3 py-2 rounded-xl active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Nova transação manual"
          >
            <Ionicons name="add" color="#fff" size={16} />
            <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
              Nova
            </Text>
          </Pressable>
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
      </View>
    ),
    [
      titleSize,
      subtitleSize,
      buttonTextSize,
      abrirNovaTransacao,
      bancos,
      filtros,
      possuiFiltrosAtivos,
      alternarBanco,
      limparFiltroBanco,
      alternarCategoria,
      limparFiltroCategoria,
      definirPeriodoPreset,
      limparTodosFiltros,
    ]
  );

  // Topo do "card" da lista (contador). Fica fora do Cabecalho para o
  // header (filtros) não remontar a cada página nova que muda o total.
  const TopoCard =
    !carregando && transacoes.length > 0 ? (
      <View className="bg-card-background border-x border-t border-lines-divisions rounded-t-xl px-4">
        <View className="flex-row justify-between items-center py-2 border-b border-lines-divisions">
          <Text style={{ fontSize: countTextSize }} className="text-second-text">
            {total} {total === 1 ? "transação encontrada" : "transações encontradas"}
          </Text>
        </View>
      </View>
    ) : null;

  return (
    <View className="flex-1">
      <FlatList
        data={carregando ? [] : transacoes}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {Cabecalho}
            {TopoCard}
          </>
        }
        renderItem={({ item, index }) => (
          <View className="bg-card-background border-x border-lines-divisions px-4">
            <TransacaoItem
              item={item}
              isLast={index === transacoes.length - 1 && !temMais}
              onLongPress={handleLongPress}
            />
          </View>
        )}
        ListFooterComponent={
          !carregando && transacoes.length > 0 ? (
            <View className="bg-card-background border-x border-b border-lines-divisions rounded-b-xl pb-2">
              {carregandoMais && (
                <View className="py-3 items-center">
                  <ActivityIndicator color={colors["active-icon"]} />
                </View>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          carregando ? (
            <ListaTransacoesSkeleton linhas={8} titulo={false} />
          ) : (
            <View className="bg-card-background border border-lines-divisions rounded-xl items-center py-10">
              <Ionicons name="receipt-outline" color={colors["desactived-text"]} size={30} />
              <Text style={{ fontSize: emptyTitleSize }} className="text-desactived-text text-center mt-2">
                {consultaTemRecorte
                  ? "Nenhuma transação encontrada para os filtros atuais."
                  : "Nenhuma transação ainda.\nImporte um extrato ou toque em \"Nova\" para começar."}
              </Text>
            </View>
          )
        }
        onEndReached={carregarMais}
        onEndReachedThreshold={0.5}
        // Reciclagem de linhas: mantém só ~2 telas montadas.
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
      />

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
    </View>
  );
}
