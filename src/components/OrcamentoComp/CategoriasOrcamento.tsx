import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { obterCategoriaPorId } from "@/database/categorias";
import { listarResumoPorCategoria } from "@/database/queries";
import { somarCompromissosNaoPagosPorCategoria } from "@/database/compromissosQueries";
import {
  LimiteCategoria,
  calcularPercentualLimite,
  obterMesAnteriorComLimites,
} from "@/database/limitesCategoriaQueries";
import { useLimitesOrcamento } from "@/context/LimitesOrcamentoContext";
import { useTransacoes } from "@/context/TransacoesContext";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "aaaa-mm" -> "setembro" (ou "setembro de 2025" se for de outro ano). */
function rotuloMes(mesAno: string, anoReferencia: number): string {
  const [a, m] = mesAno.split("-").map(Number);
  return a === anoReferencia ? NOMES_MES[m - 1] : `${NOMES_MES[m - 1]} de ${a}`;
}

type Props = {
  anoExibido: number;
  mesExibido: number; // 0-11
  // O modal de definir/editar limite vive no OrcamentoResumo (pai),
  // porque a Visão geral também o abre. Este card só dispara.
  onAbrirNovoLimite: () => void;
  onEditarLimite: (limite: LimiteCategoria) => void;
};

function paraIso(ano: number, mes0a11: number, dia: number): string {
  return `${ano}-${String(mes0a11 + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const ItemLimite = memo(function ItemLimite({
  limite,
  gasto,
  aVencer,
  isLast,
  onPress,
}: {
  limite: LimiteCategoria;
  gasto: number;
  // Compromissos não pagos desta categoria no mês (ainda vão sair).
  aVencer: number;
  isLast: boolean;
  onPress: (limite: LimiteCategoria) => void;
}) {
  const colors = useThemeColors();
  const nomeSize = moderateScale(14);
  const limiteSize = moderateScale(11);
  const valorSize = moderateScale(13);
  const percentualSize = moderateScale(11);

  const categoria = obterCategoriaPorId(limite.categoriaId);
  const cor = categoria?.cor ?? colors["desactived-text"];
  const icone = categoria?.icone ?? "help-circle-outline";
  const nome = categoria?.nome ?? limite.categoriaId;

  const percentual = calcularPercentualLimite(gasto, limite.valorLimite);
  // A partir de 90% do limite, o percentual e a barra viram aviso
  // (vermelho) — sinaliza que a categoria está perto de estourar.
  const critico = percentual >= 90;

  return (
    <Pressable
      onPress={() => onPress(limite)}
      className={`flex-row items-center gap-3 py-3.5 active:opacity-70 ${isLast ? "" : "border-b border-lines-divisions"}`}
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${FormatToCurrency(gasto)} de ${FormatToCurrency(limite.valorLimite)}, ${percentual}% utilizado`}
    >
      <View
        style={{ backgroundColor: `${cor}22` }}
        className="w-11 h-11 rounded-full items-center justify-center flex-shrink-0"
      >
        <Ionicons name={icone} color={cor} size={20} />
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-start mb-1.5">
          <View className="flex-1 pr-2">
            <Text style={{ fontSize: nomeSize }} className="text-main-text font-Inter-Medium" numberOfLines={1}>
              {nome}
            </Text>
            <Text style={{ fontSize: limiteSize }} className="text-desactived-text" numberOfLines={1}>
              Limite: {FormatToCurrency(limite.valorLimite)}
              {aVencer > 0 ? ` · + ${FormatToCurrency(aVencer)} a vencer` : ""}
            </Text>
          </View>

          <View className="items-end flex-shrink-0">
            <Text style={{ fontSize: valorSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
              {FormatToCurrency(gasto)}
            </Text>
            <Text
              style={{ fontSize: percentualSize }}
              className={critico ? "text-error-color font-Inter-Medium" : "text-desactived-text"}
            >
              {percentual}%
            </Text>
          </View>
        </View>

        <View className="h-1.5 bg-lines-divisions rounded-full overflow-hidden">
          <View
            style={{ width: `${percentual}%`, backgroundColor: critico ? colors["error-color"] : cor }}
            className="h-full rounded-full"
          />
        </View>
      </View>

      <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
    </Pressable>
  );
});

function CategoriasOrcamentoBase({ anoExibido, mesExibido, onAbrirNovoLimite, onEditarLimite }: Props) {
  const colors = useThemeColors();
  // Recarrega quando uma transação é criada/editada/excluída sem
  // trocar de tela (ex: pelo "+" do footer).
  const { versaoDados } = useTransacoes();
  const cardTitleSize = moderateScale(15);
  const actionTextSize = moderateScale(12);
  const emptySize = moderateScale(12);

  const { limites, carregando, definirMesExibido, copiarLimitesDe } = useLimitesOrcamento();
  // Mês anterior com limites — oferecido para copiar quando este mês está vazio.
  const [mesParaCopiar, setMesParaCopiar] = useState<string | null>(null);
  const [copiando, setCopiando] = useState(false);

  // Mantém o contexto de limites apontando para o mês exibido no card.
  const mesAnoExibido = useMemo(
    () => `${anoExibido}-${String(mesExibido + 1).padStart(2, "0")}`,
    [anoExibido, mesExibido]
  );
  useEffect(() => {
    definirMesExibido(mesAnoExibido);
  }, [mesAnoExibido, definirMesExibido]);

  // Realizado por categoria no mês — reaproveita listarResumoPorCategoria
  // (GROUP BY no banco), sem query duplicada.
  const [gastoPorCategoria, setGastoPorCategoria] = useState<Map<string, number>>(new Map());
  const [aVencerPorCategoria, setAVencerPorCategoria] = useState<Map<string, number>>(new Map());
  const [carregandoGasto, setCarregandoGasto] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregandoGasto(true);

    const inicio = paraIso(anoExibido, mesExibido, 1);
    const fimObj = new Date(anoExibido, mesExibido + 1, 0);
    const fim = paraIso(fimObj.getFullYear(), fimObj.getMonth(), fimObj.getDate());

    Promise.all([listarResumoPorCategoria({ dataInicio: inicio, dataFim: fim }), somarCompromissosNaoPagosPorCategoria(inicio, fim)])
      .then(([linhas, aVencer]) => {
        if (!ativo) return;
        const mapa = new Map<string, number>();
        for (const linha of linhas) {
          if (linha.categoriaId) mapa.set(linha.categoriaId, linha.totalSaidas);
        }
        setGastoPorCategoria(mapa);
        setAVencerPorCategoria(aVencer);
      })
      .catch((e) => console.warn("[CategoriasOrcamento] Falha ao carregar dados:", e))
      .finally(() => {
        if (ativo) setCarregandoGasto(false);
      });

    return () => {
      ativo = false;
    };
  }, [anoExibido, mesExibido, versaoDados]);

  useEffect(() => {
    let ativo = true;
    if (carregando || limites.length > 0) return;
    obterMesAnteriorComLimites(mesAnoExibido)
      .then((mes) => {
        if (ativo) setMesParaCopiar(mes);
      })
      .catch((e) => console.warn("[CategoriasOrcamento] Falha ao buscar mês anterior:", e));
    return () => {
      ativo = false;
    };
  }, [carregando, limites.length, mesAnoExibido]);

  const handleCopiar = useCallback(async () => {
    if (!mesParaCopiar || copiando) return;
    setCopiando(true);
    try {
      await copiarLimitesDe(mesParaCopiar);
    } catch (e) {
      console.warn("[CategoriasOrcamento] Falha ao copiar limites:", e);
    } finally {
      setCopiando(false);
    }
  }, [mesParaCopiar, copiando, copiarLimitesDe]);

  const ocupado = carregando || carregandoGasto;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Categorias do orçamento
        </Text>
        <Pressable
          onPress={onAbrirNovoLimite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Adicionar limite de categoria"
          className="flex-row items-center gap-1"
        >
          <Ionicons name="add-circle-outline" color={colors["active-icon"]} size={16} />
          <Text style={{ fontSize: actionTextSize }} className="text-active-icon font-Inter-Medium">
            Editar categorias
          </Text>
        </Pressable>
      </View>

      {ocupado && limites.length === 0 ? (
        <View className="items-center py-8">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : limites.length === 0 ? (
        <View className="items-center py-8">
          <Ionicons name="pricetag-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: emptySize }} className="text-desactived-text text-center mt-2 px-6">
            Nenhum limite definido. Toque em + para escolher uma categoria.
          </Text>
          {mesParaCopiar && (
            <Pressable
              onPress={handleCopiar}
              disabled={copiando}
              style={{ borderColor: colors["active-icon"] }}
              className="mt-4 flex-row items-center gap-1.5 border rounded-lg px-3 py-2 active:opacity-70"
              accessibilityRole="button"
            >
              <Ionicons name="copy-outline" size={14} color={colors["active-icon"]} />
              <Text style={{ fontSize: emptySize, color: colors["active-icon"] }} className="font-Inter-Medium">
                {copiando ? "Copiando..." : `Copiar limites de ${rotuloMes(mesParaCopiar, anoExibido)}`}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        limites.map((limite, index) => (
          <ItemLimite
            key={limite.categoriaId}
            limite={limite}
            gasto={gastoPorCategoria.get(limite.categoriaId) ?? 0}
            aVencer={aVencerPorCategoria.get(limite.categoriaId) ?? 0}
            isLast={index === limites.length - 1}
            onPress={onEditarLimite}
          />
        ))
      )}
    </View>
  );
}

export const CategoriasOrcamento = memo(CategoriasOrcamentoBase);
