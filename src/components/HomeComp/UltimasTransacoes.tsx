import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable, FlatList, ScrollView, TextInput } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useTransacoes, Transacao, mapearParaTransacaoUI } from "@/context/TransacoesContext";
import { EditarTransacaoModal } from "@/components/TransacoesComp/EditarTransacaoModal";
import { ListaTransacoesSkeleton } from "@/components/common/ListaTransacoesSkeleton";
import { SeletorBancoMultiplo } from "@/components/common/SeletorBancoMultiplo";
import { SeletorCategoriaMultiplo } from "@/components/common/SeletorCategoriaMultiplo";
import { DropdownPeriodo } from "@/components/common/DropdownPeriodo";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { useNavigation } from "@/context/NavigationContext";
import { useNovaTransacao } from "@/context/NovaTransacaoContext";
import { listarTransacoesFiltradas } from "@/database/queries";
import { useContas } from "@/context/ContasContext";

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
  const itemTitleSize = moderateScale(14);
  const itemSubtitleSize = moderateScale(12);
  const bankLogoSize = moderateScale(24);

  const isEntrada = item.tipo === "entrada";

  return (
    <Pressable
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      className={`py-3 flex-row justify-between items-center active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions/30"}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.nome}, ${FormatToCurrency(item.valor)}. Toque e segure para editar ou excluir.`}
    >
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View className="w-10 h-10 rounded-full bg-active-icon/20 items-center justify-center flex-shrink-0">
          <Ionicons
            name={(item.categoriaIcone as keyof typeof Ionicons.glyphMap) ?? "swap-horizontal-outline"}
            color={colors["active-icon"]}
            size={20}
          />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text" numberOfLines={1}>
            {item.subtitulo}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 flex-shrink-0">
        <View className="items-end">
          <Text
            style={{ fontSize: itemTitleSize }}
            className={isEntrada ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
            numberOfLines={1}
          >
            {isEntrada ? "+ " : ""}
            {FormatToCurrency(item.valor)}
          </Text>
          <Text style={{ fontSize: itemSubtitleSize }} className="text-second-text">
            {item.data}
          </Text>
        </View>
        <View
          style={{ width: bankLogoSize, height: bankLogoSize, backgroundColor: item.banco.cor }}
          className="rounded-md items-center justify-center"
        >
          <Text style={{ fontSize: 9 }} className="text-white font-Inter-Bold">
            {item.banco.sigla}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function UltimasTransacoesBase() {
  const colors = useThemeColors();
  const sectionTitleSize = moderateScale(20);
  const actionTextSize = moderateScale(12);
  const itemTitleSize = moderateScale(14);
  const emptyTitleSize = moderateScale(13);

  const { versaoDados, editarTransacao, removerTransacao } = useTransacoes();
  const { navigate } = useNavigation();
  const { abrir: abrirNovaTransacao } = useNovaTransacao();

  const {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirTextoBusca,
    limparTextoBusca,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    consultaTemRecorte,
    filtrosParaQuery,
  } = useFiltrosTransacao({ presetInicial: "tudo" });

  // Contas para o filtro de banco — do ContasContext, então uma conta
  // criada em Minhas contas já aparece aqui sem recarregar a tela.
  const { contas: bancos } = useContas();
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);
  // A lupa alterna entre a barra de filtros (default) e o campo de
  // busca por texto. Fechar a busca sempre zera o texto digitado, para
  // não deixar um recorte "escondido" atrás da barra de filtros.
  const [buscaAberta, setBuscaAberta] = useState(false);

  const alternarBusca = useCallback(() => {
    setBuscaAberta((aberta) => {
      if (aberta) limparTextoBusca();
      return !aberta;
    });
  }, [limparTextoBusca]);

  const [transacoesFiltradas, setTransacoesFiltradas] = useState<Transacao[]>([]);
  // Vira true depois do primeiro resultado de filtro. A partir daí, um
  // refetch (trocar banco/categoria/período) NÃO troca a árvore inteira
  // por skeleton — isso desmontava o dropdown aberto e o fechava a cada
  // seleção. O conteúdo antigo fica visível até o novo chegar.
  const [filtroJaCarregou, setFiltroJaCarregou] = useState(false);

  // Sempre consulta o banco com LIMIT 5 — com ou sem filtro (sem
  // recorte, `filtrosParaQuery` vem vazio = todas). Antes, sem filtro,
  // usava a lista COMPLETA do TransacoesContext, que deixou de existir
  // (carregar todas as transações no boot pesava). `versaoDados` refaz
  // a consulta quando uma transação é criada/editada/excluída.
  useEffect(() => {
    let ativo = true;

    listarTransacoesFiltradas(filtrosParaQuery, 5)
      .then((linhas) => {
        if (!ativo) return;
        setTransacoesFiltradas(linhas.map(mapearParaTransacaoUI));
        setFiltroJaCarregou(true);
      })
      .catch((e) => console.warn("[UltimasTransacoes] Falha ao carregar dados:", e));

    return () => {
      ativo = false;
    };
  }, [filtrosParaQuery, versaoDados]);

  // Skeleton só no PRIMEIRO carregamento (sem árvore montada ainda).
  // Refetch de filtro depois disso mantém a lista atual visível para
  // não desmontar dropdowns abertos.
  const carregandoInicial = !filtroJaCarregou;
  const transacoesRecentes = transacoesFiltradas;

  const handleLongPress = useCallback((transacao: Transacao) => {
    setTransacaoSelecionada(transacao);
  }, []);

  const handleFecharModal = useCallback(() => {
    setTransacaoSelecionada(null);
  }, []);

  const handleVerTodas = useCallback(() => {
    navigate("transations");
  }, [navigate]);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado]
  );

  const rotuloPersonalizado =
    filtros.periodoPreset === "personalizado" && filtros.periodoInicioPersonalizado && filtros.periodoFimPersonalizado
      ? `${filtros.periodoInicioPersonalizado.split("-").reverse().join("/")} - ${filtros.periodoFimPersonalizado.split("-").reverse().join("/")}`
      : null;

  if (carregandoInicial) {
    return <ListaTransacoesSkeleton linhas={5} />;
  }

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl px-4 py-4 flex-col gap-4">
      <View className="flex-col gap-4">
        <View className="flex-row justify-between items-center">
          <Text
            style={{ fontSize: sectionTitleSize, letterSpacing: sectionTitleSize * -0.03 }}
            className="text-main-text font-Inter-SemiBold"
          >
            Últimas transações
          </Text>

          <Pressable
            onPress={handleVerTodas}
            className="flex-row items-center gap-1 active:opacity-60"
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ver todas as transações"
          >
            <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
              Ver todas
            </Text>
            <Ionicons name="arrow-forward" color={colors["active-icon"]} size={14} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between gap-y-2">
          {buscaAberta ? (
            <View className="flex-1 flex-row items-center gap-2 pr-1 bg-input-background border border-input-border rounded-xl px-3 py-2">
              <Ionicons name="search-outline" color={colors["second-text"]} size={16} />
              <TextInput
                value={filtros.textoBusca}
                onChangeText={definirTextoBusca}
                placeholder="Buscar por nome ou descrição"
                placeholderTextColor={colors["desactived-text"]}
                autoFocus
                returnKeyType="search"
                style={{ flex: 1, color: colors["main-text"], fontSize: moderateScale(13), padding: 0 }}
                className="font-Inter-Regular"
                accessibilityLabel="Campo de busca de transações"
              />
              {filtros.textoBusca.length > 0 && (
                <Pressable
                  onPress={limparTextoBusca}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                >
                  <Ionicons name="close-circle" color={colors["second-text"]} size={16} />
                </Pressable>
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, flexGrow: 1 }}
              className="flex-1 pr-1"
            >
              <SeletorBancoMultiplo
                bancos={bancos}
                bancosSelecionados={filtros.bancosSelecionados}
                onAlternar={alternarBanco}
                onLimpar={limparFiltroBanco}
              />

              <DropdownPeriodo
                periodoAtivo={filtros.periodoPreset}
                rotuloPersonalizado={rotuloPersonalizado}
                onSelecionarPreset={definirPeriodoPreset}
                onAbrirPersonalizado={() => setModalPeriodoAberto(true)}
              />

              <SeletorCategoriaMultiplo
                categoriasSelecionadas={filtros.categoriasSelecionadas}
                onAlternar={alternarCategoria}
                onLimpar={limparFiltroCategoria}
              />
            </ScrollView>
          )}

          <Pressable
            onPress={alternarBusca}
            className="p-1 active:opacity-60"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded: buscaAberta }}
            accessibilityLabel={buscaAberta ? "Fechar busca e voltar aos filtros" : "Pesquisar transações"}
          >
            <Ionicons
              name={buscaAberta ? "close" : "search-outline"}
              color={colors["second-text"]}
              size={18}
            />
          </Pressable>
        </View>
      </View>

      {transacoesRecentes.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="receipt-outline" color={colors["desactived-text"]} size={30} />
          <Text style={{ fontSize: emptyTitleSize }} className="text-desactived-text text-center mt-2">
            {consultaTemRecorte
              ? "Nenhuma transação encontrada para os filtros atuais."
              : "Nenhuma transação ainda.\nImporte um extrato ou adicione manualmente."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transacoesRecentes}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <TransacaoItem
              item={item}
              isLast={index === transacoesRecentes.length - 1}
              onLongPress={handleLongPress}
            />
          )}
        />
      )}

      <Pressable
        onPress={abrirNovaTransacao}
        className="w-full py-2 rounded-xl border border-dashed border-input-border flex-row items-center justify-center gap-2 active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel="Adicionar transação"
      >
        <Ionicons name="add" color={colors["active-icon"]} size={18} />
        <Text style={{ fontSize: itemTitleSize }} className="text-active-icon font-Inter-Medium">
          Adicionar transação
        </Text>
      </Pressable>

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
        onSalvar={editarTransacao}
        onExcluir={removerTransacao}
      />
    </View>
  );
}

export const UltimasTransacoes = memo(UltimasTransacoesBase);