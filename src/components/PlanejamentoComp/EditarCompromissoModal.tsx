import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { Compromisso, CamposCompromisso } from "@/database/compromissosQueries";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { SeletorData } from "@/components/common/SeletorData";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

const ICONES_DISPONIVEIS: { nome: keyof typeof Ionicons.glyphMap; cor: string }[] = [
  { nome: "home-outline", cor: colors["active-icon"] },
  { nome: "water-outline", cor: "#378ADD" },
  { nome: "flash-outline", cor: colors["warn-color"] },
  { nome: "wifi-outline", cor: colors["sucess-color"] },
  { nome: "card-outline", cor: "#E24B4A" },
  { nome: "document-text-outline", cor: colors["desactived-text"] },
];

type Props = {
  visivel: boolean;
  compromissoEditando: Compromisso | null;
  onFechar: () => void;
  onSalvar: (id: string | null, campos: CamposCompromisso) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
};

function EditarCompromissoModalBase({ visivel, compromissoEditando, onFechar, onSalvar, onExcluir }: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [nome, setNome] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [dataVencimentoIso, setDataVencimentoIso] = useState<string | null>(null);
  const [iconeSelecionado, setIconeSelecionado] = useState(ICONES_DISPONIVEIS[0]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!visivel) return;

    if (compromissoEditando) {
      setNome(compromissoEditando.nome);
      setValorTexto(String(Math.round(compromissoEditando.valor * 100)));
      setDataVencimentoIso(compromissoEditando.dataVencimento);
      const icone = ICONES_DISPONIVEIS.find((i) => i.nome === compromissoEditando.icone) ?? ICONES_DISPONIVEIS[0];
      setIconeSelecionado(icone);
    } else {
      setNome("");
      setValorTexto("");
      setDataVencimentoIso(null);
      setIconeSelecionado(ICONES_DISPONIVEIS[0]);
    }
  }, [visivel, compromissoEditando]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const formularioValido = nome.trim().length > 0 && valorNumerico > 0 && dataVencimentoIso !== null;
  const ocupado = salvando || excluindo;

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !dataVencimentoIso || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(compromissoEditando?.id ?? null, {
        nome: nome.trim(),
        valor: valorNumerico,
        dataVencimento: dataVencimentoIso,
        icone: iconeSelecionado.nome,
        cor: iconeSelecionado.cor,
      });
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar o compromisso. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [formularioValido, dataVencimentoIso, salvando, nome, valorNumerico, iconeSelecionado, compromissoEditando, onSalvar, onFechar]);

  const handleExcluir = useCallback(() => {
    if (!compromissoEditando || !onExcluir) return;

    Alert.alert("Excluir compromisso", `Tem certeza que deseja excluir "${compromissoEditando.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setExcluindo(true);
          try {
            await onExcluir(compromissoEditando.id);
            onFechar();
          } catch {
            Alert.alert("Não foi possível excluir", "Ocorreu um erro ao excluir o compromisso. Tente novamente.");
          } finally {
            setExcluindo(false);
          }
        },
      },
    ]);
  }, [compromissoEditando, onExcluir, onFechar]);

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {compromissoEditando ? "Editar compromisso" : "Novo compromisso"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Nome
      </Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Aluguel"
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        autoFocus
        accessibilityLabel="Nome do compromisso"
      />

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Valor
      </Text>
      <TextInput
        value={valorExibicao}
        onChangeText={handleValorChange}
        keyboardType="numeric"
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        accessibilityLabel="Valor do compromisso"
      />

      <View className="mb-4">
        <SeletorData label="Data de vencimento" valorIso={dataVencimentoIso} onChange={setDataVencimentoIso} />
      </View>

      <Text style={{ fontSize: labelSize }} className="text-second-text mb-2">
        Ícone
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {ICONES_DISPONIVEIS.map((icone) => {
          const selecionado = icone.nome === iconeSelecionado.nome;
          return (
            <Pressable
              key={icone.nome}
              onPress={() => setIconeSelecionado(icone)}
              disabled={ocupado}
              style={{ backgroundColor: selecionado ? `${icone.cor}30` : colors["input-background"] }}
              className={`w-12 h-12 rounded-2xl items-center justify-center border ${selecionado ? "border-2" : "border-input-border"}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selecionado }}
            >
              <Ionicons name={icone.nome} color={icone.cor} size={20} />
            </Pressable>
          );
        })}
      </View>

      <View className="bg-input-background border border-lines-divisions rounded-xl p-3 flex-row items-center gap-3 mb-2">
        <View
          style={{ backgroundColor: `${iconeSelecionado.cor}22` }}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <Ionicons name={iconeSelecionado.nome} color={iconeSelecionado.cor} size={18} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {nome || "Nome do compromisso"}
          </Text>
          <Text style={{ fontSize: labelSize }} className="text-desactived-text">
            {valorExibicao} · {dataVencimentoIso ? dataIsoParaBR(dataVencimentoIso) : "--"}
          </Text>
        </View>
      </View>

      {/* Aviso de notificação — mantido do fluxo anterior, agora sem
          etapa própria, direto na única tela. */}
      <View className="flex-row items-start gap-2 bg-active-icon/10 rounded-lg p-2.5 mb-5">
        <Ionicons name="notifications-outline" color={colors["active-icon"]} size={14} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: labelSize }} className="text-second-text flex-1">
          Você receberá uma notificação no dia do vencimento, às 9h.
        </Text>
      </View>

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || ocupado}
        className={`w-full py-3.5 rounded-xl items-center justify-center mb-2.5 ${formularioValido && !ocupado ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
        accessibilityRole="button"
        accessibilityLabel="Salvar compromisso"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar"}
        </Text>
      </Pressable>

      {compromissoEditando && onExcluir && (
        <Pressable
          onPress={handleExcluir}
          disabled={ocupado}
          className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Excluir compromisso"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-error-color font-Inter-Medium">
            {excluindo ? "Excluindo..." : "Excluir compromisso"}
          </Text>
        </Pressable>
      )}
    </ModalCentralizado>
  );
}

export const EditarCompromissoModal = memo(EditarCompromissoModalBase);