import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Alert } from "react-native";
import { memo, useMemo } from "react";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { useTransacoes, Transacao } from "@/context/TransacoesContext";
import { useCompromissos } from "@/context/CompromissosContext";
import { Compromisso } from "@/database/compromissosQueries";
import { dataBRParaIso } from "@/utils/dateUtils";

/**
 * Seleção de uma transação JÁ EXISTENTE para vincular a um compromisso.
 *
 * O Unify NÃO cria transações — ele organiza/visualiza a vida
 * financeira. "Pagar" um compromisso aqui é só apontar qual transação
 * real (importada ou cadastrada pelo usuário) corresponde a ele. Se não
 * existir transação correspondente, o compromisso continua pendente.
 *
 * Vincular NUNCA altera o valor nem qualquer dado da transação — só
 * grava `compromissos.transacao_id`. Desvincular (feito fora deste
 * modal) remove só o vínculo, a transação permanece intacta.
 *
 * As transações são apenas ORDENADAS por compatibilidade (mesmo tipo =
 * saída, valor igual, data próxima do vencimento) para facilitar achar
 * a certa — a escolha final é sempre manual do usuário.
 */

type Props = {
  visivel: boolean;
  compromisso: Compromisso | null;
  onFechar: () => void;
  onVincular: (transacaoId: string) => void | Promise<void>;
};

const TOLERANCIA_VALOR = 0.01;

function diasDeDiferenca(isoA: string, isoB: string): number {
  const [ay, am, ad] = isoA.split("-").map(Number);
  const [by, bm, bd] = isoB.split("-").map(Number);
  const a = new Date(ay, (am ?? 1) - 1, ad ?? 1).getTime();
  const b = new Date(by, (bm ?? 1) - 1, bd ?? 1).getTime();
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

type TransacaoAvaliada = {
  transacao: Transacao;
  compativel: boolean;
  distanciaDias: number;
  jaVinculada: boolean;
};

function VincularTransacaoCompromissoModalBase({ visivel, compromisso, onFechar, onVincular }: Props) {
  const titleSize = moderateScale(17);
  const subtitleSize = moderateScale(12);
  const noteSize = moderateScale(11);
  const rowTitleSize = moderateScale(13);
  const rowMetaSize = moderateScale(10);
  const rowValueSize = moderateScale(13);
  const badgeSize = moderateScale(9);
  const emptySize = moderateScale(12);

  const { transacoes } = useTransacoes();
  const { compromissos } = useCompromissos();

  // Transações já usadas por OUTRO compromisso — continuam aparecendo,
  // mas desabilitadas, para o usuário não vincular a mesma transação a
  // dois compromissos sem perceber.
  const idsJaVinculados = useMemo(() => {
    const set = new Set<string>();
    for (const c of compromissos) {
      if (c.transacaoId && c.id !== compromisso?.id) set.add(c.transacaoId);
    }
    return set;
  }, [compromissos, compromisso?.id]);

  const lista = useMemo<TransacaoAvaliada[]>(() => {
    if (!compromisso) return [];

    // Compromisso é sempre uma despesa — só faz sentido casar com
    // transações de saída.
    const saidas = transacoes.filter((t) => t.tipo === "saida");

    const avaliadas: TransacaoAvaliada[] = saidas.map((transacao) => {
      const isoTransacao = dataBRParaIso(transacao.data);
      return {
        transacao,
        compativel: Math.abs(transacao.valor - compromisso.valor) < TOLERANCIA_VALOR,
        distanciaDias: diasDeDiferenca(isoTransacao, compromisso.dataVencimento),
        jaVinculada: idsJaVinculados.has(transacao.id),
      };
    });

    // Ordena: compatíveis primeiro; dentro de cada grupo, mais perto do
    // vencimento primeiro; empate, mais recente primeiro.
    avaliadas.sort((a, b) => {
      if (a.compativel !== b.compativel) return a.compativel ? -1 : 1;
      if (a.distanciaDias !== b.distanciaDias) return a.distanciaDias - b.distanciaDias;
      return dataBRParaIso(b.transacao.data).localeCompare(dataBRParaIso(a.transacao.data));
    });

    return avaliadas;
  }, [transacoes, compromisso, idsJaVinculados]);

  const handleSelecionar = (item: TransacaoAvaliada) => {
    if (!compromisso || item.jaVinculada) return;
    const { transacao } = item;
    Alert.alert(
      "Vincular esta transação?",
      `${transacao.nome} · ${FormatToCurrency(transacao.valor)} · ${transacao.data}\n\n` +
        "Isso só marca o compromisso como pago. O valor e os dados da transação não são alterados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Vincular",
          onPress: () => {
            void Promise.resolve(onVincular(transacao.id)).then(onFechar);
          },
        },
      ]
    );
  };

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar}>
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-2">
          <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
            Vincular transação
          </Text>
          {compromisso && (
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1" numberOfLines={2}>
              {compromisso.nome} · {FormatToCurrency(compromisso.valor)} · vence {compromisso.dataVencimento.split("-").reverse().join("/")}
            </Text>
          )}
        </View>
        <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <View className="flex-row items-start gap-2 bg-input-background border border-lines-divisions rounded-xl p-3 mb-4">
        <Ionicons name="information-circle-outline" color={colors["active-icon"]} size={16} />
        <Text style={{ fontSize: noteSize }} className="text-second-text flex-1">
          Selecionar uma transação apenas marca o compromisso como pago. O valor e os dados da
          transação não são alterados. O Unify não cria transações — cadastre ou importe a
          transação real antes.
        </Text>
      </View>

      {lista.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="receipt-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: emptySize }} className="text-desactived-text text-center mt-2">
            Nenhuma transação de saída cadastrada. Importe ou registre a transação real primeiro — o
            compromisso continua pendente até lá.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {lista.map((item) => (
            <Pressable
              key={item.transacao.id}
              onPress={() => handleSelecionar(item)}
              disabled={item.jaVinculada}
              className={`flex-row items-center gap-3 border rounded-xl p-3 ${
                item.jaVinculada
                  ? "border-lines-divisions opacity-40"
                  : "border-lines-divisions bg-input-background active:opacity-70"
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${item.transacao.nome}, ${FormatToCurrency(item.transacao.valor)}, ${item.transacao.data}${
                item.compativel ? ", compatível" : ""
              }${item.jaVinculada ? ", já vinculada a outro compromisso" : ""}`}
            >
              <View
                style={{ backgroundColor: `${item.transacao.banco.cor}22` }}
                className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0"
              >
                <Text style={{ fontSize: 9, color: item.transacao.banco.cor }} className="font-Inter-Bold">
                  {item.transacao.banco.sigla}
                </Text>
              </View>

              <View className="flex-1">
                <Text style={{ fontSize: rowTitleSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
                  {item.transacao.nome}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text style={{ fontSize: rowMetaSize }} className="text-desactived-text">
                    {item.transacao.data}
                  </Text>
                  {item.compativel && !item.jaVinculada && (
                    <View style={{ backgroundColor: `${colors["sucess-color"]}22` }} className="px-1.5 py-0.5 rounded-full">
                      <Text style={{ fontSize: badgeSize, color: colors["sucess-color"] }} className="font-Inter-Medium">
                        Compatível
                      </Text>
                    </View>
                  )}
                  {item.jaVinculada && (
                    <Text style={{ fontSize: badgeSize }} className="text-desactived-text">
                      Já vinculada a outro compromisso
                    </Text>
                  )}
                </View>
              </View>

              <Text style={{ fontSize: rowValueSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
                {FormatToCurrency(item.transacao.valor)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ModalCentralizado>
  );
}

export const VincularTransacaoCompromissoModal = memo(VincularTransacaoCompromissoModalBase);
