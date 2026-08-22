import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { EventoAgenda } from "@/database/agendaQueries";

const NOMES_MES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function calcularDiasRestantes(dataIso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return Math.round((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function rotuloPrazo(diasRestantes: number): string {
  if (diasRestantes === 0) return "Hoje";
  if (diasRestantes === 1) return "Amanhã";
  return `Em ${diasRestantes} dias`;
}

const ProximoEventoItem = memo(function ProximoEventoItem({ evento }: { evento: EventoAgenda }) {
  const diaSize = moderateScale(18);
  const mesSize = moderateScale(10);
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(11);
  const valorSize = moderateScale(13);
  const prazoSize = moderateScale(10);

  const [, mes, dia] = evento.data.split("-").map(Number);
  const diasRestantes = calcularDiasRestantes(evento.data);

  return (
    <Pressable
      className="flex-row items-center gap-3 py-3 border-b border-lines-divisions active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${evento.titulo}, ${rotuloPrazo(diasRestantes)}`}
    >
      <View className="items-center w-10 flex-shrink-0">
        <Text style={{ fontSize: diaSize }} className="text-main-text font-Inter-SemiBold">
          {dia}
        </Text>
        <Text style={{ fontSize: mesSize }} className="text-active-icon font-Inter-Medium">
          {NOMES_MES_ABREV[mes - 1]}
        </Text>
      </View>

      <View className="flex-1">
        <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
          {evento.titulo}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
          {evento.subtitulo}
        </Text>
      </View>

      <View className="items-end flex-shrink-0">
        {evento.valor !== null && (
          <Text
            style={{ fontSize: valorSize }}
            className={evento.positivo ? "text-sucess-color font-Inter-SemiBold" : "text-main-text font-Inter-SemiBold"}
            numberOfLines={1}
          >
            {FormatToCurrency(evento.valor)}
          </Text>
        )}
        <Text style={{ fontSize: prazoSize }} className="text-active-icon font-Inter-Medium mt-0.5">
          {rotuloPrazo(diasRestantes)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
    </Pressable>
  );
});

type Props = {
  eventos: EventoAgenda[];
  onVerTodos?: () => void;
};

function ProximosEventosBase({ eventos, onVerTodos }: Props) {
  const cardTitleSize = moderateScale(15);
  const actionTextSize = moderateScale(12);
  const emptyTextSize = moderateScale(12);

  // Só os não concluídos (compromissos já pagos ou metas já atingidas
  // não fazem sentido em "próximos eventos"), limitado a 5 para não
  // virar uma lista infinita dentro do scroll da Agenda.
  const proximos = eventos.filter((e) => !e.concluido).slice(0, 5);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Próximos eventos
        </Text>
        {onVerTodos && (
          <Pressable onPress={onVerTodos} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ver todos os eventos">
            <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
              Ver todos
            </Text>
          </Pressable>
        )}
      </View>

      {proximos.length === 0 ? (
        <View className="items-center py-6">
          <Ionicons name="checkmark-done-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: emptyTextSize }} className="text-desactived-text text-center mt-2">
            Nenhum evento futuro por enquanto.
          </Text>
        </View>
      ) : (
        <View>
          {proximos.map((evento, index) => (
            <View key={evento.id} className={index === proximos.length - 1 ? "border-b-0" : ""}>
              <ProximoEventoItem evento={evento} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const ProximosEventos = memo(ProximosEventosBase);