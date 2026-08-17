import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { FormatToCurrency } from "@/utils/formatNumber";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Sparkline } from "@/components/HomeComp/Sparkline";
import { BancosConectados, BancoComSaldo } from "@/components/HomeComp/BancosConectados";
import { useNavigation } from "@/context/NavigationContext";
import {
  listarResumoPorBanco,
  calcularSaldoAcumuladoAte,
  listarSerieSaldoDiario,
  ResumoPorBanco,
} from "@/database/queries";

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
  const title = moderateScale(28);
  const subtilte = moderateScale(12);

  const [visible, setVisible] = useState(true);
  const { navigate } = useNavigation();

  const [resumoBancos, setResumoBancos] = useState<ResumoPorBanco[]>([]);
  const [bancosSelecionados, setBancosSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [saldoMesAnterior, setSaldoMesAnterior] = useState<number | null>(null);
  const [historicoSaldo, setHistoricoSaldo] = useState<number[]>([]);

  // undefined = "sem filtro" para as queries (todos os bancos); só
  // manda a lista quando há seleção ativa.
  const filtroBancos = bancosSelecionados.length > 0 ? bancosSelecionados : undefined;

  const carregarResumo = useCallback(async () => {
    setCarregando(true);
    try {
      // listarResumoPorBanco faz INNER JOIN a partir de transacoes, então
      // só retorna bancos que têm ao menos uma transação real — é assim
      // que "Banco do Brasil sem dados não aparece" é garantido, sem
      // precisar de nenhuma query nova ou tabela de controle de bancos.
      const resumo = await listarResumoPorBanco();
      setResumoBancos(resumo);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

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

    carregarSerieETendencia();

    return () => {
      ativo = false;
    };
    // filtroBancos é derivado de bancosSelecionados a cada render; usar
    // o array diretamente como dependência causaria re-fetch infinito
    // (nova referência a cada render), então dependemos do conteúdo via
    // join — comparação estável o bastante para uma lista de poucos ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancosSelecionados.join(",")]);

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

  // Nenhum banco selecionado = considera todos (regra explícita: sem
  // filtro ativo, o resumo mostra a soma de todos os bancos com dados).
  const resumoConsiderado = useMemo(
    () =>
      bancosSelecionados.length === 0
        ? resumoBancos
        : resumoBancos.filter((r) => bancosSelecionados.includes(r.bancoId)),
    [resumoBancos, bancosSelecionados]
  );

  // Saldo = soma de (entradas - saídas) de cada banco considerado. Não é
  // filtro visual: o valor exibido é de fato recalculado a partir dos
  // bancos atualmente selecionados.
  const saldoAtual = resumoConsiderado.reduce(
    (acc, r) => acc + (r.totalEntradas - r.totalSaidas),
    0
  );

  // Variação: saldo acumulado até hoje vs saldo acumulado até o mesmo
  // dia do mês anterior. Se o saldo do mês anterior for 0 (ex: conta
  // nova, sem histórico naquela data), não há base para % — omite a
  // variação em vez de dividir por zero.
  const variacaoPercentual =
    saldoMesAnterior !== null && saldoMesAnterior !== 0
      ? Math.round(((saldoAtual - saldoMesAnterior) / Math.abs(saldoMesAnterior)) * 100)
      : null;

  const bancosParaChips: BancoComSaldo[] = resumoBancos.map((r) => ({
    id: r.bancoId,
    nome: r.bancoNome,
    sigla: r.bancoSigla,
    cor: r.bancoCor,
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