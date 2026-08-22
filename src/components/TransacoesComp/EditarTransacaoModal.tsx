import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { Transacao, CamposEditaveis } from "@/context/TransacoesContext";
import { dataBRParaIso } from "@/utils/dateUtils";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  transacao: Transacao | null;
  onFechar: () => void;
  onSalvar: (id: string, campos: CamposEditaveis) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
};

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

  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!transacao) return;
    setNome(transacao.nome);
    setSubtitulo(transacao.subtitulo);
    setValorTexto(String(Math.round(transacao.valor * 100)));
    setTipo(transacao.tipo);
    setDataIso(dataBRParaIso(transacao.data));
    setCategoriaId(transacao.categoriaId);
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

  const formularioValido =
    nome.trim().length > 0 && valorNumerico > 0 && dataIso !== null;
  const ocupado = salvando || excluindo;
  const visivel = transacao !== null;

  const handleSalvar = useCallback(async () => {
    if (!transacao || !formularioValido || !dataIso || salvando) return;

    setSalvando(true);
    try {
      const categoria = obterCategoriaPorId(categoriaId);
      await onSalvar(transacao.id, {
        nome: nome.trim(),
        subtitulo: subtitulo.trim() || "Outros",
        valor: valorNumerico,
        tipo,
        data: dataIso,
        categoriaIcone: categoria?.icone,
        categoriaId,
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
    formularioValido,
    dataIso,
    salvando,
    nome,
    subtitulo,
    valorNumerico,
    tipo,
    categoriaId,
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
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
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

      <View className="mb-4">
        <SeletorData
          label="Data"
          valorIso={dataIso}
          onChange={setDataIso}
        />
      </View>

      <Text
        style={{ fontSize: labelSize }}
        className="text-second-text mb-1.5"
      >
        Detalhe (opcional)
      </Text>
      <TextInput
        value={subtitulo}
        onChangeText={setSubtitulo}
        placeholder="Ex.: Descrição extra vinda do banco"
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        accessibilityLabel="Detalhe adicional da transação"
      />

      <View className="mb-4">
        <SeletorCategoria categoriaSelecionada={categoriaId} onSelecionar={setCategoriaId} />
      </View>

      <Text
        style={{ fontSize: labelSize }}
        className="text-second-text mb-1.5"
      >
        Tipo
      </Text>
      <View className="flex-row gap-2 mb-5">
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

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || ocupado}
        className={`w-full py-3.5 rounded-xl items-center justify-center mb-2.5 ${formularioValido && !ocupado ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
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
    </ModalCentralizado>
  );
}

export const EditarTransacaoModal = memo(EditarTransacaoModalBase);