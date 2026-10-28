import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useTransacoes } from "@/context/TransacoesContext";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { SeletorConta } from "@/components/ContasComp/SeletorConta";
import { ContaComSaldo } from "@/database/contasQueries";
import { dataHojeIso } from "@/utils/dateUtils";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { useDialogo } from "@/context/DialogoContext";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  // "É uma transferência?" — fecha este modal e abre o de transferência
  // já com a conta escolhida aqui como origem.
  onTrocarParaTransferencia?: (origemId: string | null) => void;
};

/**
 * Criação manual de transação. Formulário único (sem passos), com os
 * campos essenciais: banco, nome, valor, data — mais o tipo
 * (entrada/saída) e a categoria. O detalhe/subtítulo antigo foi
 * removido; quando vazio, cai no nome da categoria.
 *
 * A conta é escolhida entre TODAS as contas ativas do usuário (bancos
 * do catálogo, contas personalizadas — "Outro banco" — e cartões), ver
 * SeletorConta / Minhas contas.
 */
function NovaTransacaoModalBase({ visivel, onFechar, onTrocarParaTransferencia }: Props) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const { adicionarTransacao } = useTransacoes();

  const [conta, setConta] = useState<ContaComSaldo | null>(null);
  const [nome, setNome] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(dataHojeIso());
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setConta(null);
    setNome("");
    setValorTexto("");
    setTipo("saida");
    setDataIso(dataHojeIso());
    setCategoriaId(null);
    setSalvando(false);
  }, [visivel]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const formularioValido = !!conta && nome.trim().length > 0 && valorNumerico > 0 && !!dataIso;

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !conta || !dataIso || salvando) return;

    setSalvando(true);
    try {
      const categoria = obterCategoriaPorId(categoriaId);
      await adicionarTransacao({
        nome: nome.trim(),
        subtitulo: categoria?.nome || "Outros",
        valor: valorNumerico,
        tipo,
        data: dataIso,
        banco: { sigla: conta.sigla, cor: conta.cor },
        bancoId: conta.id,
        status: "concluida",
        categoriaIcone: categoria?.icone,
        categoriaId,
      });
      onFechar();
    } catch {
      await avisar({ titulo: "Não foi possível salvar", mensagem: "Ocorreu um erro ao criar a transação. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [formularioValido, conta, dataIso, salvando, nome, valorNumerico, tipo, categoriaId, adicionarTransacao, onFechar, avisar]);

  return (
    <ModalCentralizado
      visivel={visivel}
      onFechar={onFechar}
      bloquearFechamentoExterno={salvando}
      overlayOpacidade={0.6}
    >
      <View className="flex-row justify-between items-center mb-5">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          Nova transação
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      {/* CONTA — qualquer conta ativa (catálogo, personalizadas e cartões) */}
      <View className="mb-4">
        <SeletorConta
          label="Conta"
          contaId={conta?.id ?? null}
          onSelecionar={setConta}
          desabilitado={salvando}
        />
      </View>

      {/* NOME */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Nome
      </Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Mercado, Salário..."
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"], backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
        className="border rounded-xl px-3 py-3 mb-4"
        editable={!salvando}
        accessibilityLabel="Nome da transação"
      />

      {/* VALOR */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Valor
      </Text>
      <TextInput
        value={valorExibicao}
        onChangeText={handleValorChange}
        keyboardType="numeric"
        style={{ fontSize: inputTextSize, color: colors["main-text"], backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
        className="border rounded-xl px-3 py-3 mb-4"
        editable={!salvando}
        accessibilityLabel="Valor da transação"
      />

      {/* DATA */}
      <View className="mb-4">
        <SeletorData label="Data" valorIso={dataIso} onChange={setDataIso} />
      </View>

      {/* TIPO */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Tipo
      </Text>
      <View className="flex-row gap-2 mb-4">
        <Pressable
          onPress={() => setTipo("entrada")}
          disabled={salvando}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            tipo === "entrada" ? "bg-sucess-color/15 border-sucess-color" : "border-input-border"
          }`}
          accessibilityRole="radio"
          accessibilityState={{ checked: tipo === "entrada" }}
        >
          <Text style={{ fontSize: inputTextSize }} className={tipo === "entrada" ? "text-sucess-color font-Inter-Medium" : "text-second-text"}>
            Entrada
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTipo("saida")}
          disabled={salvando}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            tipo === "saida" ? "bg-error-color/15 border-error-color" : "border-input-border"
          }`}
          accessibilityRole="radio"
          accessibilityState={{ checked: tipo === "saida" }}
        >
          <Text style={{ fontSize: inputTextSize }} className={tipo === "saida" ? "text-error-color font-Inter-Medium" : "text-second-text"}>
            Saída
          </Text>
        </Pressable>
      </View>

      {onTrocarParaTransferencia && (
        <Pressable
          onPress={() => onTrocarParaTransferencia(conta?.id ?? null)}
          disabled={salvando}
          className="flex-row items-center gap-1.5 mb-4 -mt-1"
          hitSlop={6}
          accessibilityRole="button"
        >
          <Ionicons name="swap-horizontal-outline" size={14} color={colors["active-icon"]} />
          <Text style={{ fontSize: labelSize, color: colors["active-icon"] }}>
            Movimentação entre suas contas? Use transferência
          </Text>
        </Pressable>
      )}

      {/* CATEGORIA */}
      <View className="mb-5">
        <SeletorCategoria categoriaSelecionada={categoriaId} onSelecionar={setCategoriaId} />
      </View>

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || salvando}
        className={`w-full py-3.5 rounded-xl items-center justify-center ${
          formularioValido && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"
        }`}
        accessibilityRole="button"
        accessibilityLabel="Salvar transação"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar transação"}
        </Text>
      </Pressable>
    </ModalCentralizado>
  );
}

export const NovaTransacaoModal = memo(NovaTransacaoModalBase);
