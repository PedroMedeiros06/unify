import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { CabecalhoTela } from "@/components/common/CabecalhoTela";
import { SeloConta } from "@/components/ContasComp/SeletorConta";
import { ContaFormModal } from "@/components/ContasComp/ContaFormModal";
import { AjustarSaldoModal } from "@/components/ContasComp/AjustarSaldoModal";
import { useContas } from "@/context/ContasContext";
import { useNovaTransacao } from "@/context/NovaTransacaoContext";
import { useDialogo } from "@/context/DialogoContext";
import { calcularFaturaAtual, ContaComSaldo, ResumoFatura, TipoConta } from "@/database/contasQueries";
import { FormatToCurrency } from "@/utils/formatNumber";
import { dataIsoParaBR } from "@/utils/dateUtils";

/**
 * Minhas contas: saldo de cada conta/cartão, criação de contas
 * personalizadas ("Outro banco", carteira, cartão de crédito),
 * transferências, ajuste de saldo e fatura do cartão.
 */
export function Contas() {
  const colors = useThemeColors();
  const { contas, arquivarConta, excluirConta } = useContas();
  const { abrirTransferencia } = useNovaTransacao();
  const { confirmar, avisar } = useDialogo();

  const [expandida, setExpandida] = useState<string | null>(null);
  const [form, setForm] = useState<{ aberto: boolean; conta: ContaComSaldo | null; tipo: TipoConta }>({
    aberto: false,
    conta: null,
    tipo: "conta",
  });
  const [ajuste, setAjuste] = useState<ContaComSaldo | null>(null);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [faturas, setFaturas] = useState<Record<string, ResumoFatura>>({});

  const ativas = useMemo(() => contas.filter((c) => !c.arquivada), [contas]);
  const arquivadas = useMemo(() => contas.filter((c) => c.arquivada), [contas]);

  // Fatura aberta de cada cartão — recalcula quando as contas (saldos) mudam.
  useEffect(() => {
    let ativo = true;
    const cartoes = contas.filter((c) => c.tipo === "cartao");
    (async () => {
      const resultado: Record<string, ResumoFatura> = {};
      for (const c of cartoes) {
        const f = await calcularFaturaAtual(c);
        if (f) resultado[c.id] = f;
      }
      if (ativo) setFaturas(resultado);
    })().catch((e) => console.warn("[Contas] Falha ao calcular faturas:", e));
    return () => {
      ativo = false;
    };
  }, [contas]);

  const totalContas = ativas.filter((c) => c.tipo === "conta").reduce((s, c) => s + c.saldo, 0);
  const dividaCartoes = ativas.filter((c) => c.tipo === "cartao").reduce((s, c) => s + Math.max(0, -c.saldo), 0);
  // Arquivadas ainda guardam dinheiro (se tiverem saldo) — entram no patrimônio.
  const patrimonio = contas.reduce((s, c) => s + c.saldo, 0);

  const handleArquivar = useCallback(
    async (c: ContaComSaldo) => {
      if (!c.arquivada && Math.abs(c.saldo) >= 0.01) {
        const ok = await confirmar({
          titulo: "Arquivar conta com saldo?",
          mensagem: `${c.nome} ainda tem ${FormatToCurrency(c.saldo)}. Arquivada, ela some dos seletores, mas o saldo continua no total.`,
          textoConfirmar: "Arquivar",
        });
        if (!ok) return;
      }
      await arquivarConta(c.id, !c.arquivada);
      setExpandida(null);
    },
    [arquivarConta, confirmar]
  );

  const handleExcluir = useCallback(
    async (c: ContaComSaldo) => {
      const ok = await confirmar({
        titulo: "Excluir conta?",
        mensagem: `${c.nome} será removida. Não é possível desfazer.`,
        textoConfirmar: "Excluir",
        destrutivo: true,
      });
      if (!ok) return;
      try {
        await excluirConta(c.id);
      } catch (e) {
        await avisar({ titulo: "Não foi possível excluir", mensagem: e instanceof Error ? e.message : "Tente novamente." });
      }
    },
    [confirmar, excluirConta, avisar]
  );

  const pagarFatura = useCallback(
    (c: ContaComSaldo) => {
      const devido = Math.max(0, -c.saldo);
      const origemPadrao = ativas.find((a) => a.tipo === "conta" && a.saldo > 0)?.id ?? null;
      abrirTransferencia({
        titulo: "Pagar fatura",
        origemId: origemPadrao,
        destinoId: c.id,
        valor: Math.round(devido * 100) / 100,
        descricao: `Pagamento da fatura ${c.nome}`,
      });
    },
    [ativas, abrirTransferencia]
  );

  const acao = (icone: keyof typeof Ionicons.glyphMap, rotulo: string, onPress: () => void, destrutiva = false) => (
    <Pressable
      key={rotulo}
      onPress={onPress}
      style={{ backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
      className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg border active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={rotulo}
    >
      <Ionicons name={icone} size={14} color={destrutiva ? colors["error-color"] : colors["active-icon"]} />
      <Text style={{ fontSize: moderateScale(12), color: destrutiva ? colors["error-color"] : colors["main-text"] }}>
        {rotulo}
      </Text>
    </Pressable>
  );

  const renderConta = (c: ContaComSaldo) => {
    const aberta = expandida === c.id;
    const fatura = faturas[c.id];
    const ehCartao = c.tipo === "cartao";
    const corSaldo = c.saldo < 0 ? colors["error-color"] : colors["main-text"];

    return (
      <View
        key={c.id}
        style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
        className="border rounded-xl"
      >
        <Pressable
          onPress={() => setExpandida(aberta ? null : c.id)}
          className="flex-row items-center gap-3 p-4 active:opacity-80"
          accessibilityRole="button"
          accessibilityState={{ expanded: aberta }}
          accessibilityLabel={`${c.nome}, saldo ${FormatToCurrency(c.saldo)}`}
        >
          <SeloConta sigla={c.sigla} cor={c.cor} tamanho={36} />
          <View className="flex-1">
            <Text style={{ fontSize: moderateScale(14), color: colors["main-text"] }} className="font-Inter-Medium" numberOfLines={1}>
              {c.nome}
            </Text>
            <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>
              {ehCartao
                ? fatura
                  ? `Fecha ${dataIsoParaBR(fatura.fechamento).slice(0, 5)} • vence ${dataIsoParaBR(fatura.vencimento).slice(0, 5)}`
                  : "Cartão de crédito"
                : `${c.quantidadeTransacoes} transaç${c.quantidadeTransacoes === 1 ? "ão" : "ões"}`}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ fontSize: moderateScale(14), color: corSaldo }} className="font-Inter-SemiBold">
              {ehCartao ? FormatToCurrency(Math.max(0, -c.saldo)) : FormatToCurrency(c.saldo)}
            </Text>
            <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }}>
              {ehCartao ? "devido" : "saldo"}
            </Text>
          </View>
        </Pressable>

        {ehCartao && fatura && (
          <View style={{ borderColor: colors["lines-divisions"] }} className="border-t px-4 py-2.5 flex-row justify-between">
            <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>Fatura aberta</Text>
            <Text style={{ fontSize: moderateScale(11), color: colors["main-text"] }} className="font-Inter-Medium">
              {FormatToCurrency(fatura.totalCompras)}
            </Text>
          </View>
        )}

        {aberta && (
          <View style={{ borderColor: colors["lines-divisions"] }} className="border-t px-4 py-3 flex-row flex-wrap gap-2">
            {ehCartao && acao("card-outline", "Pagar fatura", () => pagarFatura(c))}
            {!c.arquivada && acao("swap-horizontal-outline", "Transferir", () => abrirTransferencia({ origemId: ehCartao ? null : c.id, destinoId: ehCartao ? c.id : null }))}
            {acao("create-outline", "Ajustar saldo", () => setAjuste(c))}
            {c.personalizada && acao("pencil-outline", "Editar", () => setForm({ aberto: true, conta: c, tipo: c.tipo }))}
            {acao(c.arquivada ? "arrow-undo-outline" : "archive-outline", c.arquivada ? "Desarquivar" : "Arquivar", () => handleArquivar(c))}
            {c.personalizada && c.quantidadeTransacoes === 0 && acao("trash-outline", "Excluir", () => handleExcluir(c), true)}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-col gap-4">
        <CabecalhoTela titulo="Minhas contas" subtitulo="Saldos, cartões e transferências entre suas contas." />

        {/* Resumo */}
        <View
          style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
          className="border rounded-xl p-4"
        >
          <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>Patrimônio líquido</Text>
          <Text
            style={{ fontSize: moderateScale(26), color: patrimonio < 0 ? colors["error-color"] : colors["main-text"] }}
            className="font-Inter-Bold"
          >
            {FormatToCurrency(patrimonio)}
          </Text>
          <View className="flex-row gap-3 mt-3">
            <View style={{ backgroundColor: `${colors["sucess-color"]}1A` }} className="flex-1 rounded-lg px-3 py-2">
              <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }}>Em contas</Text>
              <Text style={{ fontSize: moderateScale(13), color: colors["sucess-color"] }} className="font-Inter-SemiBold">
                {FormatToCurrency(totalContas)}
              </Text>
            </View>
            <View style={{ backgroundColor: `${colors["error-color"]}1A` }} className="flex-1 rounded-lg px-3 py-2">
              <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }}>Devido em cartões</Text>
              <Text style={{ fontSize: moderateScale(13), color: colors["error-color"] }} className="font-Inter-SemiBold">
                {FormatToCurrency(dividaCartoes)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ações principais */}
        <View className="flex-row gap-2">
          {[
            { icone: "add-circle-outline" as const, rotulo: "Nova conta", onPress: () => setForm({ aberto: true, conta: null, tipo: "conta" }) },
            { icone: "card-outline" as const, rotulo: "Novo cartão", onPress: () => setForm({ aberto: true, conta: null, tipo: "cartao" }) },
            { icone: "swap-horizontal-outline" as const, rotulo: "Transferir", onPress: () => abrirTransferencia() },
          ].map((b) => (
            <Pressable
              key={b.rotulo}
              onPress={b.onPress}
              style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
              className="flex-1 border rounded-xl py-3 items-center gap-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={b.rotulo}
            >
              <Ionicons name={b.icone} size={18} color={colors["active-icon"]} />
              <Text style={{ fontSize: moderateScale(11), color: colors["main-text"] }}>{b.rotulo}</Text>
            </Pressable>
          ))}
        </View>

        <View className="gap-2">{ativas.map(renderConta)}</View>

        {arquivadas.length > 0 && (
          <View className="gap-2">
            <Pressable onPress={() => setMostrarArquivadas((v) => !v)} className="flex-row items-center gap-1.5 py-1" hitSlop={6}>
              <Ionicons name={mostrarArquivadas ? "chevron-down" : "chevron-forward"} size={14} color={colors["second-text"]} />
              <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>
                Arquivadas ({arquivadas.length})
              </Text>
            </Pressable>
            {mostrarArquivadas && arquivadas.map(renderConta)}
          </View>
        )}

        <Text style={{ fontSize: moderateScale(11), color: colors["desactived-text"] }} className="px-1">
          Transferências e pagamentos de fatura não entram em receitas, despesas nem no orçamento — só movem saldo
          entre suas contas. Compras no cartão contam como despesa no dia da compra.
        </Text>
      </View>

      <ContaFormModal
        visivel={form.aberto}
        conta={form.conta}
        tipoInicial={form.tipo}
        onFechar={() => setForm((f) => ({ ...f, aberto: false }))}
      />
      <AjustarSaldoModal visivel={!!ajuste} conta={ajuste} onFechar={() => setAjuste(null)} />
    </ScrollView>
  );
}
