import { memo, useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { useContas } from "@/context/ContasContext";
import { SugestaoTransferencia } from "@/database/contasQueries";
import { FormatToCurrency } from "@/utils/formatNumber";
import { dataIsoParaBR } from "@/utils/dateUtils";

type Props = { sugestoes: SugestaoTransferencia[] };

/**
 * Pares de saída/entrada de mesmo valor entre contas diferentes,
 * encontrados depois da importação — provavelmente o mesmo dinheiro
 * passando de uma conta sua para outra. "Ligar" marca o par como
 * transferência (sai de receitas/despesas). Nada é ligado sozinho.
 */
function SugestoesTransferenciaBase({ sugestoes }: Props) {
  const colors = useThemeColors();
  const { vincularComoTransferencia } = useContas();
  const [ligadas, setLigadas] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);

  const pendentes = sugestoes.filter((s) => !ligadas.has(s.saida.id));

  const ligar = useCallback(
    async (lista: SugestaoTransferencia[]) => {
      setProcessando(true);
      try {
        for (const s of lista) {
          try {
            await vincularComoTransferencia(s.saida.id, s.entrada.id);
            setLigadas((prev) => new Set(prev).add(s.saida.id));
          } catch (e) {
            console.warn("[SugestoesTransferencia] Falha ao ligar par:", e);
          }
        }
      } finally {
        setProcessando(false);
      }
    },
    [vincularComoTransferencia]
  );

  if (sugestoes.length === 0) return null;

  return (
    <View
      style={{ backgroundColor: `${colors["active-icon"]}12`, borderColor: `${colors["active-icon"]}40` }}
      className="w-full border rounded-xl p-3 mb-3"
    >
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="swap-horizontal" size={15} color={colors["active-icon"]} />
        <Text style={{ fontSize: moderateScale(13), color: colors["main-text"] }} className="font-Inter-Medium flex-1">
          Transferências entre suas contas?
        </Text>
        {pendentes.length > 1 && (
          <Pressable onPress={() => ligar(pendentes)} disabled={processando} hitSlop={6}>
            <Text style={{ fontSize: moderateScale(11), color: colors["active-icon"] }} className="font-Inter-Medium">
              Ligar todas
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-2">
        Ligadas, saem de receitas e despesas e só movem o saldo entre as contas.
      </Text>

      {sugestoes.map((s) => {
        const ligada = ligadas.has(s.saida.id);
        return (
          <View key={s.saida.id} className="flex-row items-center gap-2 py-1.5">
            <View className="flex-1">
              <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} numberOfLines={1}>
                {s.saida.bancoNome} → {s.entrada.bancoNome} · {FormatToCurrency(s.valor)}
              </Text>
              <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }} numberOfLines={1}>
                {dataIsoParaBR(s.data)} · {s.saida.nome}
              </Text>
            </View>
            {ligada ? (
              <Ionicons name="checkmark-circle" size={18} color={colors["sucess-color"]} />
            ) : (
              <Pressable
                onPress={() => ligar([s])}
                disabled={processando}
                style={{ borderColor: colors["active-icon"] }}
                className="px-2.5 py-1 rounded-lg border active:opacity-70"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: moderateScale(11), color: colors["active-icon"] }}>Ligar</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

export const SugestoesTransferencia = memo(SugestoesTransferenciaBase);
