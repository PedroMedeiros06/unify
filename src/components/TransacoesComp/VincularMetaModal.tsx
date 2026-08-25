import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useMetas } from "@/context/MetasContext";
import { calcularPercentualMeta, metaEstaConcluida, Meta } from "@/database/metasQueries";
import { vincularTransacaoAMeta, desvincularTransacao } from "@/database/metaTransacoesQueries";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { obterIconeMeta } from "@/database/iconesMeta";

type Props = {
  visivel: boolean;
  // Transação sendo vinculada — precisamos do id, valor absoluto e
  // tipo para saber o sinal do valor_vinculado e o teto do valor
  // editável (nunca pode ultrapassar |valor da transação|).
  transacaoId: string;
  transacaoValor: number;
  transacaoTipo: "entrada" | "saida";
  // Quando a transação já está vinculada a uma meta e o usuário abriu
  // este modal via "Alterar meta", o id da meta atual precisa ser
  // informado — assim, ao confirmar uma meta diferente, o vínculo
  // antigo é removido antes de criar o novo (evita deixar duas linhas
  // ou um vínculo órfão; UPSERT em vincularTransacaoAMeta só resolve
  // conflito quando é a MESMA meta+transação, não uma troca de meta).
  metaIdAtual?: string | null;
  onFechar: () => void;
  // Chamado depois que o vínculo é criado com sucesso, para a tela que
  // abriu este modal recarregar o vínculo exibido (ex: EditarTransacaoModal).
  onVinculado: () => void;
};

function VincularMetaModalBase({
  visivel,
  transacaoId,
  transacaoValor,
  transacaoTipo,
  metaIdAtual,
  onFechar,
  onVinculado,
}: Props) {
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);
  const metaNomeSize = moderateScale(14);
  const metaProgressoSize = moderateScale(11);

  const { metas, carregando: carregandoMetas } = useMetas();

  const [passo, setPasso] = useState(0);
  const [metaSelecionada, setMetaSelecionada] = useState<Meta | null>(null);
  const [valorTexto, setValorTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Só metas em andamento fazem sentido para vincular — uma meta já
  // concluída não deveria receber mais aportes através deste fluxo
  // (o usuário pode reabrir editando o valor objetivo, se quiser).
  const metasDisponiveis = metas.filter((m) => !metaEstaConcluida(m));

  useEffect(() => {
    if (!visivel) return;
    setPasso(0);
    setMetaSelecionada(null);
    // Valor padrão = valor total da transação, editável no passo 2
    // antes de confirmar (vínculo parcial é suportado desde o início).
    setValorTexto(String(Math.round(Math.abs(transacaoValor) * 100)));
  }, [visivel, transacaoValor]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const valorMaximo = Math.abs(transacaoValor);
  const valorExcedeTransacao = valorNumerico > valorMaximo;
  const valorValido = valorNumerico > 0 && !valorExcedeTransacao;

  const handleSelecionarMeta = useCallback((meta: Meta) => {
    setMetaSelecionada(meta);
    setPasso(1);
  }, []);

  const handleVoltar = useCallback(() => {
    setPasso(0);
  }, []);

  const handleConfirmar = useCallback(async () => {
    if (!metaSelecionada || !valorValido || salvando) return;

    setSalvando(true);
    try {
      // Se já havia vínculo com outra meta (fluxo "Alterar meta"),
      // remove o vínculo antigo antes de criar o novo — UPSERT em
      // vincularTransacaoAMeta só cobre o caso de confirmar de novo
      // para a MESMA meta, não uma troca.
      if (metaIdAtual && metaIdAtual !== metaSelecionada.id) {
        await desvincularTransacao(metaIdAtual, transacaoId);
      }

      // Sinal do valor vinculado segue o tipo da transação — entrada
      // aumenta o progresso, saída (retirada da reserva) diminui.
      const sinal = transacaoTipo === "entrada" ? 1 : -1;
      await vincularTransacaoAMeta(metaSelecionada.id, transacaoId, valorNumerico * sinal);
      onVinculado();
      onFechar();
    } catch {
      Alert.alert("Não foi possível vincular", "Ocorreu um erro ao vincular a transação à meta. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [metaSelecionada, valorValido, salvando, metaIdAtual, transacaoTipo, transacaoId, valorNumerico, onVinculado, onFechar]);

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando}>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          {passo === 0 ? "Vincular à meta" : "Confirmar valor"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      {passo === 0 && (
        <>
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-3">
            Escolha uma meta para esta transação
          </Text>

          {carregandoMetas ? (
            <View className="items-center py-6">
              <Text style={{ fontSize: labelSize }} className="text-desactived-text">
                Carregando metas...
              </Text>
            </View>
          ) : metasDisponiveis.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="flag-outline" color={colors["desactived-text"]} size={26} />
              <Text style={{ fontSize: labelSize }} className="text-desactived-text text-center mt-2">
                Nenhuma meta em andamento. Crie uma meta primeiro para poder vincular transações a ela.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: moderateScale(280) }} showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {metasDisponiveis.map((meta) => {
                  const icone = obterIconeMeta(meta.icone);
                  const percentual = calcularPercentualMeta(meta);
                  return (
                    <Pressable
                      key={meta.id}
                      onPress={() => handleSelecionarMeta(meta)}
                      className="flex-row items-center gap-3 bg-input-background border border-input-border rounded-xl p-3 active:opacity-70"
                      accessibilityRole="radio"
                      accessibilityState={{ checked: false }}
                      accessibilityLabel={`${meta.nome}, ${percentual}% concluído`}
                    >
                      <View
                        style={{ backgroundColor: `${icone.cor}22` }}
                        className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                      >
                        <Ionicons name={icone.nome} color={icone.cor} size={18} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ fontSize: metaNomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                          {meta.nome}
                        </Text>
                        <Text style={{ fontSize: metaProgressoSize }} className="text-desactived-text">
                          {FormatToCurrency(meta.progressoAtual)} de {FormatToCurrency(meta.valorMeta)} · {percentual}%
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {passo === 1 && metaSelecionada && (
        <>
          <View className="bg-input-background border border-lines-divisions rounded-xl p-3 flex-row items-center gap-3 mb-4">
            <View
              style={{ backgroundColor: `${obterIconeMeta(metaSelecionada.icone).cor}22` }}
              className="w-10 h-10 rounded-full items-center justify-center"
            >
              <Ionicons name={obterIconeMeta(metaSelecionada.icone).nome} color={obterIconeMeta(metaSelecionada.icone).cor} size={18} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: metaNomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                {metaSelecionada.nome}
              </Text>
              <Text style={{ fontSize: metaProgressoSize }} className="text-desactived-text">
                Progresso atual: {FormatToCurrency(metaSelecionada.progressoAtual)}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            Quanto dessa transação deve contar para a meta?
          </Text>
          <TextInput
            value={valorExibicao}
            onChangeText={handleValorChange}
            keyboardType="numeric"
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-1.5"
            editable={!salvando}
            autoFocus
            accessibilityLabel="Valor a vincular à meta"
          />
          <Text style={{ fontSize: labelSize }} className="text-desactived-text mb-4">
            Valor da transação: {FormatToCurrency(valorMaximo)}
            {transacaoTipo === "saida" ? " (saída — vai reduzir o progresso)" : ""}
          </Text>

          {valorExcedeTransacao && (
            <Text style={{ fontSize: labelSize }} className="text-error-color mb-4">
              O valor não pode ser maior que o valor da transação.
            </Text>
          )}

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
              onPress={handleConfirmar}
              disabled={!valorValido || salvando}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center ${valorValido && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
              accessibilityRole="button"
              accessibilityLabel="Vincular"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                {salvando ? "Vinculando..." : "Vincular"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ModalCentralizado>
  );
}

export const VincularMetaModal = memo(VincularMetaModalBase);