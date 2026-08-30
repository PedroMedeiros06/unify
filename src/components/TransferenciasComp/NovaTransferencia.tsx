import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useState } from "react";
import { useTransacoes } from "@/context/TransacoesContext";

// Conta de origem fixa por enquanto — no futuro viria de uma lista real de contas conectadas.
// O `id` precisa bater com um registro já existente na tabela `bancos` (ver queries.ts / seed).
const CONTA_ORIGEM = {
  id: "nubank",
  banco: "Nubank",
  tipoConta: "Conta corrente •••• 1234",
  saldo: 6782.91,
  sigla: "nu",
  cor: "#8D11DA",
};

function NovaTransferenciaBase() {
  const cardTitleSize = moderateScale(15);
  const labelSize = moderateScale(11);
  const bankNameSize = moderateScale(13);
  const bankSubtitleSize = moderateScale(10);
  const saldoSize = moderateScale(13);
  const valueSize = moderateScale(24);
  const placeholderSize = moderateScale(12);

  const { adicionarTransacao } = useTransacoes();

  const [destinatario, setDestinatario] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleValorChange = useCallback((texto: string) => {
    const somenteDigitos = texto.replace(/[^0-9]/g, "");
    setValorTexto(somenteDigitos);
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorFormatadoExibicao = valorTexto ? FormatToCurrency(valorNumerico) : "R$ 0,00";

  const formularioValido = destinatario.trim().length > 0 && valorNumerico > 0;

  const handleContinuar = useCallback(async () => {
    if (!formularioValido || enviando) return;

    setEnviando(true);

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString("pt-BR");

    try {
      await adicionarTransacao({
        nome: destinatario.trim(),
        subtitulo: "Transferência enviada",
        valor: valorNumerico,
        tipo: "saida",
        data: dataFormatada,
        banco: { sigla: CONTA_ORIGEM.sigla, cor: CONTA_ORIGEM.cor },
        bancoId: CONTA_ORIGEM.id,
        status: "concluida",
        categoriaIcone: "swap-horizontal-outline",
        // Transferência entre contas não entra numa categoria de gasto.
        categoriaId: null,
      });

      setDestinatario("");
      setValorTexto("");
      setDescricao("");
    } catch {
      // Erro já foi logado dentro do Context — aqui só avisamos o usuário
      Alert.alert(
        "Não foi possível concluir",
        "Ocorreu um erro ao salvar a transferência. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }, [formularioValido, enviando, destinatario, valorNumerico, adicionarTransacao]);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium mb-4">
        Nova transferência
      </Text>

      {/* DE ONDE */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        De onde
      </Text>
      <Pressable
        className="bg-input-background border border-input-border rounded-xl p-3 flex-row items-center justify-between active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Selecionar conta de origem"
      >
        <View className="flex-row items-center gap-3">
          <View style={{ backgroundColor: CONTA_ORIGEM.cor }} className="w-9 h-9 rounded-lg items-center justify-center">
            <Text style={{ fontSize: 11 }} className="text-white font-Inter-Bold">
              {CONTA_ORIGEM.sigla}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: bankNameSize }} className="text-main-text font-Inter-Medium">
              {CONTA_ORIGEM.banco}
            </Text>
            <Text style={{ fontSize: bankSubtitleSize }} className="text-desactived-text">
              {CONTA_ORIGEM.tipoConta}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Text style={{ fontSize: saldoSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
            {FormatToCurrency(CONTA_ORIGEM.saldo)}
          </Text>
          <Ionicons name="chevron-down" color={colors["second-text"]} size={14} />
        </View>
      </Pressable>

      {/* BOTÃO INVERTER */}
      <View className="items-center -my-3.5 z-10">
        <View className="w-9 h-9 rounded-full bg-active-icon items-center justify-center">
          <Ionicons name="swap-vertical" color="#fff" size={16} />
        </View>
      </View>

      {/* PARA QUEM */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5 mt-4">
        Para quem
      </Text>
      <View className="bg-input-background border border-dashed border-active-icon/50 rounded-xl px-3 flex-row items-center">
        <View className="w-8 h-8 rounded-full border border-dashed border-active-icon items-center justify-center mr-3">
          <Ionicons name="add" color={colors["active-icon"]} size={16} />
        </View>
        <TextInput
          value={destinatario}
          onChangeText={setDestinatario}
          placeholder="Selecionar contato ou chave PIX"
          placeholderTextColor={colors["desactived-text"]}
          style={{ fontSize: placeholderSize, flex: 1, color: colors["main-text"], paddingVertical: 14 }}
          accessibilityLabel="Contato ou chave PIX do destinatário"
        />
      </View>

      {/* VALOR */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5 mt-4">
        Valor
      </Text>
      <View className="bg-input-background border border-input-border rounded-xl px-3 flex-row items-center justify-between">
        <TextInput
          value={valorFormatadoExibicao}
          onChangeText={handleValorChange}
          keyboardType="numeric"
          style={{ fontSize: valueSize, flex: 1, color: colors["main-text"], fontFamily: "Inter-Bold", paddingVertical: 14 }}
          accessibilityLabel="Valor da transferência"
        />
        <Ionicons name="pencil" color={colors["active-icon"]} size={16} />
      </View>

      {/* DESCRIÇÃO */}
      <View className="flex-row justify-between items-center mb-1.5 mt-4">
        <Text style={{ fontSize: labelSize }} className="text-second-text">
          Descrição (opcional)
        </Text>
        <Text style={{ fontSize: labelSize }} className="text-desactived-text">
          {descricao.length}/30
        </Text>
      </View>
      <TextInput
        value={descricao}
        onChangeText={(texto) => setDescricao(texto.slice(0, 30))}
        placeholder="Ex.: Aluguel, Conta de luz, Mesada..."
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: placeholderSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3.5"
        accessibilityLabel="Descrição opcional da transferência"
      />

      {/* CONTINUAR */}
      <Pressable
        onPress={handleContinuar}
        disabled={!formularioValido || enviando}
        className={`w-full py-3.5 rounded-xl items-center justify-center mt-5 ${formularioValido && !enviando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
        accessibilityRole="button"
        accessibilityLabel="Continuar transferência"
        accessibilityState={{ disabled: !formularioValido || enviando }}
      >
        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
          {enviando ? "Enviando..." : "Continuar"}
        </Text>
      </Pressable>
    </View>
  );
}

export const NovaTransferencia = memo(NovaTransferenciaBase);
