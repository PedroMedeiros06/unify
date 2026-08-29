import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Recorrencia, CamposRecorrencia, TipoRecorrencia, TipoVencimento } from "@/database/recorrenciasQueries";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import {
  formatarRegraVencimento,
  proximaDataVencimento,
} from "@/database/datasRecorrencia";
import { dataHojeIso, dataIsoParaBR } from "@/utils/dateUtils";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { SeletorRegraVencimento } from "@/components/RecorrenciasComp/SeletorRegraVencimento";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  visivel: boolean;
  recorrenciaEditando: Recorrencia | null;
  onFechar: () => void;
  onSalvar: (id: string | null, campos: CamposRecorrencia) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
};

const TIPOS: { valor: TipoRecorrencia; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { valor: "entrada", label: "Receita", icone: "arrow-down-circle-outline" },
  { valor: "saida", label: "Despesa", icone: "arrow-up-circle-outline" },
];

function EditarRecorrenciaModalBase({ visivel, recorrenciaEditando, onFechar, onSalvar, onExcluir }: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [nome, setNome] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<TipoRecorrencia>("saida");
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [tipoVencimento, setTipoVencimento] = useState<TipoVencimento>("dia_fixo");
  const [diaVencimento, setDiaVencimento] = useState<number | null>(10);
  const [dataInicioIso, setDataInicioIso] = useState<string | null>(null);
  const [temDataFim, setTemDataFim] = useState(false);
  const [dataFimIso, setDataFimIso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!visivel) return;

    if (recorrenciaEditando) {
      setNome(recorrenciaEditando.nome);
      setValorTexto(String(Math.round(recorrenciaEditando.valor * 100)));
      setTipo(recorrenciaEditando.tipo);
      setCategoriaId(recorrenciaEditando.categoriaId);
      setTipoVencimento(recorrenciaEditando.tipoVencimento);
      setDiaVencimento(recorrenciaEditando.diaVencimento);
      setDataInicioIso(recorrenciaEditando.dataInicio);
      setTemDataFim(recorrenciaEditando.dataFim !== null);
      setDataFimIso(recorrenciaEditando.dataFim);
    } else {
      setNome("");
      setValorTexto("");
      setTipo("saida");
      setCategoriaId(null);
      setTipoVencimento("dia_fixo");
      setDiaVencimento(10);
      setDataInicioIso(dataHojeIso());
      setTemDataFim(false);
      setDataFimIso(null);
    }
  }, [visivel, recorrenciaEditando]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const handleRegraChange = useCallback((novoTipo: TipoVencimento, novoDia: number | null) => {
    setTipoVencimento(novoTipo);
    setDiaVencimento(novoDia);
  }, []);

  const handleToggleDataFim = useCallback(() => {
    setTemDataFim((prev) => {
      if (prev) setDataFimIso(null);
      return !prev;
    });
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  // "ultimo_dia_util" não usa dia; os outros dois exigem 1..31.
  const diaValido =
    tipoVencimento === "ultimo_dia_util" ||
    (diaVencimento != null && diaVencimento >= 1 && diaVencimento <= 31);

  const dataFimValida = !temDataFim || (dataFimIso != null && dataInicioIso != null && dataFimIso >= dataInicioIso);

  const formularioValido =
    nome.trim().length > 0 &&
    valorNumerico > 0 &&
    dataInicioIso !== null &&
    diaValido &&
    dataFimValida;

  const ocupado = salvando || excluindo;

  // Preview do próximo vencimento a partir de hoje (ou do início, se for
  // no futuro), só ilustrativo — não é gravado.
  const proximoVencimento = useMemo(() => {
    if (!dataInicioIso || !diaValido) return null;
    const ref = dataInicioIso > dataHojeIso() ? dataInicioIso : dataHojeIso();
    return proximaDataVencimento(
      {
        tipoVencimento,
        diaVencimento,
        dataInicio: dataInicioIso,
        dataFim: temDataFim ? dataFimIso : null,
        ativa: true,
      },
      ref
    );
  }, [dataInicioIso, diaValido, tipoVencimento, diaVencimento, temDataFim, dataFimIso]);

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !dataInicioIso || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(recorrenciaEditando?.id ?? null, {
        nome: nome.trim(),
        valor: valorNumerico,
        tipo,
        categoriaId,
        tipoVencimento,
        diaVencimento: tipoVencimento === "ultimo_dia_util" ? null : diaVencimento,
        dataInicio: dataInicioIso,
        dataFim: temDataFim ? dataFimIso : null,
        ativa: recorrenciaEditando?.ativa ?? true,
      });
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar a recorrência. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [
    formularioValido,
    dataInicioIso,
    salvando,
    nome,
    valorNumerico,
    tipo,
    categoriaId,
    tipoVencimento,
    diaVencimento,
    temDataFim,
    dataFimIso,
    recorrenciaEditando,
    onSalvar,
    onFechar,
  ]);

  const handleExcluir = useCallback(() => {
    if (!recorrenciaEditando || !onExcluir) return;

    Alert.alert(
      "Excluir recorrência",
      `Tem certeza que deseja excluir "${recorrenciaEditando.nome}"? Meses já encerrados não são afetados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setExcluindo(true);
            try {
              await onExcluir(recorrenciaEditando.id);
              onFechar();
            } catch {
              Alert.alert("Não foi possível excluir", "Ocorreu um erro ao excluir a recorrência. Tente novamente.");
            } finally {
              setExcluindo(false);
            }
          },
        },
      ]
    );
  }, [recorrenciaEditando, onExcluir, onFechar]);

  const categoria = obterCategoriaPorId(categoriaId);
  const corPreview = categoria?.cor ?? colors["desactived-text"];
  const iconePreview = categoria?.icone ?? "repeat-outline";

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {recorrenciaEditando ? "Editar recorrência" : "Nova recorrência"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      {/* TIPO */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Tipo
      </Text>
      <View className="flex-row gap-2 mb-4">
        {TIPOS.map((opcao) => {
          const selecionado = opcao.valor === tipo;
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => setTipo(opcao.valor)}
              disabled={ocupado}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${
                selecionado ? "border-active-icon bg-active-icon/10" : "border-input-border bg-input-background"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selecionado }}
              accessibilityLabel={opcao.label}
            >
              <Ionicons
                name={opcao.icone}
                color={selecionado ? colors["active-icon"] : colors["desactived-text"]}
                size={16}
              />
              <Text
                style={{ fontSize: inputTextSize }}
                className={selecionado ? "text-active-icon font-Inter-Medium" : "text-second-text"}
              >
                {opcao.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* NOME */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Nome
      </Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder={tipo === "entrada" ? "Ex.: Salário" : "Ex.: Aluguel"}
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!ocupado}
        accessibilityLabel="Nome da recorrência"
      />

      {/* VALOR */}
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
        accessibilityLabel="Valor da recorrência"
      />

      {/* CATEGORIA */}
      <View className="mb-4">
        <SeletorCategoria categoriaSelecionada={categoriaId} onSelecionar={setCategoriaId} />
      </View>

      {/* REGRA DE VENCIMENTO */}
      <View className="mb-4">
        <SeletorRegraVencimento
          tipoVencimento={tipoVencimento}
          diaVencimento={diaVencimento}
          onChange={handleRegraChange}
        />
      </View>

      {/* VIGÊNCIA */}
      <View className="mb-3">
        <SeletorData label="A partir de" valorIso={dataInicioIso} onChange={setDataInicioIso} />
      </View>

      <Pressable
        onPress={handleToggleDataFim}
        disabled={ocupado}
        className="flex-row items-center gap-2 mb-3 active:opacity-70"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: temDataFim }}
        accessibilityLabel="Definir data de término"
      >
        <View
          className={`w-5 h-5 rounded-md border items-center justify-center ${
            temDataFim ? "bg-active-icon border-active-icon" : "border-input-border"
          }`}
        >
          {temDataFim && <Ionicons name="checkmark" color="#fff" size={12} />}
        </View>
        <Text style={{ fontSize: inputTextSize }} className="text-second-text">
          Tem data de término
        </Text>
      </Pressable>

      {temDataFim && (
        <View className="mb-3">
          <SeletorData label="Até" valorIso={dataFimIso} onChange={setDataFimIso} />
          {!dataFimValida && (
            <Text style={{ fontSize: labelSize }} className="text-error-color mt-1">
              A data de término deve ser igual ou depois do início.
            </Text>
          )}
        </View>
      )}

      {/* PREVIEW */}
      <View className="bg-input-background border border-lines-divisions rounded-xl p-3 flex-row items-center gap-3 mb-2">
        <View
          style={{ backgroundColor: `${corPreview}22` }}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <Ionicons name={iconePreview} color={corPreview} size={18} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
            {nome || "Nome da recorrência"}
          </Text>
          <Text style={{ fontSize: labelSize }} className="text-desactived-text" numberOfLines={1}>
            {valorExibicao} · {formatarRegraVencimento({ tipoVencimento, diaVencimento })}
          </Text>
        </View>
      </View>

      <View className="flex-row items-start gap-2 bg-active-icon/10 rounded-lg p-2.5 mb-5">
        <Ionicons name="repeat-outline" color={colors["active-icon"]} size={14} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: labelSize }} className="text-second-text flex-1">
          {proximoVencimento
            ? `Próximo lançamento previsto: ${dataIsoParaBR(proximoVencimento)}. Recorrência é só planejamento — não cria transação.`
            : "Recorrência é só planejamento — não cria transação. Ela alimenta a previsão do Orçamento."}
        </Text>
      </View>

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || ocupado}
        className={`w-full py-3.5 rounded-xl items-center justify-center mb-2.5 ${
          formularioValido && !ocupado ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"
        }`}
        accessibilityRole="button"
        accessibilityLabel="Salvar recorrência"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar"}
        </Text>
      </Pressable>

      {recorrenciaEditando && onExcluir && (
        <Pressable
          onPress={handleExcluir}
          disabled={ocupado}
          className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Excluir recorrência"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-error-color font-Inter-Medium">
            {excluindo ? "Excluindo..." : "Excluir recorrência"}
          </Text>
        </Pressable>
      )}
    </ModalCentralizado>
  );
}

export const EditarRecorrenciaModal = memo(EditarRecorrenciaModalBase);
