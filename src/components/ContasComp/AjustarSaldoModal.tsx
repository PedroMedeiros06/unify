import { memo, useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { CampoValor } from "@/components/common/CampoValor";
import { useContas } from "@/context/ContasContext";
import { useDialogo } from "@/context/DialogoContext";
import { ContaComSaldo } from "@/database/contasQueries";
import { FormatToCurrency } from "@/utils/formatNumber";
import { useChaveAbertura } from "@/hooks/useChaveAbertura";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  conta: ContaComSaldo | null;
};

/**
 * "Ajustar saldo": o usuário digita o saldo REAL (do app do banco) e o
 * saldo inicial da conta é recalculado para bater — sem transação de
 * ajuste, então receitas/despesas não mudam.
 */
function AjustarSaldoModalBase({ visivel, onFechar, conta }: Props) {
  const chave = useChaveAbertura(visivel);
  const [salvando, setSalvando] = useState(false);
  if (!conta) return null;
  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando} overlayOpacidade={0.6}>
      <Conteudo key={chave} onFechar={onFechar} conta={conta} salvando={salvando} setSalvando={setSalvando} />
    </ModalCentralizado>
  );
}

type PropsConteudo = {
  onFechar: () => void;
  conta: ContaComSaldo;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
};

function Conteudo({ onFechar, conta, salvando, setSalvando }: PropsConteudo) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const { ajustarSaldo } = useContas();
  const ehCartao = conta.tipo === "cartao";

  // Cartão: mostra a dívida em positivo ("quanto você deve").
  const [valor, setValor] = useState(() =>
    Math.round((ehCartao ? Math.max(0, -conta.saldo) : Math.abs(conta.saldo)) * 100) / 100
  );
  const [negativo, setNegativo] = useState(!ehCartao && conta.saldo < 0);

  const salvar = useCallback(async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      const saldoReal = ehCartao ? -valor : negativo ? -valor : valor;
      await ajustarSaldo(conta.id, saldoReal);
      onFechar();
    } catch (e) {
      await avisar({ titulo: "Não foi possível ajustar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [conta, salvando, setSalvando, ehCartao, valor, negativo, ajustarSaldo, onFechar, avisar]);

  return (
    <>
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: moderateScale(17), color: colors["main-text"] }} className="font-Inter-SemiBold">
          Ajustar saldo
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-4">
        {conta.nome} — no app hoje: {FormatToCurrency(conta.saldo)}
      </Text>

      <CampoValor
        label={ehCartao ? "Quanto você deve hoje no cartão" : "Saldo real da conta hoje"}
        valor={valor}
        onChange={setValor}
        desabilitado={salvando}
        ajuda="Não cria transação: só corrige o ponto de partida da conta."
      />
      {!ehCartao && (
        <Pressable onPress={() => setNegativo((v) => !v)} className="flex-row items-center gap-2 mt-2 mb-1" hitSlop={6}>
          <Ionicons
            name={negativo ? "checkbox" : "square-outline"}
            size={16}
            color={negativo ? colors["error-color"] : colors["second-text"]}
          />
          <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>Saldo negativo</Text>
        </Pressable>
      )}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        style={{ backgroundColor: colors["active-icon"], opacity: salvando ? 0.5 : 1 }}
        className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80 mt-5"
        accessibilityRole="button"
      >
        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Ajustar"}
        </Text>
      </Pressable>
    </>
  );
}

export const AjustarSaldoModal = memo(AjustarSaldoModalBase);
