import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, Alert, Share, TextInput } from "react-native";
import { memo, useCallback, useState } from "react";
import { useSimulacoes } from "@/context/SimulacoesContext";
import { TipoSimulacao } from "@/database/simulacoesQueries";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  tipo: TipoSimulacao;
  parametros: unknown;
  resultado: unknown;
  tituloPadrao: string;
  textoCompartilhar: string;
};

/**
 * Barra de ações abaixo do resultado de uma simulação: "Salvar" (grava
 * no banco via SimulacoesContext, só quando o usuário quer) e
 * "Compartilhar" (Share nativo com um resumo em texto). Salvar abre um
 * modal para o usuário nomear a simulação.
 */
function BlocoAcoesSimulacaoBase({ tipo, parametros, resultado, tituloPadrao, textoCompartilhar }: Props) {
  const botaoTextSize = moderateScale(13);
  const { salvarSimulacao } = useSimulacoes();

  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleCompartilhar = useCallback(async () => {
    try {
      await Share.share({ message: textoCompartilhar });
    } catch {
      Alert.alert("Não foi possível compartilhar", "Tente novamente.");
    }
  }, [textoCompartilhar]);

  const handleAbrirSalvar = useCallback(() => {
    setTitulo(tituloPadrao);
    setModalAberto(true);
  }, [tituloPadrao]);

  const handleConfirmarSalvar = useCallback(async () => {
    const nome = titulo.trim() || tituloPadrao;
    setSalvando(true);
    try {
      await salvarSimulacao(tipo, nome, parametros, resultado);
      setModalAberto(false);
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar a simulação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [titulo, tituloPadrao, salvarSimulacao, tipo, parametros, resultado]);

  return (
    <View className="flex-row gap-3">
      <Pressable
        onPress={handleAbrirSalvar}
        className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-active-icon active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Salvar simulação"
      >
        <Ionicons name="bookmark-outline" color="#fff" size={16} />
        <Text style={{ fontSize: botaoTextSize }} className="text-white font-Inter-SemiBold">
          Salvar
        </Text>
      </Pressable>

      <Pressable
        onPress={handleCompartilhar}
        className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-input-border active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Compartilhar simulação"
      >
        <Ionicons name="share-outline" color={colors["active-icon"]} size={16} />
        <Text style={{ fontSize: botaoTextSize }} className="text-active-icon font-Inter-Medium">
          Compartilhar
        </Text>
      </Pressable>

      <ModalCentralizado visivel={modalAberto} onFechar={() => setModalAberto(false)} bloquearFechamentoExterno={salvando}>
        <Text style={{ fontSize: moderateScale(17) }} className="text-main-text font-Inter-SemiBold mb-4">
          Salvar simulação
        </Text>
        <Text style={{ fontSize: moderateScale(11) }} className="text-second-text mb-1.5">
          Nome
        </Text>
        <TextInput
          value={titulo}
          onChangeText={setTitulo}
          placeholder={tituloPadrao}
          placeholderTextColor={colors["desactived-text"]}
          style={{ fontSize: moderateScale(14), color: colors["main-text"] }}
          className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-5"
          editable={!salvando}
          autoFocus
        />
        <Pressable
          onPress={handleConfirmarSalvar}
          disabled={salvando}
          className={`w-full py-3.5 rounded-xl items-center justify-center ${salvando ? "bg-active-icon/30" : "bg-active-icon active:opacity-80"}`}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
            {salvando ? "Salvando..." : "Salvar"}
          </Text>
        </Pressable>
      </ModalCentralizado>
    </View>
  );
}

export const BlocoAcoesSimulacao = memo(BlocoAcoesSimulacaoBase);
