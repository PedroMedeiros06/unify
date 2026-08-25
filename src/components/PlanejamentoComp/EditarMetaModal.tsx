import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { Meta, CamposMeta, calcularRitmoNecessario } from "@/database/metasQueries";
import { IndicadorPassos } from "@/components/common/IndicadorPassos";
import { SeletorData } from "@/components/common/SeletorData";
import { FormatToCurrency } from "@/utils/formatNumber";
import { dataIsoParaBR } from "@/utils/dateUtils";
import { ICONES_META_DISPONIVEIS, obterIconeMeta } from "@/database/iconesMeta";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  visivel: boolean;
  metaEditando: Meta | null;
  onFechar: () => void;
  onSalvar: (id: string | null, campos: CamposMeta) => Promise<void>;
  onExcluir?: (id: string) => Promise<void>;
};

const TOTAL_PASSOS = 2;

function EditarMetaModalBase({ visivel, metaEditando, onFechar, onSalvar, onExcluir }: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [dataAlvo, setDataAlvo] = useState<string | null>(null);
  const [iconeSelecionado, setIconeSelecionado] = useState(ICONES_META_DISPONIVEIS[0]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!visivel) return;

    setPasso(0);

    if (metaEditando) {
      setNome(metaEditando.nome);
      setValorTexto(String(Math.round(metaEditando.valorMeta * 100)));
      setDataAlvo(metaEditando.dataAlvo);
      setIconeSelecionado(obterIconeMeta(metaEditando.icone));
    } else {
      setNome("");
      setValorTexto("");
      setDataAlvo(null);
      setIconeSelecionado(ICONES_META_DISPONIVEIS[0]);
    }
  }, [visivel, metaEditando]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const passo1Valido = nome.trim().length > 0 && valorNumerico > 0;
  const ocupado = salvando || excluindo;

  // Preview de ritmo necessário no passo 2 — usa o progresso JÁ
  // EXISTENTE da meta (derivado de transações vinculadas), nunca um
  // valor digitado no formulário. Ao criar uma meta nova, progresso
  // ainda não existe (nasce em 0), então o preview reflete isso.
  const ritmoPreview =
    dataAlvo && valorNumerico > 0
      ? calcularRitmoNecessario({
          id: "",
          nome,
          valorMeta: valorNumerico,
          progressoAtual: metaEditando?.progressoAtual ?? 0,
          icone: iconeSelecionado.nome,
          cor: iconeSelecionado.cor,
          dataAlvo,
          criadoEm: "",
        })
      : null;

  const handleProximo = useCallback(() => {
    if (!passo1Valido) return;
    setPasso(1);
  }, [passo1Valido]);

  const handleVoltar = useCallback(() => {
    setPasso(0);
  }, []);

  const handleSalvar = useCallback(async () => {
    if (!passo1Valido || salvando) return;

    setSalvando(true);
    try {
      await onSalvar(metaEditando?.id ?? null, {
        nome: nome.trim(),
        valorMeta: valorNumerico,
        icone: iconeSelecionado.nome,
        cor: iconeSelecionado.cor,
        dataAlvo,
      });
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar a meta. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [passo1Valido, salvando, nome, valorNumerico, iconeSelecionado, dataAlvo, metaEditando, onSalvar, onFechar]);

  const handleExcluir = useCallback(() => {
    if (!metaEditando || !onExcluir) return;

    Alert.alert("Excluir meta", `Tem certeza que deseja excluir "${metaEditando.nome}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setExcluindo(true);
          try {
            await onExcluir(metaEditando.id);
            onFechar();
          } catch {
            Alert.alert("Não foi possível excluir", "Ocorreu um erro ao excluir a meta. Tente novamente.");
          } finally {
            setExcluindo(false);
          }
        },
      },
    ]);
  }, [metaEditando, onExcluir, onFechar]);

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={ocupado}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {metaEditando ? "Editar meta" : "Nova meta"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={ocupado} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <IndicadorPassos totalPassos={TOTAL_PASSOS} passoAtual={passo} />

      {passo === 0 && (
        <>
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Nome da meta
          </Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Viagem de férias"
            placeholderTextColor={colors["desactived-text"]}
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
            editable={!ocupado}
            autoFocus
            accessibilityLabel="Nome da meta"
          />

          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Valor objetivo
          </Text>
          <TextInput
            value={valorExibicao}
            onChangeText={handleValorChange}
            keyboardType="numeric"
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
            editable={!ocupado}
            accessibilityLabel="Valor objetivo da meta"
          />

          {metaEditando && (
            <View className="bg-input-background border border-lines-divisions rounded-xl p-3 mb-4">
              <Text style={{ fontSize: labelSize }} className="text-second-text mb-0.5">
                Progresso atual
              </Text>
              <Text style={{ fontSize: inputTextSize }} className="text-active-icon font-Inter-SemiBold">
                {FormatToCurrency(metaEditando.progressoAtual)}
              </Text>
              <Text style={{ fontSize: labelSize }} className="text-desactived-text mt-0.5">
                Vem das transações vinculadas — vincule ou desvincule transações para ajustar.
              </Text>
            </View>
          )}

          <View className="mb-1">
            <SeletorData label="Prazo final (opcional)" valorIso={dataAlvo} onChange={setDataAlvo} minimoHoje />
          </View>
          <Text style={{ fontSize: labelSize }} className="text-desactived-text mb-5">
            Defina um prazo para vermos quanto guardar por mês e acompanhar na Agenda.
          </Text>

          <Pressable
            onPress={handleProximo}
            disabled={!passo1Valido}
            className={`w-full py-3.5 rounded-xl items-center justify-center flex-row gap-1.5 ${passo1Valido ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
            accessibilityRole="button"
            accessibilityLabel="Próximo"
          >
            <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
              Próximo
            </Text>
            <Ionicons name="arrow-forward" color="#fff" size={16} />
          </Pressable>
        </>
      )}

      {passo === 1 && (
        <>
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-2">
            Escolha um ícone
          </Text>
          <ScrollView
            style={{ maxHeight: moderateScale(150) }}
            className="mb-4"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View className="flex-row flex-wrap gap-2">
              {ICONES_META_DISPONIVEIS.map((icone) => {
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
          </ScrollView>

          <View className="bg-input-background border border-lines-divisions rounded-xl p-3 flex-row items-center gap-3 mb-4">
            <View
              style={{ backgroundColor: `${iconeSelecionado.cor}22` }}
              className="w-10 h-10 rounded-full items-center justify-center"
            >
              <Ionicons name={iconeSelecionado.nome} color={iconeSelecionado.cor} size={18} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                {nome || "Nome da meta"}
              </Text>
              <Text style={{ fontSize: labelSize }} className="text-desactived-text">
                {valorExibicao}
                {dataAlvo ? ` · até ${dataIsoParaBR(dataAlvo)}` : ""}
              </Text>
            </View>
          </View>

          {ritmoPreview && (
            <View className="bg-active-icon/10 border border-active-icon/30 rounded-xl p-3 mb-5">
              <Text style={{ fontSize: labelSize }} className="text-active-icon font-Inter-Medium mb-1">
                Para bater a meta no prazo
              </Text>
              <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-SemiBold">
                Guarde ~{FormatToCurrency(ritmoPreview.porMes)} por mês
              </Text>
              <Text style={{ fontSize: labelSize }} className="text-desactived-text mt-0.5">
                (ou ~{FormatToCurrency(ritmoPreview.porDia)} por dia)
              </Text>
            </View>
          )}
          {!dataAlvo && <View className="mb-5" />}

          <View className="flex-row gap-2.5 mb-2.5">
            <Pressable
              onPress={handleVoltar}
              disabled={ocupado}
              className="flex-1 py-3.5 rounded-xl items-center justify-center border border-input-border active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-second-text font-Inter-Medium">
                Voltar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSalvar}
              disabled={ocupado}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Salvar meta"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                {salvando ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>
          </View>

          {metaEditando && onExcluir && (
            <Pressable
              onPress={handleExcluir}
              disabled={ocupado}
              className="w-full py-3 rounded-xl items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Excluir meta"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-error-color font-Inter-Medium">
                {excluindo ? "Excluindo..." : "Excluir meta"}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </ModalCentralizado>
  );
}

export const EditarMetaModal = memo(EditarMetaModalBase);