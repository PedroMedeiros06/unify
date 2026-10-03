import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, FlatList } from "react-native";
import { memo, useEffect, useState } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { NotificacaoHistorico } from "@/database/notificacoesHistoricoQueries";
import { CompromissosSkeleton } from "@/components/common/CompromissosSkeleton";

/**
 * Tela "Notificações" — histórico das notificações locais que o app
 * agendou (lembretes e vencimentos de compromisso). É uma tela sem
 * footer, acessada pelo sino do header da Home.
 *
 * Uma linha é gravada quando a notificação é AGENDADA; aqui, tudo que
 * já passou de `disparaEm` é tratado como "recebido". Ao abrir a tela,
 * todas as recebidas não-lidas viram lidas (zera o badge do sino).
 * Itens agendados para o futuro aparecem com rótulo próprio e não
 * contam como não-lidos.
 */

function iconePorOrigem(origem: NotificacaoHistorico["origem"]): keyof typeof Ionicons.glyphMap {
  switch (origem) {
    case "compromisso":
      return "calendar-outline";
    case "orcamento":
      return "pie-chart-outline";
    case "meta":
      return "trophy-outline";
    case "relatorio":
      return "bar-chart-outline";
    default:
      return "alarm-outline";
  }
}

/** "aaaa-mm-ddTHH:MM:SS" (horário local) -> Date. */
function parsearDisparaEm(iso: string): Date {
  const [dataParte, horaParte = "00:00:00"] = iso.split("T");
  const [ano, mes, dia] = dataParte.split("-").map(Number);
  const [hora, minuto, segundo] = horaParte.split(":").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1, hora ?? 0, minuto ?? 0, segundo ?? 0);
}

/** true se a notificação ainda vai disparar (agendada para o futuro). */
function estaAgendadaParaFuturo(item: NotificacaoHistorico, agora: number): boolean {
  return parsearDisparaEm(item.disparaEm).getTime() > agora;
}

function rotuloTempo(item: NotificacaoHistorico, agora: number): string {
  const quando = parsearDisparaEm(item.disparaEm);
  const diffMs = quando.getTime() - agora;

  // Ainda vai disparar.
  if (diffMs > 0) {
    const dias = Math.ceil(diffMs / 86_400_000);
    const dataFmt = item.disparaEm.split("T")[0].split("-").reverse().join("/");
    const horaFmt = item.disparaEm.split("T")[1]?.slice(0, 5) ?? "";
    if (dias <= 1) return `Agendada para ${dataFmt} às ${horaFmt}`;
    return `Agendada para daqui a ${dias} dias`;
  }

  // Já disparou.
  const passadoMs = -diffMs;
  const minutos = Math.floor(passadoMs / 60_000);
  if (minutos < 1) return "Agora mesmo";
  if (minutos < 60) return `Há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "Há 1 hora" : `Há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return dias === 1 ? "Ontem" : `Há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "Há 1 mês" : `Há ${meses} meses`;
}

const NotificacaoItem = memo(function NotificacaoItem({
  item,
  agora,
}: {
  item: NotificacaoHistorico;
  // Timestamp de referência calculado uma vez pela tela (no mount) —
  // passado para baixo para não chamar Date.now() durante o render de
  // cada linha (proibido pelo React Compiler / regra de pureza).
  agora: number;
}) {
  const tituloSize = moderateScale(13);
  const corpoSize = moderateScale(11);
  const metaSize = moderateScale(10);

  const agendadaFutura = estaAgendadaParaFuturo(item, agora);

  return (
    <View
      className={`flex-row items-start gap-3 border rounded-xl p-3 ${
        item.lida || agendadaFutura
          ? "border-lines-divisions bg-input-background"
          : "border-active-icon/40 bg-active-icon/5"
      }`}
    >
      <View
        style={{ backgroundColor: `${colors["active-icon"]}22` }}
        className="w-9 h-9 rounded-full items-center justify-center shrink-0"
      >
        <Ionicons name={iconePorOrigem(item.origem)} color={colors["active-icon"]} size={16} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            style={{ fontSize: tituloSize }}
            className="text-main-text font-Inter-Medium flex-1"
            numberOfLines={1}
          >
            {item.titulo}
          </Text>
          {!item.lida && !agendadaFutura && (
            <View className="w-2 h-2 rounded-full bg-active-icon shrink-0" />
          )}
        </View>
        <Text style={{ fontSize: corpoSize }} className="text-second-text mt-0.5" numberOfLines={2}>
          {item.corpo}
        </Text>
        <Text style={{ fontSize: metaSize }} className="text-desactived-text mt-1">
          {rotuloTempo(item, agora)}
        </Text>
      </View>
    </View>
  );
});

export function Notificacoes() {
  const { goBack } = useNavigation();
  const { historico, carregando, marcarTodasLidas } = useNotificacoes();

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  // Referência de "agora" fixada no mount da tela — usada por todas as
  // linhas para decidir recebida vs. agendada e formatar "há X". Não
  // precisa ser reativa: a tela é curta e some ao voltar.
  const [agora] = useState(() => Date.now());

  // Abrir a tela = ler tudo que já chegou. Roda uma vez, no mount.
  useEffect(() => {
    void marcarTodasLidas();
  }, [marcarTodasLidas]);

  return (
    <View className="flex-1">
      {/* HEADER */}
      <View className="w-full flex-row items-center gap-3 mb-4">
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
            Notificações
          </Text>
          <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
            Lembretes e vencimentos que o Unify avisou.
          </Text>
        </View>
      </View>

      {carregando ? (
        <CompromissosSkeleton />
      ) : historico.length === 0 ? (
        <View className="bg-card-background border border-lines-divisions rounded-xl items-center py-10 px-4">
          <Ionicons name="notifications-off-outline" color={colors["desactived-text"]} size={28} />
          <Text style={{ fontSize: moderateScale(12) }} className="text-desactived-text text-center mt-2">
            Nenhuma notificação ainda. Quando você criar um lembrete ou um compromisso com
            vencimento futuro, o aviso agendado aparece aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={historico}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificacaoItem item={item} agora={agora} />}
          ItemSeparatorComponent={Separador}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

function Separador() {
  return <View style={{ height: 8 }} />;
}
