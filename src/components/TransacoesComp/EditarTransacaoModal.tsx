import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Modal, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { Transacao, CamposEditaveis } from "@/context/TransacoesContext";
import { dataBRParaIso } from "@/utils/dateUtils";
import { SeletorData } from "@/components/common/SeletorData";
import { IndicadorPassos } from "@/components/common/IndicadorPassos";

type Props = {
  transacao: Transacao | null;
  onFechar: () => void;
  onSalvar: (id: string, campos: CamposEditaveis) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

const TOTAL_PASSOS = 2;

function EditarTransacaoModalBase({
  transacao,
  onFechar,
  onSalvar,
  onExcluir,
}: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!transacao) return;
    setPasso(0);
    setNome(transacao.nome);
    setSubtitulo(transacao.subtitulo);
    setValorTexto(String(Math.round(transacao.valor * 100)));
    setTipo(transacao.tipo);
    setDataIso(dataBRParaIso(transacao.data));
  }, [transacao]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "R$ 0,00";

  const passo1Valido =
    nome.trim().length > 0 && valorNumerico > 0 && dataIso !== null;
  const ocupado = salvando || excluindo;
  const visivel = transacao !== null;

  const handleProximo = useCallback(() => {
    if (!passo1Valido) return;
    setPasso(1);
  }, [passo1Valido]);

  const handleVoltar = useCallback(() => {
    setPasso(0);
  }, []);

  const handleSalvar = useCallback(async () => {
    if (!transacao || !passo1Valido || !dataIso || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(transacao.id, {
        nome: nome.trim(),
        subtitulo: subtitulo.trim() || "Outros",
        valor: valorNumerico,
        tipo,
        data: dataIso,
        categoriaIcone: transacao.categoriaIcone,
      });
      onFechar();
    } catch {
      Alert.alert(
        "Não foi possível salvar",
        "Ocorreu um erro ao atualizar a transação. Tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  }, [
    transacao,
    passo1Valido,
    dataIso,
    salvando,
    nome,
    subtitulo,
    valorNumerico,
    tipo,
    onSalvar,
    onFechar,
  ]);

  const handleExcluir = useCallback(() => {
    if (!transacao) return;

    Alert.alert(
      "Excluir transação",
      `Tem certeza que deseja excluir "${transacao.nome}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setExcluindo(true);
            try {
              await onExcluir(transacao.id);
              onFechar();
            } catch {
              Alert.alert(
                "Não foi possível excluir",
                "Ocorreu um erro ao excluir a transação. Tente novamente.",
              );
            } finally {
              setExcluindo(false);
            }
          },
        },
      ],
    );
  }, [transacao, onExcluir, onFechar]);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={onFechar}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-card-background rounded-t-2xl p-5 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ fontSize: titleSize }}
              className="text-main-text font-Inter-SemiBold"
            >
              Editar transação
            </Text>
            <Pressable
              onPress={onFechar}
              hitSlop={10}
              disabled={ocupado}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" color={colors["second-text"]} size={22} />
            </Pressable>
          </View>

          <IndicadorPassos totalPassos={TOTAL_PASSOS} passoAtual={passo} />

          {passo === 0 && (
            <>
              <Text
                style={{ fontSize: labelSize }}
                className="text-second-text mb-1.5"
              >
                Nome
              </Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                style={{ fontSize: inputTextSize, color: colors["main-text"] }}
                className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
                editable={!ocupado}
                accessibilityLabel="Nome da transação"
              />

              <Text
                style={{ fontSize: labelSize }}
                className="text-second-text mb-1.5"
              >
                Valor
              </Text>
              <TextInput
                value={valorExibicao}
                onChangeText={handleValorChange}
                keyboardType="numeric"
                style={{ fontSize: inputTextSize, color: colors["main-text"] }}
                className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
                editable={!ocupado}
                accessibilityLabel="Valor da transação"
              />

              <View className="mb-6">
                <SeletorData
                  label="Data"
                  valorIso={dataIso}
                  onChange={setDataIso}
                />
              </View>

              <Pressable
                onPress={handleProximo}
                disabled={!passo1Valido}
                className={`w-full py-3.5 rounded-xl items-center justify-center flex-row gap-1.5 ${passo1Valido ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
                accessibilityRole="button"
                accessibilityLabel="Próximo"
              >
                <Text
                  style={{ fontSize: buttonTextSize }}
                  className="text-white font-Inter-SemiBold"
                >
                  Próximo
                </Text>
                <Ionicons name="arrow-forward" color="#fff" size={16} />
              </Pressable>
            </>
          )}

          {passo === 1 && (
            <>
              <Text
                style={{ fontSize: labelSize }}
                className="text-second-text mb-1.5"
              >
                Categoria
              </Text>
              <TextInput
                value={subtitulo}
                onChangeText={setSubtitulo}
                style={{ fontSize: inputTextSize, color: colors["main-text"] }}
                className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
                editable={!ocupado}
                accessibilityLabel="Categoria da transação"
              />

              <Text
                style={{ fontSize: labelSize }}
                className="text-second-text mb-1.5"
              >
                Tipo
              </Text>
              <View className="flex-row gap-2 mb-6">
                <Pressable
                  onPress={() => setTipo("entrada")}
                  disabled={ocupado}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${tipo === "entrada" ? "bg-sucess-color/15 border-sucess-color" : "border-input-border"}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: tipo === "entrada" }}
                >
                  <Text
                    style={{ fontSize: inputTextSize }}
                    className={
                      tipo === "entrada"
                        ? "text-sucess-color font-Inter-Medium"
                        : "text-second-text"
                    }
                  >
                    Entrada
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTipo("saida")}
                  disabled={ocupado}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${tipo === "saida" ? "bg-error-color/15 border-error-color" : "border-input-border"}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: tipo === "saida" }}
                >
                  <Text
                    style={{ fontSize: inputTextSize }}
                    className={
                      tipo === "saida"
                        ? "text-error-color font-Inter-Medium"
                        : "text-second-text"
                    }
                  >
                    Saída
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row gap-2.5 mb-2.5">
                <Pressable
                  onPress={handleVoltar}
                  disabled={ocupado}
                  className="flex-1 py-3.5 rounded-xl items-center justify-center border border-input-border active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                >
                  <Text
                    style={{ fontSize: buttonTextSize }}
                    className="text-second-text font-Inter-Medium"
                  >
                    Voltar
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSalvar}
                  disabled={ocupado}
                  className="flex-1 py-3.5 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Salvar alterações"
                >
                  <Text
                    style={{ fontSize: buttonTextSize }}
                    className="text-white font-Inter-SemiBold"
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleExcluir}
                disabled={ocupado}
                className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Excluir transação"
              >
                <Text
                  style={{ fontSize: buttonTextSize }}
                  className="text-error-color font-Inter-Medium"
                >
                  {excluindo ? "Excluindo..." : "Excluir transação"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const EditarTransacaoModal = memo(EditarTransacaoModalBase);
