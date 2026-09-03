import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { memo, useMemo, useState } from "react";
import { TransacaoComCategoria, VinculoMetaPendente } from "@/hooks/useImportacaoCsv";
import { obterCategoriaPorId, CategoriaId } from "@/database/categorias";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { useMetas } from "@/context/MetasContext";
import { calcularPercentualMeta, metaEstaConcluida } from "@/database/metasQueries";
import { obterIconeMeta } from "@/database/iconesMeta";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

// Cada linha carrega seu índice ORIGINAL na lista completa — é a chave
// usada por transacoesExcluidas e vinculosPendentes no hook. A divisão
// visual em dois quadros nunca reindexa nada.
type LinhaPreview = { item: TransacaoComCategoria; indiceOriginal: number };

const ItemPreview = memo(function ItemPreview({
  item,
  indiceOriginal,
  incluida,
  vinculo,
  onToggle,
  onAbrirSeletorCategoria,
  onAbrirSeletorMeta,
  onRemoverVinculo,
  isLast,
}: {
  item: TransacaoComCategoria;
  indiceOriginal: number;
  incluida: boolean;
  vinculo: VinculoMetaPendente | undefined;
  onToggle: (index: number) => void;
  onAbrirSeletorCategoria: (index: number) => void;
  onAbrirSeletorMeta: (index: number) => void;
  onRemoverVinculo: (index: number) => void;
  isLast: boolean;
}) {
  const nomeSize = moderateScale(12);
  const valorSize = moderateScale(12);
  const avisoSize = moderateScale(10);
  const categoriaSize = moderateScale(10);

  const [ano, mes, dia] = item.data.split("-");
  const categoria = obterCategoriaPorId(item.categoriaId);

  return (
    <View className={`py-2.5 ${isLast ? "" : "border-b border-lines-divisions/50"}`}>
      <Pressable
        onPress={() => onToggle(indiceOriginal)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: incluida }}
        accessibilityLabel={`${item.descricao}, ${FormatToCurrency(item.valor)}${item.possivelDuplicata ? ", possível duplicata" : ""}`}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className={`w-5 h-5 rounded-md border items-center justify-center flex-shrink-0 ${
              incluida ? "bg-active-icon border-active-icon" : "border-input-border bg-transparent"
            }`}
          >
            {incluida && <Ionicons name="checkmark" color="#fff" size={13} />}
          </View>

          <View className="flex-1">
            <Text
              style={{ fontSize: nomeSize }}
              className={incluida ? "text-main-text" : "text-desactived-text"}
              numberOfLines={1}
            >
              {item.descricao}
            </Text>
            <Text style={{ fontSize: nomeSize - 1 }} className="text-desactived-text">
              {dia}/{mes}/{ano}
            </Text>
          </View>

          <Text
            style={{ fontSize: valorSize }}
            className={
              !incluida
                ? "text-desactived-text font-Inter-Medium"
                : item.tipo === "entrada"
                  ? "text-sucess-color font-Inter-Medium"
                  : "text-main-text font-Inter-Medium"
            }
          >
            {item.tipo === "entrada" ? "+ " : "- "}
            {FormatToCurrency(item.valor)}
          </Text>
        </View>
      </Pressable>

      {/* Chip de categoria — toque abre o dropdown para corrigir antes de importar */}
      <Pressable
        onPress={() => onAbrirSeletorCategoria(indiceOriginal)}
        className="flex-row items-center gap-1.5 mt-1.5 ml-7 self-start"
        accessibilityRole="button"
        accessibilityLabel={`Categoria: ${categoria?.nome ?? "sem categoria"}. Toque para alterar.`}
      >
        <View
          style={{ backgroundColor: categoria ? `${categoria.cor}22` : `${colors["warn-color"]}22` }}
          className="flex-row items-center gap-1 px-2 py-1 rounded-full"
        >
          <Ionicons
            name={categoria?.icone ?? "help-circle-outline"}
            color={categoria?.cor ?? colors["warn-color"]}
            size={11}
          />
          <Text
            style={{ fontSize: categoriaSize, color: categoria?.cor ?? colors["warn-color"] }}
            className="font-Inter-Medium"
          >
            {categoria?.nome ?? "Sem categoria"}
          </Text>
        </View>
        <Ionicons name="pencil" color={colors["desactived-text"]} size={10} />
      </Pressable>

      {/* Vínculo com meta — escolhido AQUI, no preview. Se já há vínculo
          pendente, mostra o chip da meta com ✕ para remover; se não,
          mostra o botão para escolher uma meta. O vínculo real só é
          criado ao confirmar a importação. */}
      {vinculo ? (
        <View className="flex-row items-center gap-1.5 mt-1.5 ml-7 self-start">
          <View
            style={{ backgroundColor: `${vinculo.metaCor}22` }}
            className="flex-row items-center gap-1 px-2 py-1 rounded-full"
          >
            <Text style={{ fontSize: categoriaSize }}>🎯</Text>
            <Text
              style={{ fontSize: categoriaSize, color: vinculo.metaCor }}
              className="font-Inter-Medium"
              numberOfLines={1}
            >
              {vinculo.metaNome}
            </Text>
          </View>
          <Pressable
            onPress={() => onRemoverVinculo(indiceOriginal)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remover vínculo com a meta ${vinculo.metaNome}`}
          >
            <Ionicons name="close-circle" color={colors["desactived-text"]} size={14} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onAbrirSeletorMeta(indiceOriginal)}
          className="flex-row items-center gap-1 mt-1.5 ml-7 self-start px-2 py-1 rounded-full border border-active-icon/40"
          accessibilityRole="button"
          accessibilityLabel="Vincular esta transação a uma meta"
        >
          <Ionicons name="flag-outline" color={colors["active-icon"]} size={11} />
          <Text style={{ fontSize: categoriaSize }} className="text-active-icon font-Inter-Medium">
            Vincular a meta
          </Text>
        </Pressable>
      )}

      {item.possivelDuplicata && (
        <View className="flex-row items-start gap-1.5 mt-1.5 ml-7">
          <Ionicons name="alert-circle-outline" color={colors["warn-color"]} size={12} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: avisoSize }} className="text-warn-color flex-1">
            {item.motivoDuplicata}
          </Text>
        </View>
      )}
    </View>
  );
});

// Sub-card com título + contador para cada um dos dois grupos da lista.
function GrupoLinhas({
  titulo,
  icone,
  corIcone,
  descricao,
  linhas,
  alturaMaxima,
  transacoesExcluidas,
  vinculosPendentes,
  onToggle,
  onAbrirSeletorCategoria,
  onAbrirSeletorMeta,
  onRemoverVinculo,
}: {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  descricao?: string;
  linhas: LinhaPreview[];
  alturaMaxima: number;
  transacoesExcluidas: Set<number>;
  vinculosPendentes: Map<number, VinculoMetaPendente>;
  onToggle: (index: number) => void;
  onAbrirSeletorCategoria: (index: number) => void;
  onAbrirSeletorMeta: (index: number) => void;
  onRemoverVinculo: (index: number) => void;
}) {
  const sectionTitleSize = moderateScale(12);
  const contadorSize = moderateScale(11);

  if (linhas.length === 0) return null;

  return (
    <View className="mb-3">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name={icone} color={corIcone} size={14} />
        <Text style={{ fontSize: sectionTitleSize }} className="text-second-text font-Inter-Medium flex-1">
          {titulo}
        </Text>
        <View className="px-2 py-0.5 rounded-full bg-input-background border border-lines-divisions">
          <Text style={{ fontSize: contadorSize }} className="text-second-text font-Inter-Medium">
            {linhas.length}
          </Text>
        </View>
      </View>

      {descricao && (
        <Text style={{ fontSize: contadorSize }} className="text-desactived-text mb-2">
          {descricao}
        </Text>
      )}

      <View className="bg-input-background border border-lines-divisions rounded-xl px-3">
        <ScrollView style={{ maxHeight: alturaMaxima }} nestedScrollEnabled showsVerticalScrollIndicator>
          {linhas.map(({ item, indiceOriginal }, i) => (
            <ItemPreview
              key={indiceOriginal}
              item={item}
              indiceOriginal={indiceOriginal}
              incluida={!transacoesExcluidas.has(indiceOriginal)}
              vinculo={vinculosPendentes.get(indiceOriginal)}
              onToggle={onToggle}
              onAbrirSeletorCategoria={onAbrirSeletorCategoria}
              onAbrirSeletorMeta={onAbrirSeletorMeta}
              onRemoverVinculo={onRemoverVinculo}
              isLast={i === linhas.length - 1}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

type Props = {
  transacoes: TransacaoComCategoria[];
  transacoesExcluidas: Set<number>;
  vinculosPendentes: Map<number, VinculoMetaPendente>;
  linhasComErro: { numeroLinha: number; conteudoOriginal: string; motivo: string }[];
  nomeBanco: string;
  nomeArquivo: string;
  onToggleTransacao: (index: number) => void;
  onDefinirCategoria: (index: number, categoriaId: CategoriaId) => void;
  onDefinirVinculoMeta: (index: number, vinculo: VinculoMetaPendente) => void;
  onRemoverVinculoMeta: (index: number) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  salvando: boolean;
};

function PreviewImportacaoBase({
  transacoes,
  transacoesExcluidas,
  vinculosPendentes,
  linhasComErro,
  nomeBanco,
  nomeArquivo,
  onToggleTransacao,
  onDefinirCategoria,
  onDefinirVinculoMeta,
  onRemoverVinculoMeta,
  onConfirmar,
  onCancelar,
  salvando,
}: Props) {
  const titleSize = moderateScale(15);
  const subtitleSize = moderateScale(11);
  const countLabelSize = moderateScale(11);
  const countValueSize = moderateScale(20);
  const buttonTextSize = moderateScale(14);
  const metaNomeSize = moderateScale(14);
  const metaProgressoSize = moderateScale(11);

  const [indiceEditandoCategoria, setIndiceEditandoCategoria] = useState<number | null>(null);
  const [indiceEditandoMeta, setIndiceEditandoMeta] = useState<number | null>(null);

  const { metas, carregando: carregandoMetas } = useMetas();
  const metasDisponiveis = useMemo(() => metas.filter((m) => !metaEstaConcluida(m)), [metas]);

  // Divisão dos dois quadros: quadro 2 = só as linhas que a detecção
  // (pareceMovimentacaoParaMeta) marcou. Vincular manualmente uma linha
  // do quadro 1 NÃO a move de quadro — evita a lista pular debaixo do
  // dedo enquanto o usuário revisa.
  const { linhasNormais, linhasMeta } = useMemo(() => {
    const normais: LinhaPreview[] = [];
    const meta: LinhaPreview[] = [];
    transacoes.forEach((item, indiceOriginal) => {
      (item.possivelMovimentacaoMeta ? meta : normais).push({ item, indiceOriginal });
    });
    return { linhasNormais: normais, linhasMeta: meta };
  }, [transacoes]);

  const totalDuplicatas = transacoes.filter((t) => t.possivelDuplicata).length;
  const totalSelecionadas = transacoes.length - transacoesExcluidas.size;
  const totalErro = linhasComErro.length;
  const totalSemCategoria = transacoes.filter((t) => !t.categoriaId).length;
  const totalVinculos = vinculosPendentes.size;

  const handleSelecionarCategoria = (categoriaId: CategoriaId | null) => {
    if (indiceEditandoCategoria === null || !categoriaId) return;
    onDefinirCategoria(indiceEditandoCategoria, categoriaId);
    setIndiceEditandoCategoria(null);
  };

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      {/* ---- TOPO FIXO: identificação + contadores + ações ----
          Fica ANTES da lista de propósito: com centenas de linhas, o
          botão "Importar" precisa estar sempre à vista, sem scroll. */}
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="checkmark-circle-outline" color={colors["sucess-color"]} size={18} />
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-Medium flex-1" numberOfLines={1}>
          {nomeBanco} identificado
        </Text>
      </View>
      <Text style={{ fontSize: subtitleSize }} className="text-desactived-text mb-4" numberOfLines={1}>
        {nomeArquivo}
      </Text>

      <View className="flex-row gap-2.5 mb-3">
        <View className="flex-1 bg-sucess-color/10 border border-sucess-color/30 rounded-xl p-3 items-center">
          <Text style={{ fontSize: countValueSize }} className="text-sucess-color font-Inter-SemiBold">
            {totalSelecionadas}
          </Text>
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
            selecionadas
          </Text>
        </View>

        {totalDuplicatas > 0 && (
          <View className="flex-1 bg-warn-color/10 border border-warn-color/30 rounded-xl p-3 items-center">
            <Text style={{ fontSize: countValueSize }} className="text-warn-color font-Inter-SemiBold">
              {totalDuplicatas}
            </Text>
            <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
              possíveis duplicatas
            </Text>
          </View>
        )}

        {totalErro > 0 && (
          <View className="flex-1 bg-error-color/10 border border-error-color/30 rounded-xl p-3 items-center">
            <Text style={{ fontSize: countValueSize }} className="text-error-color font-Inter-SemiBold">
              {totalErro}
            </Text>
            <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center">
              linhas ignoradas
            </Text>
          </View>
        )}
      </View>

      {totalVinculos > 0 && (
        <View className="flex-row items-center gap-2 bg-active-icon/10 border border-active-icon/30 rounded-xl p-2.5 mb-3">
          <Text style={{ fontSize: countLabelSize }} className="text-active-icon flex-1">
            🎯 {totalVinculos} {totalVinculos === 1 ? "transação será vinculada" : "transações serão vinculadas"} a metas ao importar.
          </Text>
        </View>
      )}

      {totalSemCategoria > 0 && (
        <View className="flex-row items-start gap-2 bg-warn-color/10 rounded-lg p-2.5 mb-3">
          <Ionicons name="pricetag-outline" color={colors["warn-color"]} size={14} style={{ marginTop: 1 }} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text flex-1">
            {totalSemCategoria} {totalSemCategoria === 1 ? "transação ficará" : "transações ficarão"} sem categoria. Toque no chip de categoria de cada linha para definir agora, se quiser.
          </Text>
        </View>
      )}

      {/* AÇÕES — logo abaixo do resumo, acima da lista longa */}
      <View className="flex-row gap-2.5 mb-4">
        <Pressable
          onPress={onCancelar}
          disabled={salvando}
          className="flex-1 py-3 rounded-xl items-center justify-center border border-input-border active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Cancelar importação"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-second-text font-Inter-Medium">
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirmar}
          disabled={salvando || totalSelecionadas === 0}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${totalSelecionadas > 0 && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
          accessibilityRole="button"
          accessibilityLabel="Confirmar importação"
          accessibilityState={{ disabled: salvando || totalSelecionadas === 0 }}
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-white text-center font-Inter-SemiBold">
            {salvando ? "Importando..." : `Importar ${totalSelecionadas} ${totalSelecionadas === 1 ? "transação" : "transações"}`}
          </Text>
        </Pressable>
      </View>

      {transacoes.length === 0 ? (
        <View className="items-center py-4 mb-2">
          <Ionicons name="alert-circle-outline" color={colors["error-color"]} size={28} />
          <Text style={{ fontSize: countLabelSize }} className="text-second-text text-center mt-2">
            Nenhuma transação pôde ser identificada neste arquivo.
          </Text>
        </View>
      ) : (
        <>
          <GrupoLinhas
            titulo="Transações"
            icone="list-outline"
            corIcone={colors["second-text"]}
            linhas={linhasNormais}
            alturaMaxima={moderateScale(560)}
            transacoesExcluidas={transacoesExcluidas}
            vinculosPendentes={vinculosPendentes}
            onToggle={onToggleTransacao}
            onAbrirSeletorCategoria={setIndiceEditandoCategoria}
            onAbrirSeletorMeta={setIndiceEditandoMeta}
            onRemoverVinculo={onRemoverVinculoMeta}
          />

          <GrupoLinhas
            titulo="Transações possíveis de ser metas"
            icone="flag-outline"
            corIcone={colors["active-icon"]}
            descricao="Detectamos que podem ser aportes/retiradas de uma meta. Nada é vinculado sozinho — toque em “Vincular a meta” para confirmar."
            linhas={linhasMeta}
            alturaMaxima={moderateScale(280)}
            transacoesExcluidas={transacoesExcluidas}
            vinculosPendentes={vinculosPendentes}
            onToggle={onToggleTransacao}
            onAbrirSeletorCategoria={setIndiceEditandoCategoria}
            onAbrirSeletorMeta={setIndiceEditandoMeta}
            onRemoverVinculo={onRemoverVinculoMeta}
          />
        </>
      )}

      {/* Dropdown de categoria para corrigir uma linha específica —
          "Sem categoria" não é oferecido aqui (ver permitirSemCategoria). */}
      <Modal
        visible={indiceEditandoCategoria !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setIndiceEditandoCategoria(null)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card-background rounded-t-2xl p-5 pb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
                Definir categoria
              </Text>
              <Pressable
                onPress={() => setIndiceEditandoCategoria(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" color={colors["second-text"]} size={22} />
              </Pressable>
            </View>

            <SeletorCategoria
              categoriaSelecionada={
                indiceEditandoCategoria !== null ? transacoes[indiceEditandoCategoria]?.categoriaId ?? null : null
              }
              onSelecionar={handleSelecionarCategoria}
              permitirSemCategoria={false}
            />
          </View>
        </View>
      </Modal>

      {/* Seletor de meta — escolher qual meta a transação será vinculada.
          Valor sempre CHEIO (com sinal pelo tipo); ajuste parcial fica
          para a tela de edição depois de importada. */}
      <ModalCentralizado
        visivel={indiceEditandoMeta !== null}
        onFechar={() => setIndiceEditandoMeta(null)}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
            Vincular à meta
          </Text>
          <Pressable
            onPress={() => setIndiceEditandoMeta(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" color={colors["second-text"]} size={22} />
          </Pressable>
        </View>

        {carregandoMetas ? (
          <View className="items-center py-6">
            <Text style={{ fontSize: countLabelSize }} className="text-desactived-text">
              Carregando metas...
            </Text>
          </View>
        ) : metasDisponiveis.length === 0 ? (
          <View className="items-center py-6">
            <Ionicons name="flag-outline" color={colors["desactived-text"]} size={26} />
            <Text style={{ fontSize: countLabelSize }} className="text-desactived-text text-center mt-2">
              Nenhuma meta em andamento. Crie uma meta primeiro para poder vincular transações a ela.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: moderateScale(300) }} showsVerticalScrollIndicator={false}>
            <View className="gap-2">
              {metasDisponiveis.map((meta) => {
                const icone = obterIconeMeta(meta.icone);
                const percentual = calcularPercentualMeta(meta);
                return (
                  <Pressable
                    key={meta.id}
                    onPress={() => {
                      if (indiceEditandoMeta === null) return;
                      onDefinirVinculoMeta(indiceEditandoMeta, {
                        metaId: meta.id,
                        metaNome: meta.nome,
                        metaIcone: meta.icone,
                        metaCor: icone.cor,
                      });
                      setIndiceEditandoMeta(null);
                    }}
                    className="flex-row items-center gap-3 bg-input-background border border-input-border rounded-xl p-3 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={`${meta.nome}, ${percentual}% concluído`}
                  >
                    <View
                      style={{ backgroundColor: `${icone.cor}22` }}
                      className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                    >
                      <Ionicons name={icone.nome} color={icone.cor} size={18} />
                    </View>
                    <View className="flex-1">
                      <Text style={{ fontSize: metaNomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                        {meta.nome}
                      </Text>
                      <Text style={{ fontSize: metaProgressoSize }} className="text-desactived-text">
                        {FormatToCurrency(meta.progressoAtual)} de {FormatToCurrency(meta.valorMeta)} · {percentual}%
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </ModalCentralizado>
    </View>
  );
}

export const PreviewImportacao = memo(PreviewImportacaoBase);
