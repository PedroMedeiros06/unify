import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, Share, TextInput } from "react-native";
import { memo, useCallback, useState } from "react";
import { useSimulacoes } from "@/context/SimulacoesContext";
import { SimulacaoSalva, TipoSimulacao } from "@/database/simulacoesQueries";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { compartilharSimulacaoPdf } from "@/utils/exportarSimulacaoPdf";
import { useDialogo } from "@/context/DialogoContext";

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
 * "Compartilhar" (abre um menu com texto ou PDF — sem precisar salvar
 * antes). Salvar abre um modal para o usuário nomear a simulação.
 */
function BlocoAcoesSimulacaoBase({ tipo, parametros, resultado, tituloPadrao, textoCompartilhar }: Props) {
  const botaoTextSize = moderateScale(13);
  const { salvarSimulacao } = useSimulacoes();
  const { avisar } = useDialogo();

  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [menuCompartilharAberto, setMenuCompartilharAberto] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handleCompartilharTexto = useCallback(async () => {
    setMenuCompartilharAberto(false);
    try {
      await Share.share({ message: textoCompartilhar });
    } catch {
      await avisar({ titulo: "Não foi possível compartilhar", mensagem: "Tente novamente." });
    }
  }, [textoCompartilhar, avisar]);

  const handleCompartilharPdf = useCallback(async () => {
    setGerandoPdf(true);
    try {
      // A simulação ainda não foi salva — monta um registro efêmero só
      // para gerar o PDF (compartilharSimulacaoPdf não usa o `id`).
      const efemera = {
        id: "",
        tipo,
        titulo: tituloPadrao,
        parametros,
        resultado,
        criadoEm: new Date().toISOString(),
      } as SimulacaoSalva;

      const ok = await compartilharSimulacaoPdf(efemera);
      if (!ok) {
        await avisar({
          titulo: "Indisponível",
          mensagem: "O compartilhamento de arquivos não está disponível neste aparelho.",
        });
      }
      setMenuCompartilharAberto(false);
    } catch {
      await avisar({ titulo: "Não foi possível gerar o PDF", mensagem: "Tente novamente." });
    } finally {
      setGerandoPdf(false);
    }
  }, [tipo, tituloPadrao, parametros, resultado, avisar]);

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
      await avisar({ titulo: "Não foi possível salvar", mensagem: "Ocorreu um erro ao salvar a simulação. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [titulo, tituloPadrao, salvarSimulacao, tipo, parametros, resultado, avisar]);

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
        onPress={() => setMenuCompartilharAberto(true)}
        className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border border-input-border active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Compartilhar simulação"
      >
        <Ionicons name="share-outline" color={colors["active-icon"]} size={16} />
        <Text style={{ fontSize: botaoTextSize }} className="text-active-icon font-Inter-Medium">
          Compartilhar
        </Text>
      </Pressable>

      {/* Menu compartilhar: escolha entre texto e PDF, sem exigir salvar antes. */}
      <ModalCentralizado
        visivel={menuCompartilharAberto}
        onFechar={() => setMenuCompartilharAberto(false)}
        bloquearFechamentoExterno={gerandoPdf}
      >
        <Text style={{ fontSize: moderateScale(17) }} className="text-main-text font-Inter-SemiBold mb-1">
          Compartilhar simulação
        </Text>
        <Text style={{ fontSize: moderateScale(11) }} className="text-second-text mb-4">
          Como você quer compartilhar?
        </Text>

        <Pressable
          onPress={handleCompartilharTexto}
          disabled={gerandoPdf}
          className="flex-row items-center gap-3 py-3.5 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Compartilhar como texto"
        >
          <View style={{ backgroundColor: `${colors["active-icon"]}22` }} className="w-9 h-9 rounded-lg items-center justify-center">
            <Ionicons name="chatbox-ellipses-outline" color={colors["active-icon"]} size={18} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: moderateScale(14) }} className="text-main-text font-Inter-Medium">
              Como texto
            </Text>
            <Text style={{ fontSize: moderateScale(11) }} className="text-desactived-text">
              Resumo em mensagem
            </Text>
          </View>
        </Pressable>

        <View className="h-px bg-lines-divisions/60" />

        <Pressable
          onPress={handleCompartilharPdf}
          disabled={gerandoPdf}
          className="flex-row items-center gap-3 py-3.5 active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Compartilhar como PDF"
        >
          <View style={{ backgroundColor: `${colors["active-icon"]}22` }} className="w-9 h-9 rounded-lg items-center justify-center">
            <Ionicons name="document-outline" color={colors["active-icon"]} size={18} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: moderateScale(14) }} className="text-main-text font-Inter-Medium">
              {gerandoPdf ? "Gerando PDF..." : "Como PDF"}
            </Text>
            <Text style={{ fontSize: moderateScale(11) }} className="text-desactived-text">
              Documento de 1 página
            </Text>
          </View>
        </Pressable>
      </ModalCentralizado>

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
