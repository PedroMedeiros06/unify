import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { memo } from "react";
import { EventoAgenda } from "@/database/agendaQueries";

function formatarDataExtenso(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });
  const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  const mesNome = data.toLocaleDateString("pt-BR", { month: "long" });
  return `${diaSemanaCapitalizado}, ${dia} de ${mesNome}`;
}

const EventoItem = memo(function EventoItem({ evento }: { evento: EventoAgenda }) {
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(11);
  const valorSize = moderateScale(13);

  return (
    <View
      style={{ borderLeftColor: evento.cor }}
      className="flex-row items-center gap-3 bg-input-background border-l-4 border border-lines-divisions rounded-lg p-3"
    >
      <View style={{ backgroundColor: `${evento.cor}22` }} className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0">
        <Ionicons name={evento.icone as keyof typeof Ionicons.glyphMap} color={evento.cor} size={16} />
      </View>

      <View className="flex-1">
        <Text
          style={{ fontSize: tituloSize }}
          className={evento.concluido ? "text-desactived-text font-Inter-Medium line-through" : "text-main-text font-Inter-Medium"}
          numberOfLines={1}
        >
          {evento.titulo}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
          {evento.subtitulo}
        </Text>
      </View>

      {evento.valor !== null && (
        <Text
          style={{ fontSize: valorSize }}
          className={evento.positivo ? "text-sucess-color font-Inter-SemiBold" : "text-error-color font-Inter-SemiBold"}
          numberOfLines={1}
        >
          {evento.positivo ? "+ " : "- "}
          {FormatToCurrency(evento.valor)}
        </Text>
      )}
    </View>
  );
});

type Props = {
  dataIso: string;
  eventos: EventoAgenda[];
  carregando: boolean;
};

function EventosDoDiaBase({ dataIso, eventos, carregando }: Props) {
  const cardTitleSize = moderateScale(15);
  const dataSize = moderateScale(12);
  const emptyTextSize = moderateScale(12);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Eventos do dia
        </Text>
        <Text style={{ fontSize: dataSize }} className="text-active-icon font-Inter-Medium">
          {formatarDataExtenso(dataIso)}
        </Text>
      </View>

      {carregando ? (
        <View className="items-center py-6">
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text">
            Carregando...
          </Text>
        </View>
      ) : eventos.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="calendar-clear-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center mt-2">
            Nenhum evento neste dia.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {eventos.map((evento) => (
            <EventoItem key={evento.id} evento={evento} />
          ))}
        </View>
      )}
    </View>
  );
}

export const EventosDoDia = memo(EventosDoDiaBase);