import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useTransacoes } from "@/context/TransacoesContext";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { IndicadorPassos } from "@/components/common/IndicadorPassos";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { listarBancos, Banco } from "@/database/queries";
import { dataHojeIso } from "@/utils/dateUtils";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

type Props = {
  visivel: boolean;
  onFechar: () => void;
};

const TOTAL_PASSOS = 2;

/**
 * Criação manual de transação — diferente de EditarTransacaoModal (que
 * assume uma transação já existente, sempre com banco definido).
 * Criação exige escolher o banco também, então é um fluxo próprio em
 * vez de forçar o modal de edição a lidar com os dois casos. Mantido
 * em 2 passos (diferente de EditarTransacaoModal, que virou 1 passo)
 * porque aqui também é preciso escolher o banco de origem — mais um
 * campo obrigatório do que na edição.
 */
function NovaTransacaoModalBase({ visivel, onFechar }: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const { adicionarTransacao } = useTransacoes();

  const [passo, setPasso] = useState(0);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoSelecionado, setBancoSelecionado] = useState<Banco | null>(null);
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(dataHojeIso());
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    listarBancos().then(setBancos);
  }, [visivel]);

  useEffect(() => {
    if (!visivel) return;
    setPasso(0);
    setBancoSelecionado(null);
    setNome("");
    setSubtitulo("");
    setValorTexto("");
    setTipo("saida");
    setDataIso(dataHojeIso());
    setCategoriaId(null);
  }, [visivel]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const passo1Valido = !!bancoSelecionado && nome.trim().length > 0 && valorNumerico > 0 && !!dataIso;

  const handleProximo = useCallback(() => {
    if (!passo1Valido) return;
    setPasso(1);
  }, [passo1Valido]);

  const handleVoltar = useCallback(() => setPasso(0), []);

  const handleSalvar = useCallback(async () => {
    if (!passo1Valido || !bancoSelecionado || !dataIso || salvando) return;

    setSalvando(true);
    try {
      const categoria = obterCategoriaPorId(categoriaId);
      await adicionarTransacao({
        nome: nome.trim(),
        subtitulo: subtitulo.trim() || categoria?.nome || "Outros",
        valor: valorNumerico,
        tipo,
        data: dataIso,
        banco: { sigla: bancoSelecionado.sigla, cor: bancoSelecionado.cor },
        bancoId: bancoSelecionado.id,
        status: "concluida",
        categoriaIcone: categoria?.icone,
        categoriaId,
      });
      onFechar();
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao criar a transação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [passo1Valido, bancoSelecionado, dataIso, salvando, nome, subtitulo, valorNumerico, tipo, categoriaId, adicionarTransacao, onFechar]);

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          Nova transação
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <IndicadorPassos totalPassos={TOTAL_PASSOS} passoAtual={passo} />

      {passo === 0 && (
        <>
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Banco
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {bancos.map((banco) => {
              const selecionado = banco.id === bancoSelecionado?.id;
              return (
                <Pressable
                  key={banco.id}
                  onPress={() => setBancoSelecionado(banco)}
                  style={{ backgroundColor: selecionado ? `${banco.cor}30` : undefined }}
                  className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                    selecionado ? "border-2" : "border-input-border bg-input-background"
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selecionado }}
                >
                  <View style={{ backgroundColor: banco.cor }} className="w-6 h-6 rounded-md items-center justify-center">
                    <Text style={{ fontSize: 10 }} className="text-white font-Inter-Bold">
                      {banco.sigla}
                    </Text>
                  </View>
                  <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium">
                    {banco.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Nome
          </Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Mercado, Salário..."
            placeholderTextColor={colors["desactived-text"]}
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
            editable={!salvando}
            accessibilityLabel="Nome da transação"
          />

          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Valor
          </Text>
          <TextInput
            value={valorExibicao}
            onChangeText={handleValorChange}
            keyboardType="numeric"
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
            editable={!salvando}
            accessibilityLabel="Valor da transação"
          />

          <View className="mb-5">
            <SeletorData label="Data" valorIso={dataIso} onChange={setDataIso} />
          </View>

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
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Detalhe (opcional)
          </Text>
          <TextInput
            value={subtitulo}
            onChangeText={setSubtitulo}
            placeholder="Ex.: Descrição adicional"
            placeholderTextColor={colors["desactived-text"]}
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
            editable={!salvando}
            accessibilityLabel="Detalhe adicional da transação"
          />

          <View className="mb-4">
            <SeletorCategoria categoriaSelecionada={categoriaId} onSelecionar={setCategoriaId} />
          </View>

          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Tipo
          </Text>
          <View className="flex-row gap-2 mb-5">
            <Pressable
              onPress={() => setTipo("entrada")}
              disabled={salvando}
              className={`flex-1 py-2.5 rounded-xl items-center border ${tipo === "entrada" ? "bg-sucess-color/15 border-sucess-color" : "border-input-border"}`}
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
              className={`flex-1 py-2.5 rounded-xl items-center border ${tipo === "saida" ? "bg-error-color/15 border-error-color" : "border-input-border"}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: tipo === "saida" }}
            >
              <Text style={{ fontSize: inputTextSize }} className={tipo === "saida" ? "text-error-color font-Inter-Medium" : "text-second-text"}>
                Saída
              </Text>
            </Pressable>
          </View>

          <View className="flex-row gap-2.5">
            <Pressable
              onPress={handleVoltar}
              disabled={salvando}
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
              disabled={salvando}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Salvar transação"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                {salvando ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ModalCentralizado>
  );
}

export const NovaTransacaoModal = memo(NovaTransacaoModalBase);