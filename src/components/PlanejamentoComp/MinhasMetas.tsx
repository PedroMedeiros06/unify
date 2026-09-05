import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { memo, useCallback, useMemo, useState } from "react";
import { useMetas } from "@/context/MetasContext";
import { useNavigation } from "@/context/NavigationContext";
import { Meta, CamposMeta, calcularPercentualMeta, metaEstaConcluida } from "@/database/metasQueries";
import { obterIconeMeta } from "@/database/iconesMeta";
import { EditarMetaModal } from "@/components/PlanejamentoComp/EditarMetaModal";
import { MetasSkeleton } from "@/components/common/MetasSkeleton";

// Anel de progresso desenhado em volta do ícone da meta. O traço
// começa no topo (rotação -90°) e avança no sentido horário.
const AnelProgressoIcone = memo(function AnelProgressoIcone({
  percentual,
  cor,
  icone,
}: {
  percentual: number;
  cor: string;
  icone: keyof typeof Ionicons.glyphMap;
}) {
  const tamanho = moderateScale(58);
  const espessura = moderateScale(4);
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const fracao = Math.min(100, Math.max(0, percentual)) / 100;
  const centro = tamanho / 2;

  return (
    <View style={{ width: tamanho, height: tamanho }} className="items-center justify-center flex-shrink-0">
      <Svg width={tamanho} height={tamanho} style={{ position: "absolute" }}>
        <Circle cx={centro} cy={centro} r={raio} stroke={colors["lines-divisions"]} strokeWidth={espessura} fill="none" />
        <Circle
          cx={centro}
          cy={centro}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - fracao)}
          transform={`rotate(-90 ${centro} ${centro})`}
        />
      </Svg>
      <View
        style={{ backgroundColor: `${cor}22`, width: tamanho - espessura * 3, height: tamanho - espessura * 3 }}
        className="rounded-full items-center justify-center"
      >
        <Ionicons name={icone} color={cor} size={moderateScale(22)} />
      </View>
    </View>
  );
});

const MetaCard = memo(function MetaCard({ meta, onLongPress }: { meta: Meta; onLongPress: (meta: Meta) => void }) {
  const nomeSize = moderateScale(15);
  const percentualSize = moderateScale(11);
  const valorSize = moderateScale(15);
  const totalSize = moderateScale(12);
  const faltamSize = moderateScale(11);

  const icone = obterIconeMeta(meta.icone);
  const percentual = calcularPercentualMeta(meta);
  const faltam = Math.max(0, meta.valorMeta - meta.progressoAtual);

  return (
    <Pressable
      onLongPress={() => onLongPress(meta)}
      delayLongPress={350}
      className="bg-card-background border border-lines-divisions rounded-xl p-4 flex-row items-center gap-3.5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${meta.nome}, ${percentual}% concluído. Toque e segure para editar.`}
    >
      <AnelProgressoIcone percentual={percentual} cor={icone.cor} icone={icone.nome} />

      <View className="flex-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text style={{ fontSize: nomeSize }} className="text-main-text font-Inter-SemiBold flex-1" numberOfLines={1}>
            {meta.nome}
          </Text>
          <Text style={{ fontSize: percentualSize }} className="text-active-icon font-Inter-Medium flex-shrink-0">
            {percentual}%
          </Text>
        </View>

        <View className="flex-row items-baseline gap-1 mt-1.5">
          <Text style={{ fontSize: valorSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
            {FormatToCurrency(meta.progressoAtual)}
          </Text>
          <Text style={{ fontSize: totalSize }} className="text-desactived-text" numberOfLines={1}>
            de {FormatToCurrency(meta.valorMeta)}
          </Text>
        </View>

        <Text style={{ fontSize: faltamSize }} className="text-desactived-text mt-0.5">
          Faltam {FormatToCurrency(faltam)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" color={colors["second-text"]} size={18} />
    </Pressable>
  );
});

const CardEstatistica = memo(function CardEstatistica({
  icone,
  corIcone,
  titulo,
  valor,
  subtitulo,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  corIcone: string;
  titulo: string;
  valor: string;
  subtitulo: string;
}) {
  const tituloSize = moderateScale(11);
  const valorSize = moderateScale(17);
  const subtituloSize = moderateScale(10);

  return (
    <View className="flex-1 bg-card-background border border-lines-divisions rounded-xl p-3 min-w-[47%]">
      <View style={{ backgroundColor: `${corIcone}22` }} className="w-8 h-8 rounded-full items-center justify-center mb-2">
        <Ionicons name={icone} color={corIcone} size={16} />
      </View>
      <Text style={{ fontSize: tituloSize }} className="text-second-text mb-1" numberOfLines={1}>
        {titulo}
      </Text>
      <Text style={{ fontSize: valorSize }} className="text-main-text font-Inter-SemiBold mb-0.5" numberOfLines={1}>
        {valor}
      </Text>
      <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
        {subtitulo}
      </Text>
    </View>
  );
});

function MinhasMetasBase() {
  const sectionTitleSize = moderateScale(17);
  const actionTextSize = moderateScale(12);
  const emptyTitleSize = moderateScale(13);
  const ctaTitleSize = moderateScale(14);
  const ctaSubtitleSize = moderateScale(11);
  const dicaTitleSize = moderateScale(13);
  const dicaTextoSize = moderateScale(11);

  const { metas, carregando, adicionarMeta, editarMeta, removerMeta } = useMetas();
  const { navigate } = useNavigation();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [metaEditando, setMetaEditando] = useState<Meta | null>(null);

  // Só as metas em andamento aqui — concluídas ficam numa tela separada
  // (ver "Ver concluídas"), ordenadas da maior para a menor % de
  // progresso, conforme pedido.
  const metasEmAndamento = useMemo(
    () =>
      metas
        .filter((m) => !metaEstaConcluida(m))
        .sort((a, b) => calcularPercentualMeta(b) - calcularPercentualMeta(a)),
    [metas]
  );

  const totalMetas = metasEmAndamento.length;
  const totalGuardado = useMemo(() => metas.reduce((acc, m) => acc + m.progressoAtual, 0), [metas]);
  const totalObjetivo = useMemo(() => metas.reduce((acc, m) => acc + m.valorMeta, 0), [metas]);
  const progressoGeral = totalObjetivo > 0 ? Math.round((totalGuardado / totalObjetivo) * 100) : 0;

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

  const handleVerConcluidas = useCallback(() => {
    navigate("metasConcluidas");
  }, [navigate]);

  if (carregando) {
    return <MetasSkeleton />;
  }

  return (
    <View className="flex-col gap-4">
      {/* CABEÇALHO DO CARD + ESTATÍSTICAS */}
      <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
        <View className="flex-row justify-between items-center mb-3.5">
          <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-SemiBold">
            Minhas metas
          </Text>
          <Pressable
            onPress={handleVerConcluidas}
            className="flex-row items-center gap-1 active:opacity-60"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ver metas concluídas"
          >
            <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
              Ver concluídas
            </Text>
            <Ionicons name="chevron-forward" color={colors["active-icon"]} size={13} />
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <CardEstatistica
            icone="flag-outline"
            corIcone={colors["active-icon"]}
            titulo="Total de metas"
            valor={String(totalMetas)}
            subtitulo="Em andamento"
          />
          <CardEstatistica
            icone="wallet-outline"
            corIcone={colors["sucess-color"]}
            titulo="Total guardado"
            valor={FormatToCurrency(totalGuardado)}
            subtitulo={`de ${FormatToCurrency(totalObjetivo)}`}
          />
          <CardEstatistica
            icone="stats-chart-outline"
            corIcone="#378ADD"
            titulo="Progresso geral"
            valor={`${progressoGeral}%`}
            subtitulo="das metas ativas"
          />
        </View>
      </View>

      {/* LISTA */}
      {metasEmAndamento.length === 0 ? (
        <View className="bg-card-background border border-lines-divisions rounded-xl items-center py-10">
          <Ionicons name="flag-outline" color={colors["desactived-text"]} size={28} />
          <Text style={{ fontSize: emptyTitleSize }} className="text-desactived-text text-center mt-2">
            Nenhuma meta em andamento. Toque em “Criar nova meta” para começar.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {metasEmAndamento.map((meta) => (
            <MetaCard key={meta.id} meta={meta} onLongPress={handleLongPress} />
          ))}
        </View>
      )}

      {/* CTA CRIAR NOVA META */}
      <Pressable
        onPress={handleAbrirNova}
        className="border border-dashed border-input-border rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Criar nova meta"
      >
        <View className="w-10 h-10 rounded-full bg-input-background items-center justify-center">
          <Ionicons name="add" color={colors["active-icon"]} size={20} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: ctaTitleSize }} className="text-active-icon font-Inter-Medium">
            Criar nova meta
          </Text>
          <Text style={{ fontSize: ctaSubtitleSize }} className="text-desactived-text">
            Defina um objetivo e comece a planejar seu futuro.
          </Text>
        </View>
      </Pressable>

      {/* DICAS */}
      <View className="bg-active-icon/10 border border-active-icon/30 rounded-xl p-4 flex-row items-center gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Ionicons name="sparkles-outline" color={colors["active-icon"]} size={14} />
            <Text style={{ fontSize: dicaTitleSize }} className="text-active-icon font-Inter-Medium">
              Dicas para alcançar suas metas
            </Text>
          </View>
          <Text style={{ fontSize: dicaTextoSize }} className="text-second-text">
            Divida metas grandes em pequenas etapas. Assim, você mantém a motivação e vê o progresso todos os dias!
          </Text>
        </View>
      </View>

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

export const MinhasMetas = memo(MinhasMetasBase);