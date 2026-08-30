import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { LimiteCategoria } from "@/database/limitesCategoriaQueries";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  visivel: boolean;
  mesAno: string; // "aaaa-mm" — só para rótulo
  limiteEditando: LimiteCategoria | null;
  // Categorias que já têm limite no mês — escondidas ao adicionar.
  categoriasComLimite: CategoriaId[];
  onFechar: () => void;
  onSalvar: (categoriaId: CategoriaId, valorLimite: number) => Promise<void>;
  onExcluir: (categoriaId: CategoriaId) => Promise<void>;
};

function rotuloMes(mesAno: string): string {
  // Reaproveita o formatador ISO -> BR usando o primeiro dia do mês.
  const br = dataIsoParaBR(`${mesAno}-01`); // "01/mm/aaaa"
  const [, mes, ano] = br.split("/");
  return `${mes}/${ano}`;
}

function DefinirLimiteCategoriaModalBase({
  visivel,
  mesAno,
  limiteEditando,
  categoriasComLimite,
  onFechar,
  onSalvar,
  onExcluir,
}: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [valorTexto, setValorTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const editando = limiteEditando !== null;

  useEffect(() => {
    if (!visivel) return;

    if (limiteEditando) {
      setCategoriaId(limiteEditando.categoriaId);
      setValorTexto(String(Math.round(limiteEditando.valorLimite * 100)));
    } else {
      setCategoriaId(null);
      setValorTexto("");
    }
  }, [visivel, limiteEditando]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const formularioValido = categoriaId !== null && valorNumerico > 0;
  const ocupado = salvando || excluindo;

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !categoriaId || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(categoriaId, valorNumerico);
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar o limite. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [formularioValido, categoriaId, salvando, valorNumerico, onSalvar, onFechar]);

  const handleExcluir = useCallback(() => {
    if (!limiteEditando) return;
    const nome = obterCategoriaPorId(limiteEditando.categoriaId)?.nome ?? "esta categoria";

    Alert.alert("Excluir limite", `Remover o limite de "${nome}" em ${rotuloMes(mesAno)}? Outros meses não são afetados.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setExcluindo(true);
          try {
            await onExcluir(limiteEditando.categoriaId);
            onFechar();
          } catch {
            Alert.alert("Não foi possível excluir", "Ocorreu um erro ao excluir o limite. Tente novamente.");
          } finally {
            setExcluindo(false);
          }
        },
      },
    ]);
  }, [limiteEditando, mesAno, onExcluir, onFechar]);

  const categoriaFixa = editando ? obterCategoriaPorId(limiteEditando.categoriaId) : null;

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {editando ? "Editar limite" : "Novo limite"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>
      <Text style={{ fontSize: labelSize }} className="text-desactived-text mb-4">
        Teto de gasto para {rotuloMes(mesAno)}. Só acompanhamento — não bloqueia lançamentos.
      </Text>

      {/* CATEGORIA — fixa quando editando (não dá pra trocar a categoria de um limite existente) */}
      {editando && categoriaFixa ? (
        <>
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Categoria
          </Text>
          <View className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4 flex-row items-center gap-2">
            <Ionicons name={categoriaFixa.icone} color={categoriaFixa.cor} size={16} />
            <Text style={{ fontSize: inputTextSize }} className="text-main-text">
              {categoriaFixa.nome}
            </Text>
          </View>
        </>
      ) : (
        <View className="mb-4">
          <SeletorCategoria
            categoriaSelecionada={categoriaId}
            onSelecionar={setCategoriaId}
            permitirSemCategoria={false}
            categoriasOcultas={categoriasComLimite}
          />
        </View>
      )}

      {/* VALOR */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Limite mensal
      </Text>
      <TextInput
        value={valorExibicao}
        onChangeText={handleValorChange}
        keyboardType="numeric"
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-5"
        editable={!ocupado}
        accessibilityLabel="Valor do limite"
      />

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || ocupado}
        className={`w-full py-3.5 rounded-xl items-center justify-center mb-2.5 ${
          formularioValido && !ocupado ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"
        }`}
        accessibilityRole="button"
        accessibilityLabel="Salvar limite"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar"}
        </Text>
      </Pressable>

      {editando && (
        <Pressable
          onPress={handleExcluir}
          disabled={ocupado}
          className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Excluir limite"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-error-color font-Inter-Medium">
            {excluindo ? "Excluindo..." : "Excluir limite"}
          </Text>
        </Pressable>
      )}
    </ModalCentralizado>
  );
}

export const DefinirLimiteCategoriaModal = memo(DefinirLimiteCategoriaModalBase);
