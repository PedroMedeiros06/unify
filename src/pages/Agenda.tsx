import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { useNavigation } from "@/context/NavigationContext";
import { CalendarioMensal } from "@/components/AgendaComp/CalendarioMensal";
import { EventosDoDia } from "@/components/AgendaComp/EventosDoDia";
import { ProximosEventos } from "@/components/AgendaComp/ProximosEventos";
import { listarEventosAgenda, agruparEventosPorDia, EventoAgenda } from "@/database/agendaQueries";
import { dataHojeIso } from "@/utils/dateUtils";

function paraIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Primeiro e último dia do mês (ISO), usado para buscar todos os eventos do mês exibido de uma vez. */
function limitesDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return { inicio: paraIso(ano, mes, 1), fim: paraIso(ano, mes, ultimoDia) };
}

export function Agenda() {
  const { goBack } = useNavigation();

  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);

  const hojeIso = useMemo(() => dataHojeIso(), []);
  const [ano, mes] = hojeIso.split("-").map(Number);

  const [anoExibido, setAnoExibido] = useState(ano);
  const [mesExibido, setMesExibido] = useState(mes - 1); // 0-11
  const [dataSelecionadaIso, setDataSelecionadaIso] = useState(hojeIso);

  const [eventosDoMes, setEventosDoMes] = useState<EventoAgenda[]>([]);
  const [carregandoMes, setCarregandoMes] = useState(true);

  // Próximos eventos olham um horizonte de 90 dias a partir do DIA
  // SELECIONADO no calendário — "o que vem a partir daqui". Trocar o dia
  // selecionado recarrega essa lista e recalcula os prazos.
  const [eventosFuturos, setEventosFuturos] = useState<EventoAgenda[]>([]);

  const carregarEventosDoMes = useCallback(async (anoAlvo: number, mesAlvo: number) => {
    setCarregandoMes(true);
    try {
      const { inicio, fim } = limitesDoMes(anoAlvo, mesAlvo);
      const eventos = await listarEventosAgenda(inicio, fim);
      setEventosDoMes(eventos);
    } finally {
      setCarregandoMes(false);
    }
  }, []);

  useEffect(() => {
    carregarEventosDoMes(anoExibido, mesExibido);
  }, [anoExibido, mesExibido, carregarEventosDoMes]);

  useEffect(() => {
    let ativo = true;

    async function carregarFuturos() {
      const [ano, mes, dia] = dataSelecionadaIso.split("-").map(Number);
      const daqui90Dias = new Date(ano, mes - 1, dia);
      daqui90Dias.setDate(daqui90Dias.getDate() + 90);
      const fimIso = paraIso(daqui90Dias.getFullYear(), daqui90Dias.getMonth(), daqui90Dias.getDate());

      const eventos = await listarEventosAgenda(dataSelecionadaIso, fimIso);
      if (ativo) setEventosFuturos(eventos);
    }

    carregarFuturos();

    return () => {
      ativo = false;
    };
  }, [dataSelecionadaIso]);

  const eventosPorDia = useMemo(() => agruparEventosPorDia(eventosDoMes), [eventosDoMes]);
  const eventosDoDiaSelecionado = eventosPorDia.get(dataSelecionadaIso) ?? [];

  const handleMudarMes = useCallback((deltaMeses: number) => {
    setMesExibido((mesAtual) => {
      let novoMes = mesAtual + deltaMeses;
      let novoAno = anoExibido;

      if (novoMes < 0) {
        novoMes = 11;
        novoAno -= 1;
      } else if (novoMes > 11) {
        novoMes = 0;
        novoAno += 1;
      }

      setAnoExibido(novoAno);
      return novoMes;
    });
  }, [anoExibido]);

  // Seleção direta via SeletorMesAno (grid de 12 meses) — diferente de
  // handleMudarMes, que só desloca +/- 1 mês a partir do atual.
  const handleSelecionarMesAno = useCallback((anoAlvo: number, mesAlvo: number) => {
    setAnoExibido(anoAlvo);
    setMesExibido(mesAlvo);
  }, []);

  const handleIrParaHoje = useCallback(() => {
    setAnoExibido(ano);
    setMesExibido(mes - 1);
    setDataSelecionadaIso(hojeIso);
  }, [ano, mes, hojeIso]);

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
              Agenda
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Compromissos, boletos e prazos de metas em um só lugar.
            </Text>
          </View>
        </View>

        <CalendarioMensal
          anoExibido={anoExibido}
          mesExibido={mesExibido}
          dataSelecionadaIso={dataSelecionadaIso}
          hojeIso={hojeIso}
          eventosPorDia={eventosPorDia}
          onSelecionarDia={setDataSelecionadaIso}
          onMudarMes={handleMudarMes}
          onSelecionarMesAno={handleSelecionarMesAno}
          onIrParaHoje={handleIrParaHoje}
        />

        <EventosDoDia
          dataIso={dataSelecionadaIso}
          eventos={eventosDoDiaSelecionado}
          carregando={carregandoMes}
        />

        <ProximosEventos eventos={eventosFuturos} dataReferenciaIso={dataSelecionadaIso} />
      </View>
    </ScrollView>
  );
}