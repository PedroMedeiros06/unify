import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { Text, View, Pressable, FlatList, ScrollView } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";
import { EditarTransacaoModal } from "@/components/TransacoesComp/EditarTransacaoModal";
import { ListaTransacoesSkeleton } from "@/components/common/ListaTransacoesSkeleton";
import { SeletorBancoMultiplo } from "@/components/common/SeletorBancoMultiplo";
import { SeletorCategoriaMultiplo } from "@/components/common/SeletorCategoriaMultiplo";
import { DropdownPeriodo } from "@/components/common/DropdownPeriodo";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { useNavigation } from "@/context/NavigationContext";
import { useNovaTransacao } from "@/context/NovaTransacaoContext";
import { listarBancos, listarTransacoesFiltradas, Banco, TransacaoComBanco } from "@/database/queries";
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

const TransacaoItem = memo(function TransacaoItem({
  item,
  isLast,
  onLongPress,
}: {
  item: Transacao;
  isLast: boolean;
  onLongPress: (transacao: Transacao) => void;
}) {
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
  const sectionTitleSize = moderateScale(20);
  const actionTextSize = moderateScale(12);
  const itemTitleSize = moderateScale(14);
  const emptyTitleSize = moderateScale(13);

  const { transacoes: transacoesDoContext, carregando: carregandoContext, editarTransacao, removerTransacao } = useTransacoes();
  const { navigate } = useNavigation();
  const { abrir: abrirNovaTransacao } = useNovaTransacao();

  const {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    consultaTemRecorte,
    filtrosParaQuery,
  } = useFiltrosTransacao({ presetInicial: "tudo" });

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<Transacao | null>(null);

  const [transacoesFiltradas, setTransacoesFiltradas] = useState<Transacao[]>([]);
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);
  // Vira true depois do primeiro resultado de filtro. A partir daí, um
  // refetch (trocar banco/categoria/período) NÃO troca a árvore inteira
  // por skeleton — isso desmontava o dropdown aberto e o fechava a cada
  // seleção. O conteúdo antigo fica visível até o novo chegar.
  const [filtroJaCarregou, setFiltroJaCarregou] = useState(false);

  useEffect(() => {
    listarBancos().then(setBancos);
  }, []);

  // Usa consultaTemRecorte (não possuiFiltrosAtivos): a lista precisa
  // respeitar a janela que a CASCATA fixou (ex: "7dias") mesmo que o
  // usuário não tenha tocado em nada — nesse caso possuiFiltrosAtivos é
  // false, mas ainda há um recorte de período a aplicar.
  useEffect(() => {
    if (!consultaTemRecorte) return;

    let ativo = true;
    setCarregandoFiltro(true);

    listarTransacoesFiltradas(filtrosParaQuery, 5)
      .then((linhas) => {
        if (!ativo) return;
        setTransacoesFiltradas(linhas.map(mapearParaTransacaoUI));
        setFiltroJaCarregou(true);
      })
      .finally(() => {
        if (ativo) setCarregandoFiltro(false);
      });

    return () => {
      ativo = false;
    };
    // transacoesDoContext entra como gatilho: quando uma nova transação
    // é criada pelo modal global (ou editada/excluída), a lista filtrada
    // precisa refazer a query para refletir a mudança.
  }, [consultaTemRecorte, filtrosParaQuery, transacoesDoContext]);

  // Skeleton só no PRIMEIRO carregamento (sem árvore montada ainda).
  // Refetch de filtro depois disso mantém a lista atual visível para
  // não desmontar dropdowns abertos.
  const carregandoInicial = consultaTemRecorte
    ? carregandoFiltro && !filtroJaCarregou
    : carregandoContext;
  const transacoesRecentes = consultaTemRecorte ? transacoesFiltradas : transacoesDoContext.slice(0, 5);

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

          <Pressable className="p-1 active:opacity-60" hitSlop={8} accessibilityRole="button" accessibilityLabel="Pesquisar transações">
            <Ionicons name="search-outline" color={colors["second-text"]} size={18} />
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