import { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { useRecorrencias } from "@/context/RecorrenciasContext";
import { useTransacoes } from "@/context/TransacoesContext";
import { useDialogo } from "@/context/DialogoContext";
import { obterCategoriaPorId } from "@/database/categorias";
import {
  sugerirRecorrencias,
  dispensarSugestaoRecorrencia,
  SugestaoRecorrencia,
} from "@/database/recorrenciasSugeridas";
import { FormatToCurrency } from "@/utils/formatNumber";
import { dataHojeIso } from "@/utils/dateUtils";

/**
 * Card "Parece recorrente": gastos/receitas que se repetem todo mês no
 * histórico e ainda não são recorrência. "Criar" vira uma recorrência
 * mensal (dia típico, valor mediano) a partir deste mês; "Agora não"
 * dispensa de vez. Não aparece se não houver sugestão.
 */
function SugestoesRecorrenciaBase() {
  const colors = useThemeColors();
  const { adicionarRecorrencia, recorrencias } = useRecorrencias();
  const { versaoDados } = useTransacoes();
  const { avisar } = useDialogo();
  const [sugestoes, setSugestoes] = useState<SugestaoRecorrencia[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    sugerirRecorrencias()
      .then((s) => {
        if (ativo) setSugestoes(s);
      })
      .catch((e) => console.warn("[SugestoesRecorrencia] Falha ao sugerir:", e));
    return () => {
      ativo = false;
    };
    // `recorrencias` na dependência: criar uma tira a sugestão da lista.
  }, [versaoDados, recorrencias]);

  const criar = useCallback(
    async (s: SugestaoRecorrencia) => {
      setProcessando(s.chave);
      try {
        await adicionarRecorrencia({
          nome: s.nome,
          valor: s.valor,
          tipo: s.tipo,
          categoriaId: s.categoriaId,
          tipoVencimento: "dia_fixo",
          diaVencimento: Math.min(31, Math.max(1, s.diaDoMes)),
          dataInicio: `${dataHojeIso().slice(0, 7)}-01`,
          dataFim: null,
          ativa: true,
        });
        setSugestoes((prev) => prev.filter((x) => x.chave !== s.chave));
      } catch (e) {
        await avisar({ titulo: "Não foi possível criar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
      } finally {
        setProcessando(null);
      }
    },
    [adicionarRecorrencia, avisar]
  );

  const dispensar = useCallback(async (s: SugestaoRecorrencia) => {
    setSugestoes((prev) => prev.filter((x) => x.chave !== s.chave));
    await dispensarSugestaoRecorrencia(s.chave);
  }, []);

  if (sugestoes.length === 0) return null;

  return (
    <View
      style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
      className="border rounded-xl p-4"
    >
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name="repeat-outline" size={16} color={colors["active-icon"]} />
        <Text style={{ fontSize: moderateScale(14), color: colors["main-text"] }} className="font-Inter-Medium">
          Parece recorrente
        </Text>
      </View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-2">
        Estes valores se repetem todo mês. Virar recorrência coloca no orçamento previsto.
      </Text>

      {sugestoes.map((s, i) => {
        const categoria = obterCategoriaPorId(s.categoriaId);
        const ocupado = processando === s.chave;
        return (
          <View
            key={s.chave}
            style={i > 0 ? { borderTopWidth: 1, borderColor: colors["lines-divisions"] } : undefined}
            className="py-2.5"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={categoria?.icone ?? "help-circle-outline"}
                size={15}
                color={categoria?.cor ?? colors["desactived-text"]}
              />
              <Text style={{ fontSize: moderateScale(13), color: colors["main-text"] }} className="flex-1" numberOfLines={1}>
                {s.nome}
              </Text>
              <Text
                style={{ fontSize: moderateScale(13), color: s.tipo === "entrada" ? colors["sucess-color"] : colors["main-text"] }}
                className="font-Inter-SemiBold"
              >
                {FormatToCurrency(s.valor)}
              </Text>
            </View>
            <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }} className="mt-0.5">
              {s.meses} meses seguidos · por volta do dia {s.diaDoMes}
            </Text>
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={() => criar(s)}
                disabled={ocupado}
                style={{ backgroundColor: colors["active-icon"], opacity: ocupado ? 0.5 : 1 }}
                className="px-3 py-1.5 rounded-lg active:opacity-80"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: moderateScale(11) }} className="text-white font-Inter-Medium">
                  {ocupado ? "Criando..." : "Criar recorrência"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => dispensar(s)}
                disabled={ocupado}
                style={{ borderColor: colors["input-border"] }}
                className="px-3 py-1.5 rounded-lg border active:opacity-70"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>Agora não</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const SugestoesRecorrencia = memo(SugestoesRecorrenciaBase);
