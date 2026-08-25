import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { Transacao, CamposEditaveis, useTransacoes } from "@/context/TransacoesContext";
import { useMetas } from "@/context/MetasContext";
import { dataBRParaIso } from "@/utils/dateUtils";
import { FormatToCurrency } from "@/utils/formatNumber";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { VincularMetaModal } from "@/components/TransacoesComp/VincularMetaModal";
import {
  obterVinculoDaTransacao,
  desvincularTransacao,
  desvincularTodosDaTransacao,
  VinculoDaTransacao,
} from "@/database/metaTransacoesQueries";
import { obterIconeMeta } from "@/database/iconesMeta";

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

  const { verificarImpactoNoVinculo } = useTransacoes();
  const { recarregar: recarregarMetas } = useMetas();

  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Vínculo com meta — carregado à parte do resto do formulário,
  // porque vem de uma tabela diferente (meta_transacoes) e pode mudar
  // sem que o usuário toque em nenhum outro campo (vincular/desvincular).
  const [vinculo, setVinculo] = useState<VinculoDaTransacao | null>(null);
  const [carregandoVinculo, setCarregandoVinculo] = useState(false);
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [processandoVinculo, setProcessandoVinculo] = useState(false);

  const carregarVinculo = useCallback(async (transacaoId: string) => {
    setCarregandoVinculo(true);
    try {
      const dados = await obterVinculoDaTransacao(transacaoId);
      setVinculo(dados);
    } finally {
      setCarregandoVinculo(false);
    }
  }, []);

  useEffect(() => {
    if (!transacao) return;
    setNome(transacao.nome);
    setSubtitulo(transacao.subtitulo);
    setValorTexto(String(Math.round(transacao.valor * 100)));
    setTipo(transacao.tipo);
    setDataIso(dataBRParaIso(transacao.data));
    setCategoriaId(transacao.categoriaId);
    carregarVinculo(transacao.id);
  }, [transacao, carregarVinculo]);

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
  const ocupado = salvando || excluindo || processandoVinculo;
  const visivel = transacao !== null;

  /**
   * Executa de fato o salvamento — chamado direto quando não há risco
   * de conflito com o vínculo, ou depois que o usuário já decidiu o
   * que fazer com o vínculo em caso de mudança de sinal.
   */
  const salvarDeFato = useCallback(async () => {
    if (!transacao || !dataIso) return;

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
      // Cobre o caso do clamp automático de valor_vinculado (ver
      // ajustarVinculoAposEdicaoDeValor em metaTransacoesQueries.ts,
      // acionado dentro de onSalvar/editarTransacao quando o valor da
      // transação encolhe abaixo do valor vinculado) — o progresso da
      // meta pode ter mudado mesmo sem o usuário mexer no vínculo
      // diretamente, então recarrega sempre que salva com sucesso.
      recarregarMetas();
      onFechar();
    } catch {
      Alert.alert(
        "Não foi possível salvar",
        "Ocorreu um erro ao atualizar a transação. Tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  }, [transacao, dataIso, categoriaId, nome, subtitulo, valorNumerico, tipo, onSalvar, onFechar, recarregarMetas]);

  const handleSalvar = useCallback(async () => {
    if (!transacao || !formularioValido || !dataIso || ocupado) return;

    // Regra de edição de transação vinculada: se a mudança de tipo
    // (entrada↔saída) muda o SINAL do valor vinculado, isso nunca é
    // resolvido automaticamente — precisa de confirmação explícita
    // do usuário antes de persistir qualquer coisa (ver
    // TransacoesContext.verificarImpactoNoVinculo). O clamp de valor
    // menor com MESMO sinal é aplicado depois, dentro de
    // editarTransacao, sem precisar de confirmação.
    if (vinculo) {
      const impacto = await verificarImpactoNoVinculo(transacao.id, tipo);
      if (impacto.mudaSinal) {
        Alert.alert(
          "Isso afeta uma meta vinculada",
          `Essa transação está vinculada à meta "${impacto.metaNome}". Mudar o tipo (entrada/saída) muda a natureza dessa movimentação para a meta — não é possível ajustar isso automaticamente.\n\nO que deseja fazer?`,
          [
            { text: "Cancelar edição", style: "cancel" },
            {
              text: "Remover vínculo e salvar",
              style: "destructive",
              onPress: async () => {
                setProcessandoVinculo(true);
                try {
                  await desvincularTodosDaTransacao(transacao.id);
                  setVinculo(null);
                  recarregarMetas();
                } finally {
                  setProcessandoVinculo(false);
                }
                await salvarDeFato();
              },
            },
          ],
        );
        return;
      }
    }

    await salvarDeFato();
  }, [transacao, formularioValido, dataIso, ocupado, vinculo, tipo, verificarImpactoNoVinculo, salvarDeFato, recarregarMetas]);

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
              // Não precisa desvincular explicitamente antes — ON
              // DELETE CASCADE em meta_transacoes cuida disso quando a
              // transação é removida (ver migrations.ts + database.ts).
              await onExcluir(transacao.id);
              // Se a transação excluída tinha vínculo, o progresso da
              // meta muda — MetasContext precisa recarregar para
              // refletir isso sem esperar reabrir o app.
              recarregarMetas();
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
  }, [transacao, onExcluir, onFechar, recarregarMetas]);

  const handleAbrirVincular = useCallback(() => {
    setModalVincularAberto(true);
  }, []);

  const handleFecharVincular = useCallback(() => {
    setModalVincularAberto(false);
  }, []);

  const handleVinculado = useCallback(() => {
    if (transacao) carregarVinculo(transacao.id);
    // O progresso das metas (MinhasMetas, MetasFinanceiras, cards de
    // resumo) vive no MetasContext, que só carrega uma vez no mount —
    // sem isso, a mudança só apareceria depois de reabrir o app.
    recarregarMetas();
  }, [transacao, carregarVinculo, recarregarMetas]);

  const handleDesvincular = useCallback(() => {
    if (!transacao || !vinculo) return;

    Alert.alert(
      "Desvincular meta",
      `Remover o vínculo desta transação com a meta "${vinculo.metaNome}"? O progresso da meta será recalculado.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: async () => {
            setProcessandoVinculo(true);
            try {
              await desvincularTransacao(vinculo.metaId, transacao.id);
              setVinculo(null);
              recarregarMetas();
            } catch {
              Alert.alert("Não foi possível desvincular", "Ocorreu um erro. Tente novamente.");
            } finally {
              setProcessandoVinculo(false);
            }
          },
        },
      ],
    );
  }, [transacao, vinculo, recarregarMetas]);

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
      <View className="flex-row gap-2 mb-4">
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

      {/* VÍNCULO COM META — sempre manual, nunca sugerido automaticamente. */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Meta
      </Text>
      {carregandoVinculo ? (
        <View className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-5">
          <Text style={{ fontSize: inputTextSize }} className="text-desactived-text">
            Carregando...
          </Text>
        </View>
      ) : vinculo ? (
        <View className="bg-input-background border border-input-border rounded-xl p-3 mb-5">
          <View className="flex-row items-center gap-3 mb-3">
            <View
              style={{ backgroundColor: `${obterIconeMeta(vinculo.metaIcone).cor}22` }}
              className="w-10 h-10 rounded-full items-center justify-center"
            >
              <Ionicons name={obterIconeMeta(vinculo.metaIcone).nome} color={obterIconeMeta(vinculo.metaIcone).cor} size={18} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                🎯 {vinculo.metaNome}
              </Text>
              <Text style={{ fontSize: labelSize }} className="text-desactived-text">
                {vinculo.valorVinculado >= 0 ? "+ " : "- "}
                {FormatToCurrency(Math.abs(vinculo.valorVinculado))} vinculado
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleAbrirVincular}
              disabled={ocupado}
              className="flex-1 py-2 rounded-lg items-center border border-input-border active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Alterar meta"
            >
              <Text style={{ fontSize: labelSize }} className="text-active-icon font-Inter-Medium">
                Alterar meta
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDesvincular}
              disabled={ocupado}
              className="flex-1 py-2 rounded-lg items-center border border-input-border active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Desvincular meta"
            >
              <Text style={{ fontSize: labelSize }} className="text-error-color font-Inter-Medium">
                Desvincular
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handleAbrirVincular}
          disabled={ocupado}
          className="flex-row items-center justify-between bg-input-background border border-dashed border-input-border rounded-xl px-3 py-3 mb-5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Vincular à meta"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="flag-outline" color={colors["active-icon"]} size={16} />
            <Text style={{ fontSize: inputTextSize }} className="text-active-icon font-Inter-Medium">
              Vincular à meta
            </Text>
          </View>
          <Ionicons name="chevron-forward" color={colors["active-icon"]} size={16} />
        </Pressable>
      )}

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

      {transacao && (
        <VincularMetaModal
          visivel={modalVincularAberto}
          transacaoId={transacao.id}
          transacaoValor={valorNumerico}
          transacaoTipo={tipo}
          metaIdAtual={vinculo?.metaId ?? null}
          onFechar={handleFecharVincular}
          onVinculado={handleVinculado}
        />
      )}
    </ModalCentralizado>
  );
}

export const EditarTransacaoModal = memo(EditarTransacaoModalBase);