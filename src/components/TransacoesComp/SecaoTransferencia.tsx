import { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { useContas } from "@/context/ContasContext";
import { useDialogo } from "@/context/DialogoContext";
import { SeletorConta, SeloConta } from "@/components/ContasComp/SeletorConta";
import { obterTransferencia, PernasTransferencia } from "@/database/contasQueries";

type PropsInfo = {
  transferenciaId: string;
  desabilitado: boolean;
  // Chamado depois de desfazer — o modal fecha (a transação mudou de natureza).
  onDesfeita: () => void;
};

/**
 * Cabeçalho do modal de edição quando a transação é uma perna de
 * transferência: mostra "Conta A -> Conta B" e oferece desfazer o
 * vínculo (as duas linhas voltam a ser entrada/saída comuns).
 */
function InfoTransferenciaBase({ transferenciaId, desabilitado, onDesfeita }: PropsInfo) {
  const colors = useThemeColors();
  const { obterConta, desfazerTransferencia } = useContas();
  const { confirmar } = useDialogo();
  const [pernas, setPernas] = useState<PernasTransferencia | null>(null);

  useEffect(() => {
    let ativo = true;
    obterTransferencia(transferenciaId)
      .then((p) => {
        if (ativo) setPernas(p);
      })
      .catch((e) => console.warn("[InfoTransferencia] Falha ao carregar:", e));
    return () => {
      ativo = false;
    };
  }, [transferenciaId]);

  const origem = pernas?.saida ? obterConta(pernas.saida.bancoId) : undefined;
  const destino = pernas?.entrada ? obterConta(pernas.entrada.bancoId) : undefined;

  const desfazer = useCallback(async () => {
    const ok = await confirmar({
      titulo: "Desfazer transferência?",
      mensagem:
        "As duas transações continuam existindo, mas voltam a contar como entrada e saída comuns (em receitas, despesas e orçamento).",
      textoConfirmar: "Desfazer",
    });
    if (!ok) return;
    await desfazerTransferencia(transferenciaId);
    onDesfeita();
  }, [confirmar, desfazerTransferencia, transferenciaId, onDesfeita]);

  return (
    <View
      style={{ backgroundColor: `${colors["active-icon"]}14`, borderColor: `${colors["active-icon"]}55` }}
      className="border rounded-xl p-3 mb-4"
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="swap-horizontal" size={14} color={colors["active-icon"]} />
        <Text style={{ fontSize: moderateScale(12), color: colors["active-icon"] }} className="font-Inter-Medium">
          Transferência entre suas contas
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {origem && <SeloConta sigla={origem.sigla} cor={origem.cor} tamanho={22} />}
        <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="flex-shrink" numberOfLines={1}>
          {origem?.nome ?? "?"}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors["second-text"]} />
        {destino && <SeloConta sigla={destino.sigla} cor={destino.cor} tamanho={22} />}
        <Text style={{ fontSize: moderateScale(12), color: colors["main-text"] }} className="flex-shrink" numberOfLines={1}>
          {destino?.nome ?? "?"}
        </Text>
      </View>
      <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }} className="mt-2">
        Valor e data editados aqui valem para as duas pontas. Não entra em receitas, despesas nem orçamento.
      </Text>
      <Pressable onPress={desfazer} disabled={desabilitado} hitSlop={6} className="mt-2 self-start">
        <Text style={{ fontSize: moderateScale(11), color: colors["active-icon"] }} className="font-Inter-Medium">
          Não é transferência? Desfazer
        </Text>
      </Pressable>
    </View>
  );
}

export const InfoTransferencia = memo(InfoTransferenciaBase);

type PropsConverter = {
  transacaoId: string;
  bancoId: string | undefined;
  tipo: "entrada" | "saida";
  desabilitado: boolean;
  onConvertida: () => void;
};

/**
 * "Isto é uma transferência entre minhas contas?" — escolhe a outra
 * conta; o app procura a contrapartida (mesmo valor, até 3 dias) e liga
 * as duas, ou cria a perna que falta.
 */
function ConverterEmTransferenciaBase({ transacaoId, bancoId, tipo, desabilitado, onConvertida }: PropsConverter) {
  const colors = useThemeColors();
  const { converterEmTransferencia } = useContas();
  const { confirmar, avisar } = useDialogo();
  const [aberto, setAberto] = useState(false);

  const converter = useCallback(
    async (outraContaId: string, outraNome: string) => {
      const ok = await confirmar({
        titulo: "Marcar como transferência?",
        mensagem:
          tipo === "saida"
            ? `Esta saída vira uma transferência para ${outraNome}. Se a entrada correspondente já existir lá, as duas são ligadas; senão, ela é criada.`
            : `Esta entrada vira uma transferência vinda de ${outraNome}. Se a saída correspondente já existir lá, as duas são ligadas; senão, ela é criada.`,
        textoConfirmar: "Marcar",
      });
      if (!ok) return;
      try {
        const r = await converterEmTransferencia(transacaoId, outraContaId);
        await avisar({
          titulo: "Pronto",
          mensagem: r.criouContrapartida
            ? `Criamos a contrapartida em ${outraNome}.`
            : `Encontramos a contrapartida em ${outraNome} e ligamos as duas.`,
        });
        onConvertida();
      } catch (e) {
        await avisar({ titulo: "Não foi possível marcar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
      }
    },
    [confirmar, tipo, converterEmTransferencia, transacaoId, avisar, onConvertida]
  );

  if (!aberto) {
    return (
      <Pressable
        onPress={() => setAberto(true)}
        disabled={desabilitado}
        className="flex-row items-center gap-1.5 mb-4 -mt-1"
        hitSlop={6}
        accessibilityRole="button"
      >
        <Ionicons name="swap-horizontal-outline" size={14} color={colors["active-icon"]} />
        <Text style={{ fontSize: moderateScale(11), color: colors["active-icon"] }}>
          É transferência entre suas contas?
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="mb-4">
      <SeletorConta
        label={tipo === "saida" ? "Foi para qual conta?" : "Veio de qual conta?"}
        contaId={null}
        excluirId={bancoId}
        onSelecionar={(c) => converter(c.id, c.nome)}
        desabilitado={desabilitado}
      />
    </View>
  );
}

export const ConverterEmTransferencia = memo(ConverterEmTransferenciaBase);
