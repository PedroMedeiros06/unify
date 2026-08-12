import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Platform } from "react-native";
import { memo, useCallback, useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

type Props = {
  label: string;
  valorIso: string | null;
  onChange: (dataIso: string) => void;
  minimoHoje?: boolean;
};

function dataIsoParaDate(dataIso: string | null): Date {
  if (!dataIso) return new Date();
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function dateParaIso(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarExibicao(dataIso: string | null): string {
  if (!dataIso) return "Selecionar data";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function SeletorDataBase({ label, valorIso, onChange, minimoHoje }: Props) {
  const labelSize = moderateScale(11);
  const valueSize = moderateScale(14);

  const [mostrarPicker, setMostrarPicker] = useState(false);

  const handleAbrir = useCallback(() => {
    setMostrarPicker(true);
  }, []);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        setMostrarPicker(false);
      }

      if (event.type === "dismissed") return;
      if (date) onChange(dateParaIso(date));
    },
    [onChange]
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <View>
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>

      <Pressable
        onPress={handleAbrir}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatarExibicao(valorIso)}`}
      >
        <Text style={{ fontSize: valueSize }} className={valorIso ? "text-main-text" : "text-desactived-text"}>
          {formatarExibicao(valorIso)}
        </Text>
        <Ionicons name="calendar-outline" color={colors["active-icon"]} size={18} />
      </Pressable>

      {mostrarPicker && (
        <DateTimePicker
          value={dataIsoParaDate(valorIso)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleChange}
          minimumDate={minimoHoje ? hoje : undefined}
          locale="pt-BR"
        />
      )}
    </View>
  );
}

export const SeletorData = memo(SeletorDataBase);
