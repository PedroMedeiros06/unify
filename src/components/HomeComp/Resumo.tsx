import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { FormatToCurrency } from "@/utils/formatNumber";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/HomeComp/Sparkline";
import { BancosConectados, BancoComSaldo } from "@/components/HomeComp/BancosConectados";
import { useNavigation } from "@/context/NavigationContext";
import { useTransacoes } from "@/context/TransacoesContext";
import { useContas } from "@/context/ContasContext";
import { calcularSaldoAcumuladoAte, listarSerieSaldoDiario } from "@/database/queries";

const DIAS_SPARKLINE = 30;

function maskCurrency(formatted: string) {
  return formatted.replace(/[0-9]/g, "•");
}

/** "aaaa-mm-dd" de hoje, um mês atrás no calendário (mesmo dia-do-mês). */
function dataMesAnteriorIso(): string {
  const hoje = new Date();
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
  const ano = mesAnterior.getFullYear();
  const mes = String(mesAnterior.getMonth() + 1).padStart(2, "0");
  const dia = String(mesAnterior.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function ResumoBase() {
  const colors = useThemeColors();
  const title = moderateScale(28);
  const subtilte = moderateScale(12);

  const [visible, setVisible] = useState(true);
  const { navigate } = useNavigation();
  // Sobe a cada transação criada/editada/excluída — refaz saldo e
  // sparkline sem precisar sair e voltar para a Home.
  const { versaoDados } = useTransacoes();

  // Saldo de cada conta (saldo inicial + entradas - saídas, com
  // transferências) vem do ContasContext, que já recarrega a cada
  // mudança de transação.
  const { contas, carregando } = useContas();
  const [bancosSelecionados, setBancosSelecionados] = useState<string[]>([]);

  const [saldoMesAnterior, setSaldoMesAnterior] = useState<number | null>(null);
  const [historicoSaldo, setHistoricoSaldo] = useState<number[]>([]);

  // undefined = "sem filtro" para as queries (todos os bancos); só
  // manda a lista quando há seleção ativa.
  const filtroBancos = bancosSelecionados.length > 0 ? bancosSelecionados : undefined;

  // Variação % e Sparkline recalculam sempre que o filtro de banco
  // muda — ambos precisam refletir só os bancos selecionados, igual ao
  // saldo principal.
  useEffect(() => {
    let ativo = true;

    async function carregarSerieETendencia() {
      const [saldoAnterior, serie] = await Promise.all([
        calcularSaldoAcumuladoAte(dataMesAnteriorIso(), filtroBancos),
        listarSerieSaldoDiario(DIAS_SPARKLINE, filtroBancos),
      ]);

      if (!ativo) return;
      setSaldoMesAnterior(saldoAnterior);
      setHistoricoSaldo(serie.map((p) => p.saldoAcumulado));
    }

    carregarSerieETendencia().catch((e) => console.warn("[Resumo] Falha ao carregar dados:", e));

    return () => {
      ativo = false;
    };
    // filtroBancos é derivado de bancosSelecionados a cada render; usar
    // o array diretamente como dependência causaria re-fetch infinito
    // (nova referência a cada render), então dependemos do conteúdo via
    // join — comparação estável o bastante para uma lista de poucos ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancosSelecionados.join(","), versaoDados]);

  const handleToggleVisible = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const handleImportarExtrato = useCallback(() => {
    navigate("importarExtrato");
  }, [navigate]);

  const handleAlternarBanco = useCallback((bancoId: string) => {
    setBancosSelecionados((prev) =>
      prev.includes(bancoId) ? prev.filter((id) => id !== bancoId) : [...prev, bancoId]
    );
  }, []);

  // Contas que aparecem no card: não arquivadas e com algum movimento
  // ou saldo (conta do catálogo nunca usada não polui os chips).
  const contasVisiveis = useMemo(
    () => contas.filter((c) => !c.arquivada && (c.quantidadeTransacoes > 0 || Math.abs(c.saldo) >= 0.01)),
    [contas]
  );

  // Nenhuma selecionada = considera todas (regra explícita: sem filtro
  // ativo, o resumo mostra a soma de todas as contas). O saldo é
  // recalculado a partir das contas selecionadas — não é filtro visual.
  const saldoAtual = useMemo(
    () =>
      contasVisiveis
        .filter((c) => bancosSelecionados.length === 0 || bancosSelecionados.includes(c.id))
        .reduce((acc, c) => acc + c.saldo, 0),
    [contasVisiveis, bancosSelecionados]
  );

  // Variação: saldo acumulado até hoje vs saldo acumulado até o mesmo
  // dia do mês anterior. Se o saldo do mês anterior for 0 (ex: conta
  // nova, sem histórico naquela data), não há base para % — omite a
  // variação em vez de dividir por zero.
  const variacaoPercentual =
    saldoMesAnterior !== null && saldoMesAnterior !== 0
      ? Math.round(((saldoAtual - saldoMesAnterior) / Math.abs(saldoMesAnterior)) * 100)
      : null;

  const bancosParaChips: BancoComSaldo[] = contasVisiveis.map((c) => ({
    id: c.id,
    nome: c.nome,
    sigla: c.sigla,
    cor: c.cor,
  }));

  const saldoFormatado = FormatToCurrency(saldoAtual);
  const saldoExibido = visible ? saldoFormatado : maskCurrency(saldoFormatado);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl">
      {/* Header */}
      <View className="pl-5 py-1.5 pr-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontSize: subtilte }} className="text-main-text font-Inter-Medium">
            Saldo total consolidado
          </Text>
          <Pressable
            onPress={handleToggleVisible}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar saldo" : "Mostrar saldo"}
          >
            <Ionicons name={visible ? "eye-off" : "eye"} color={colors["main-text"]} size={10} />
          </Pressable>
        </View>
        <View className="flex-row items-center">
        <Pressable
          onPress={() => navigate("contas")}
          className="p-2 active:opacity-60"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Minhas contas"
        >
          <Ionicons name="wallet-outline" color={colors["second-text"]} size={20} />
        </Pressable>
        <Pressable
          onPress={handleImportarExtrato}
          className="p-2 active:opacity-60"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Importar extrato"
        >
          <Ionicons name="document-attach-outline" color={colors["second-text"]} size={20} />
        </Pressable>
        </View>
      </View>

      {/* Body */}
      <View className="px-4 pb-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text
              style={{ fontSize: title, letterSpacing: title * -0.04 }}
              className="text-main-text font-Inter-Bold"
              numberOfLines={1}
            >
              {carregando ? "···" : saldoExibido}
            </Text>

            {variacaoPercentual !== null && (
              <View className="flex-row items-center gap-1.5 mt-1">
                <Text
                  style={{ fontSize: subtilte }}
                  className={variacaoPercentual >= 0 ? "text-sucess-color font-Inter-SemiBold" : "text-error-color font-Inter-SemiBold"}
                >
                  {visible ? `${variacaoPercentual >= 0 ? "+" : ""}${variacaoPercentual}%` : "••%"}
                </Text>
                <Text style={{ fontSize: subtilte }} className="text-second-text">
                  em relação ao mês anterior
                </Text>
              </View>
            )}
          </View>

          {historicoSaldo.length > 1 && (
            <Sparkline data={historicoSaldo} width={110} height={50} />
          )}
        </View>

        <View className="mt-3">
          <BancosConectados
            bancos={bancosParaChips}
            bancosSelecionados={bancosSelecionados}
            onAlternarBanco={handleAlternarBanco}
          />
        </View>
      </View>
    </View>
  );
}

export const Resumo = memo(ResumoBase);