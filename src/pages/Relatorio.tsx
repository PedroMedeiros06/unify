import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors, PaletaCores } from "@/theme/useThemeColors";
import { CabecalhoTela } from "@/components/common/CabecalhoTela";
import { useNavigation } from "@/context/NavigationContext";
import { useTransacoes } from "@/context/TransacoesContext";
import {
  calcularResumoReceitasDespesas,
  listarResumoPorCategoria,
  listarMaioresGastos,
  GastoDestaque,
  ResumoReceitasDespesas,
} from "@/database/queries";
import { listarLimitesCategoria, LimiteCategoria } from "@/database/limitesCategoriaQueries";
import { obterCategoriaPorId } from "@/database/categorias";
import { FormatToCurrency } from "@/utils/formatNumber";
import { dataHojeIso, dataIsoParaBR } from "@/utils/dateUtils";

const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function deslocarMes(mesAno: string, delta: number): string {
  const [a, m] = mesAno.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function limitesDoMes(mesAno: string): { inicio: string; fim: string } {
  const [a, m] = mesAno.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return { inicio: `${mesAno}-01`, fim: `${mesAno}-${String(ultimo).padStart(2, "0")}` };
}

/** Variação % de `atual` sobre `anterior`; null se não há base. */
function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

type LinhaCategoria = { categoriaId: string | null; atual: number; anterior: number; delta: number };

type Dados = {
  resumo: ResumoReceitasDespesas;
  categorias: LinhaCategoria[];
  maiores: GastoDestaque[];
  estourados: { limite: LimiteCategoria; gasto: number }[];
};

/**
 * Relatório mensal: receitas, despesas e saldo do mês comparados ao mês
 * anterior, onde o gasto mais mudou por categoria, maiores gastos e
 * limites estourados. Transferências entre contas não entram.
 */
export function Relatorio() {
  const colors = useThemeColors();
  const { params } = useNavigation();
  const { versaoDados } = useTransacoes();

  const mesAtualReal = dataHojeIso().slice(0, 7);
  const [mesAno, setMesAno] = useState(params.mesRelatorio ?? mesAtualReal);
  const [dados, setDados] = useState<Dados | null>(null);
  // Mês cujos dados estão em `dados` — enquanto difere de `mesAno`, está carregando.
  const [mesCarregado, setMesCarregado] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const [a, m] = mesAno.split("-").map(Number);
    const { inicio, fim } = limitesDoMes(mesAno);
    const anterior = limitesDoMes(deslocarMes(mesAno, -1));

    (async () => {
      const resumo = await calcularResumoReceitasDespesas(a, m);
      const porCatAtual = await listarResumoPorCategoria({ dataInicio: inicio, dataFim: fim });
      const porCatAnterior = await listarResumoPorCategoria({ dataInicio: anterior.inicio, dataFim: anterior.fim });
      const maiores = await listarMaioresGastos(inicio, fim, 5);
      const limites = await listarLimitesCategoria(mesAno);

      const mapa = new Map<string | null, LinhaCategoria>();
      for (const r of porCatAtual) {
        if (r.totalSaidas <= 0) continue;
        mapa.set(r.categoriaId, { categoriaId: r.categoriaId, atual: r.totalSaidas, anterior: 0, delta: 0 });
      }
      for (const r of porCatAnterior) {
        if (r.totalSaidas <= 0) continue;
        const l = mapa.get(r.categoriaId) ?? { categoriaId: r.categoriaId, atual: 0, anterior: 0, delta: 0 };
        l.anterior = r.totalSaidas;
        mapa.set(r.categoriaId, l);
      }
      const categorias = [...mapa.values()]
        .map((l) => ({ ...l, delta: l.atual - l.anterior }))
        .sort((x, y) => y.atual - x.atual);

      const gastoPorCat = new Map(porCatAtual.map((r) => [r.categoriaId, r.totalSaidas]));
      const estourados = limites
        .map((limite) => ({ limite, gasto: gastoPorCat.get(limite.categoriaId) ?? 0 }))
        .filter((x) => x.gasto > x.limite.valorLimite);

      if (ativo) {
        setDados({ resumo, categorias, maiores, estourados });
        setMesCarregado(mesAno);
      }
    })().catch((e) => console.warn("[Relatorio] Falha ao carregar:", e));

    return () => {
      ativo = false;
    };
  }, [mesAno, versaoDados]);

  const carregando = mesCarregado !== mesAno || !dados;
  const [ano, mes] = mesAno.split("-").map(Number);
  const podeAvancar = mesAno < mesAtualReal;

  // Frases de destaque: as 2 categorias que mais subiram (com base).
  const destaques = useMemo(() => {
    if (!dados) return [];
    return dados.categorias
      .filter((c) => c.anterior > 0 && c.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 2)
      .map((c) => ({
        nome: obterCategoriaPorId(c.categoriaId)?.nome ?? "Sem categoria",
        pct: variacao(c.atual, c.anterior) ?? 0,
        delta: c.delta,
      }));
  }, [dados]);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-col gap-4">
        <CabecalhoTela titulo="Relatório do mês" subtitulo="Comparado ao mês anterior. Transferências não entram." />

        {/* Seletor de mês */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setMesAno((m) => deslocarMes(m, -1))} hitSlop={10} accessibilityLabel="Mês anterior">
            <Ionicons name="chevron-back" size={22} color={colors["main-text"]} />
          </Pressable>
          <Text style={{ fontSize: moderateScale(16), color: colors["main-text"] }} className="font-Inter-SemiBold">
            {NOMES_MES[mes - 1]} {ano}
          </Text>
          <Pressable
            onPress={() => podeAvancar && setMesAno((m) => deslocarMes(m, 1))}
            disabled={!podeAvancar}
            hitSlop={10}
            accessibilityLabel="Próximo mês"
          >
            <Ionicons name="chevron-forward" size={22} color={podeAvancar ? colors["main-text"] : colors["desactived-text"]} />
          </Pressable>
        </View>

        {carregando ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors["active-icon"]} />
          </View>
        ) : (
          <ConteudoRelatorio dados={dados!} destaques={destaques} colors={colors} />
        )}
      </View>
    </ScrollView>
  );
}

function ConteudoRelatorio({
  dados,
  destaques,
  colors,
}: {
  dados: Dados;
  destaques: { nome: string; pct: number; delta: number }[];
  colors: PaletaCores;
}) {
  const { resumo, categorias, maiores, estourados } = dados;
  const saldo = resumo.receitasMesAtual - resumo.despesasMesAtual;
  const saldoAnterior = resumo.receitasMesAnterior - resumo.despesasMesAnterior;
  const varDespesas = variacao(resumo.despesasMesAtual, resumo.despesasMesAnterior);
  const varReceitas = variacao(resumo.receitasMesAtual, resumo.receitasMesAnterior);
  const maxCategoria = Math.max(1, ...categorias.map((c) => Math.max(c.atual, c.anterior)));

  const cartao = { backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] };
  const titulo = (t: string) => (
    <Text style={{ fontSize: moderateScale(14), color: colors["main-text"] }} className="font-Inter-Medium mb-2">
      {t}
    </Text>
  );
  const pill = (pct: number | null, inverso: boolean) => {
    if (pct === null) return null;
    // Despesa subir é ruim (vermelho); receita subir é bom (verde).
    const bom = inverso ? pct <= 0 : pct >= 0;
    return (
      <Text style={{ fontSize: moderateScale(11), color: bom ? colors["sucess-color"] : colors["error-color"] }}>
        {pct > 0 ? "+" : ""}
        {pct}% vs mês anterior
      </Text>
    );
  };

  if (resumo.receitasMesAtual === 0 && resumo.despesasMesAtual === 0) {
    return (
      <View style={cartao} className="border rounded-xl p-6 items-center">
        <Ionicons name="bar-chart-outline" size={28} color={colors["desactived-text"]} />
        <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }} className="text-center mt-2">
          Nenhuma transação neste mês.
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Totais */}
      <View style={cartao} className="border rounded-xl p-4">
        <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>Saldo do mês</Text>
        <Text
          style={{ fontSize: moderateScale(26), color: saldo < 0 ? colors["error-color"] : colors["main-text"] }}
          className="font-Inter-Bold"
        >
          {FormatToCurrency(saldo)}
        </Text>
        <Text style={{ fontSize: moderateScale(11), color: colors["desactived-text"] }}>
          Mês anterior: {FormatToCurrency(saldoAnterior)}
        </Text>
        <View className="flex-row gap-3 mt-3">
          <View style={{ backgroundColor: `${colors["sucess-color"]}1A` }} className="flex-1 rounded-lg p-3">
            <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }}>Entrou</Text>
            <Text style={{ fontSize: moderateScale(15), color: colors["sucess-color"] }} className="font-Inter-SemiBold">
              {FormatToCurrency(resumo.receitasMesAtual)}
            </Text>
            {pill(varReceitas, false)}
          </View>
          <View style={{ backgroundColor: `${colors["error-color"]}1A` }} className="flex-1 rounded-lg p-3">
            <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }}>Saiu</Text>
            <Text style={{ fontSize: moderateScale(15), color: colors["error-color"] }} className="font-Inter-SemiBold">
              {FormatToCurrency(resumo.despesasMesAtual)}
            </Text>
            {pill(varDespesas, true)}
          </View>
        </View>
      </View>

      {/* Destaques em frases */}
      {destaques.length > 0 && (
        <View style={cartao} className="border rounded-xl p-4 gap-2">
          {titulo("O que mudou")}
          {destaques.map((d) => (
            <View key={d.nome} className="flex-row items-start gap-2">
              <Ionicons name="trending-up" size={15} color={colors["warn-color"]} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="flex-1">
                Você gastou {d.pct}% a mais em <Text className="font-Inter-SemiBold">{d.nome}</Text> (+
                {FormatToCurrency(d.delta)}).
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Por categoria: barra atual x anterior */}
      {categorias.length > 0 && (
        <View style={cartao} className="border rounded-xl p-4">
          {titulo("Gastos por categoria")}
          {categorias.map((c) => {
            const cat = obterCategoriaPorId(c.categoriaId);
            const cor = cat?.cor ?? colors["desactived-text"];
            const pct = variacao(c.atual, c.anterior);
            return (
              <View key={c.categoriaId ?? "sem"} className="mb-3">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name={cat?.icone ?? "help-circle-outline"} size={14} color={cor} />
                  <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="flex-1" numberOfLines={1}>
                    {cat?.nome ?? "Sem categoria"}
                  </Text>
                  <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="font-Inter-Medium">
                    {FormatToCurrency(c.atual)}
                  </Text>
                  {pct !== null && (
                    <Text
                      style={{
                        fontSize: moderateScale(10),
                        color: pct > 0 ? colors["error-color"] : colors["sucess-color"],
                        width: 44,
                        textAlign: "right",
                      }}
                    >
                      {pct > 0 ? "+" : ""}
                      {pct}%
                    </Text>
                  )}
                </View>
                <View style={{ backgroundColor: colors["lines-divisions"] }} className="h-1.5 rounded-full overflow-hidden">
                  <View style={{ width: `${(c.atual / maxCategoria) * 100}%`, backgroundColor: cor }} className="h-full rounded-full" />
                </View>
                {c.anterior > 0 && (
                  <View className="h-1 rounded-full overflow-hidden mt-0.5" style={{ backgroundColor: "transparent" }}>
                    <View
                      style={{ width: `${(c.anterior / maxCategoria) * 100}%`, backgroundColor: `${cor}55` }}
                      className="h-full rounded-full"
                    />
                  </View>
                )}
              </View>
            );
          })}
          <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }}>
            Barra fina = mês anterior.
          </Text>
        </View>
      )}

      {/* Limites estourados */}
      {estourados.length > 0 && (
        <View style={cartao} className="border rounded-xl p-4">
          {titulo("Limites estourados")}
          {estourados.map(({ limite, gasto }) => (
            <Text key={limite.categoriaId} style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="mb-1">
              {obterCategoriaPorId(limite.categoriaId)?.nome ?? limite.categoriaId}: {FormatToCurrency(gasto)} de{" "}
              {FormatToCurrency(limite.valorLimite)}{" "}
              <Text style={{ color: colors["error-color"] }}>(+{FormatToCurrency(gasto - limite.valorLimite)})</Text>
            </Text>
          ))}
        </View>
      )}

      {/* Maiores gastos */}
      {maiores.length > 0 && (
        <View style={cartao} className="border rounded-xl p-4">
          {titulo("Maiores gastos")}
          {maiores.map((g) => {
            const cat = obterCategoriaPorId(g.categoriaId);
            return (
              <View key={g.id} className="flex-row items-center gap-2 py-1.5">
                <Ionicons name={cat?.icone ?? "help-circle-outline"} size={14} color={cat?.cor ?? colors["desactived-text"]} />
                <View className="flex-1">
                  <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} numberOfLines={1}>
                    {g.nome}
                  </Text>
                  <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }}>{dataIsoParaBR(g.data)}</Text>
                </View>
                <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="font-Inter-Medium">
                  {FormatToCurrency(g.valor)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}
