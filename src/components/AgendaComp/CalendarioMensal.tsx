import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo, useMemo } from "react";
import { EventoAgenda, TipoEventoAgenda } from "@/database/agendaQueries";
import { SeletorMesAno } from "@/components/common/SeletorMesAno";

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// Cor do pontinho por tipo de evento — mesma paleta da legenda.
const COR_POR_TIPO: Record<TipoEventoAgenda, string> = {
  compromisso: colors["active-icon"],
  meta: colors["sucess-color"],
  investimento: colors["warn-color"],
  lembrete: colors["error-color"],
  recorrencia: colors["desactived-text"],
};

type DiaCelula = {
  dataIso: string;
  numero: number;
  dentroDoMes: boolean;
};

function paraIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Monta a grade de 6 semanas (42 células) para o mês informado, incluindo os dias de preenchimento do mês anterior/seguinte. */
function montarGrade(ano: number, mes: number): DiaCelula[] {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();

  const celulas: DiaCelula[] = [];

  for (let i = 0; i < primeiroDiaSemana; i++) {
    const dia = totalDiasMesAnterior - primeiroDiaSemana + i + 1;
    const mesAnterior = mes === 0 ? 11 : mes - 1;
    const anoAnterior = mes === 0 ? ano - 1 : ano;
    celulas.push({ dataIso: paraIso(anoAnterior, mesAnterior, dia), numero: dia, dentroDoMes: false });
  }

  for (let dia = 1; dia <= totalDiasNoMes; dia++) {
    celulas.push({ dataIso: paraIso(ano, mes, dia), numero: dia, dentroDoMes: true });
  }

  const restante = 42 - celulas.length;
  for (let dia = 1; dia <= restante; dia++) {
    const mesSeguinte = mes === 11 ? 0 : mes + 1;
    const anoSeguinte = mes === 11 ? ano + 1 : ano;
    celulas.push({ dataIso: paraIso(anoSeguinte, mesSeguinte, dia), numero: dia, dentroDoMes: false });
  }

  return celulas;
}

type Props = {
  anoExibido: number;
  mesExibido: number; // 0-11
  dataSelecionadaIso: string;
  hojeIso: string;
  eventosPorDia: Map<string, EventoAgenda[]>;
  onSelecionarDia: (dataIso: string) => void;
  onMudarMes: (deltaMeses: number) => void;
  onSelecionarMesAno: (ano: number, mes: number) => void;
  onIrParaHoje: () => void;
};

function CalendarioMensalBase({
  anoExibido,
  mesExibido,
  dataSelecionadaIso,
  hojeIso,
  eventosPorDia,
  onSelecionarDia,
  onMudarMes,
  onSelecionarMesAno,
  onIrParaHoje,
}: Props) {
  const diaSemanaSize = moderateScale(10);
  const diaNumeroSize = moderateScale(15);
  const hojeButtonSize = moderateScale(12);

  const grade = useMemo(() => montarGrade(anoExibido, mesExibido), [anoExibido, mesExibido]);
  const semanas = useMemo(() => {
    const resultado: DiaCelula[][] = [];
    for (let i = 0; i < grade.length; i += 7) {
      resultado.push(grade.slice(i, i + 7));
    }
    return resultado;
  }, [grade]);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      {/* Cabeçalho: seletor de mês/ano + navegação */}
      <View className="flex-row justify-between items-center mb-4">
        <SeletorMesAno ano={anoExibido} mes={mesExibido} onSelecionar={onSelecionarMesAno} alinhamento="esquerda" />

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onIrParaHoje}
            className="px-2.5 py-1.5 rounded-lg border border-input-border active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Ir para hoje"
          >
            <Text style={{ fontSize: hojeButtonSize }} className="text-main-text font-Inter-Medium">
              Hoje
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onMudarMes(-1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
          >
            <Ionicons name="chevron-back" color={colors["active-icon"]} size={20} />
          </Pressable>
          <Pressable
            onPress={() => onMudarMes(1)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
          >
            <Ionicons name="chevron-forward" color={colors["active-icon"]} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Cabeçalho dos dias da semana */}
      <View className="flex-row mb-2">
        {DIAS_SEMANA.map((dia) => (
          <View key={dia} className="flex-1 items-center">
            <Text style={{ fontSize: diaSemanaSize }} className="text-desactived-text font-Inter-Medium">
              {dia}
            </Text>
          </View>
        ))}
      </View>

      {/* Grade de dias */}
      <View className="gap-1">
        {semanas.map((semana, indiceSemana) => (
          <View key={indiceSemana} className="flex-row">
            {semana.map((celula) => {
              const selecionado = celula.dataIso === dataSelecionadaIso;
              const ehHoje = celula.dataIso === hojeIso;
              const eventosDoDia = eventosPorDia.get(celula.dataIso) ?? [];
              // No máximo 3 pontinhos visíveis — evita quebrar o layout
              // em dias com muitos eventos ao mesmo tempo.
              const tiposUnicos = Array.from(new Set(eventosDoDia.map((e) => e.tipo))).slice(0, 3);

              return (
                <Pressable
                  key={celula.dataIso}
                  onPress={() => onSelecionarDia(celula.dataIso)}
                  className="flex-1 items-center py-1.5"
                  accessibilityRole="button"
                  accessibilityState={{ selected: selecionado }}
                  accessibilityLabel={`Dia ${celula.numero}${eventosDoDia.length > 0 ? `, ${eventosDoDia.length} evento(s)` : ""}`}
                >
                  <View
                    style={selecionado ? { backgroundColor: colors["active-icon"] } : undefined}
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      !selecionado && ehHoje ? "border border-active-icon" : ""
                    }`}
                  >
                    <Text
                      style={{ fontSize: diaNumeroSize }}
                      className={
                        selecionado
                          ? "text-white font-Inter-SemiBold"
                          : !celula.dentroDoMes
                            ? "text-desactived-text/50"
                            : ehHoje
                              ? "text-active-icon font-Inter-Medium"
                              : "text-main-text"
                      }
                    >
                      {celula.numero}
                    </Text>
                  </View>

                  <View className="flex-row gap-0.5 mt-1 h-1.5">
                    {tiposUnicos.map((tipo) => (
                      <View
                        key={tipo}
                        style={{ backgroundColor: COR_POR_TIPO[tipo] }}
                        className="w-1 h-1 rounded-full"
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legenda */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-lines-divisions">
        <LegendaItem cor={COR_POR_TIPO.compromisso} rotulo="Compromissos e boletos" />
        <LegendaItem cor={COR_POR_TIPO.meta} rotulo="Metas" />
        <LegendaItem cor={COR_POR_TIPO.recorrencia} rotulo="Recorrências previstas" />
        <LegendaItem cor={COR_POR_TIPO.investimento} rotulo="Investimentos" />
        <LegendaItem cor={COR_POR_TIPO.lembrete} rotulo="Lembretes" />
      </View>
    </View>
  );
}

const LegendaItem = memo(function LegendaItem({ cor, rotulo }: { cor: string; rotulo: string }) {
  const textoSize = moderateScale(11);
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: cor }} className="w-2 h-2 rounded-full" />
      <Text style={{ fontSize: textoSize }} className="text-second-text">
        {rotulo}
      </Text>
    </View>
  );
});

export const CalendarioMensal = memo(CalendarioMensalBase);