import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert, Platform } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Lembrete, CamposLembrete } from "@/database/lembretesQueries";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { SeletorData } from "@/components/common/SeletorData";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

/** "HH:MM" -> Date de hoje com essa hora (só para alimentar o picker). */
function horaParaDate(horaHHMM: string | null): Date {
  const base = new Date();
  if (horaHHMM) {
    const [h, m] = horaHHMM.split(":").map(Number);
    base.setHours(h, m, 0, 0);
  }
  return base;
}

function dateParaHora(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  visivel: boolean;
  lembreteEditando: Lembrete | null;
  onFechar: () => void;
  onSalvar: (id: string | null, campos: CamposLembrete) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
};

function EditarLembreteModalBase({ visivel, lembreteEditando, onFechar, onSalvar, onExcluir }: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataIso, setDataIso] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!visivel) return;

    if (lembreteEditando) {
      setTitulo(lembreteEditando.titulo);
      setDescricao(lembreteEditando.descricao ?? "");
      setDataIso(lembreteEditando.data);
      setHora(lembreteEditando.hora);
    } else {
      setTitulo("");
      setDescricao("");
      setDataIso(null);
      setHora(null);
    }
  }, [visivel, lembreteEditando]);

  const handleHoraChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") setMostrarPickerHora(false);
      if (event.type === "dismissed") return;
      if (date) setHora(dateParaHora(date));
    },
    []
  );

  const formularioValido = titulo.trim().length > 0 && dataIso !== null && hora !== null;
  const ocupado = salvando || excluindo;

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !dataIso || !hora || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(lembreteEditando?.id ?? null, {
        titulo: titulo.trim(),
        descricao: descricao.trim() ? descricao.trim() : null,
        data: dataIso,
        hora,
      });
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar o lembrete. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [formularioValido, dataIso, hora, salvando, titulo, descricao, lembreteEditando, onSalvar, onFechar]);

  const handleExcluir = useCallback(() => {
    if (!lembreteEditando || !onExcluir) return;

    Alert.alert("Excluir lembrete", `Tem certeza que deseja excluir "${lembreteEditando.titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setExcluindo(true);
          try {
            await onExcluir(lembreteEditando.id);
            onFechar();
          } catch {
            Alert.alert("Não foi possível excluir", "Ocorreu um erro ao excluir o lembrete. Tente novamente.");
          } finally {
            setExcluindo(false);
          }
        },
      },
    ]);
  }, [lembreteEditando, onExcluir, onFechar]);

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {lembreteEditando ? "Editar lembrete" : "Novo lembrete"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Título
      </Text>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ex.: Renovar o seguro do carro"
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        autoFocus
        accessibilityLabel="Título do lembrete"
      />

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Descrição (opcional)
      </Text>
      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Detalhes que você quer lembrar"
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"], minHeight: moderateScale(64), textAlignVertical: "top" }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        multiline
        accessibilityLabel="Descrição do lembrete"
      />

      <View className="mb-4">
        <SeletorData label="Data" valorIso={dataIso} onChange={setDataIso} minimoHoje />
      </View>

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Hora
      </Text>
      <Pressable
        onPress={() => setMostrarPickerHora(true)}
        disabled={ocupado}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between active:opacity-70 mb-4"
        accessibilityRole="button"
        accessibilityLabel={`Hora: ${hora ?? "não definida"}`}
      >
        <Text style={{ fontSize: inputTextSize }} className={hora ? "text-main-text" : "text-desactived-text"}>
          {hora ?? "Selecionar hora"}
        </Text>
        <Ionicons name="time-outline" color={colors["active-icon"]} size={18} />
      </Pressable>

      {mostrarPickerHora && (
        <DateTimePicker
          value={horaParaDate(hora)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleHoraChange}
          locale="pt-BR"
        />
      )}

      <View className="flex-row items-start gap-2 bg-active-icon/10 rounded-lg p-2.5 mb-5">
        <Ionicons name="notifications-outline" color={colors["active-icon"]} size={14} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: labelSize }} className="text-second-text flex-1">
          Você receberá uma notificação em {dataIso ? dataIsoParaBR(dataIso) : "--"} às {hora ?? "--"}.
        </Text>
      </View>

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || ocupado}
        className={`w-full py-3.5 rounded-xl items-center justify-center mb-2.5 ${formularioValido && !ocupado ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
        accessibilityRole="button"
        accessibilityLabel="Salvar lembrete"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar"}
        </Text>
      </Pressable>

      {lembreteEditando && onExcluir && (
        <Pressable
          onPress={handleExcluir}
          disabled={ocupado}
          className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Excluir lembrete"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-error-color font-Inter-Medium">
            {excluindo ? "Excluindo..." : "Excluir lembrete"}
          </Text>
        </Pressable>
      )}
    </ModalCentralizado>
  );
}

export const EditarLembreteModal = memo(EditarLembreteModalBase);
