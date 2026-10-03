import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { SeletorData } from "@/components/common/SeletorData";
import { CampoValor } from "@/components/common/CampoValor";
import { SeletorConta } from "@/components/ContasComp/SeletorConta";
import { useContas } from "@/context/ContasContext";
import { useDialogo } from "@/context/DialogoContext";
import { dataHojeIso } from "@/utils/dateUtils";
import { useChaveAbertura } from "@/hooks/useChaveAbertura";

export type PreenchimentoTransferencia = {
  origemId?: string | null;
  destinoId?: string | null;
  valor?: number;
  descricao?: string;
  titulo?: string; // ex: "Pagar fatura"
};

type Props = {
  visivel: boolean;
  onFechar: () => void;
  preenchimento?: PreenchimentoTransferencia;
};

/**
 * Transferência entre duas contas do usuário (inclui pagar fatura de
 * cartão: origem = conta, destino = cartão). Gera duas transações
 * ligadas que não contam como receita/despesa — só movem saldo.
 */
function TransferenciaModalBase({ visivel, onFechar, preenchimento }: Props) {
  const chave = useChaveAbertura(visivel);
  const [salvando, setSalvando] = useState(false);
  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando} overlayOpacidade={0.6}>
      <Conteudo
        key={chave}
        onFechar={onFechar}
        preenchimento={preenchimento}
        salvando={salvando}
        setSalvando={setSalvando}
      />
    </ModalCentralizado>
  );
}

type PropsConteudo = {
  onFechar: () => void;
  preenchimento?: PreenchimentoTransferencia;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
};

// Remontado a cada abertura (key) — o estado inicial vem do preenchimento.
function Conteudo({ onFechar, preenchimento, salvando, setSalvando }: PropsConteudo) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const { criarTransferencia } = useContas();

  const [origemId, setOrigemId] = useState<string | null>(preenchimento?.origemId ?? null);
  const [destinoId, setDestinoId] = useState<string | null>(preenchimento?.destinoId ?? null);
  const [valor, setValor] = useState(preenchimento?.valor ?? 0);
  const [dataIso, setDataIso] = useState<string | null>(dataHojeIso());
  const [descricao, setDescricao] = useState(preenchimento?.descricao ?? "");

  const valido = !!origemId && !!destinoId && origemId !== destinoId && valor > 0 && !!dataIso;

  const inverter = useCallback(() => {
    setOrigemId(destinoId);
    setDestinoId(origemId);
  }, [origemId, destinoId]);

  const salvar = useCallback(async () => {
    if (!valido || !origemId || !destinoId || !dataIso || salvando) return;
    setSalvando(true);
    try {
      await criarTransferencia({ origemId, destinoId, valor, data: dataIso, descricao });
      onFechar();
    } catch (e) {
      await avisar({
        titulo: "Não foi possível transferir",
        mensagem: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }, [valido, origemId, destinoId, dataIso, salvando, setSalvando, criarTransferencia, valor, descricao, onFechar, avisar]);

  return (
    <>
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: moderateScale(17), color: colors["main-text"] }} className="font-Inter-SemiBold">
          {preenchimento?.titulo ?? "Transferência"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-4">
        Entre suas contas. Não conta como receita nem despesa.
      </Text>

      <SeletorConta label="De" contaId={origemId} onSelecionar={(c) => setOrigemId(c.id)} excluirId={destinoId} desabilitado={salvando} />

      <View className="items-center my-1.5">
        <Pressable
          onPress={inverter}
          hitSlop={8}
          style={{ backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
          className="w-8 h-8 rounded-full border items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Inverter origem e destino"
        >
          <Ionicons name="swap-vertical" size={16} color={colors["active-icon"]} />
        </Pressable>
      </View>

      <SeletorConta label="Para" contaId={destinoId} onSelecionar={(c) => setDestinoId(c.id)} excluirId={origemId} desabilitado={salvando} />

      <View className="mt-4">
        <CampoValor label="Valor" valor={valor} onChange={setValor} desabilitado={salvando} />
      </View>

      <View className="mt-4">
        <SeletorData label="Data" valorIso={dataIso} onChange={setDataIso} />
      </View>

      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mt-4 mb-1.5">
        Descrição (opcional)
      </Text>
      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: Reserva, pagamento da fatura..."
        placeholderTextColor={colors["desactived-text"]}
        editable={!salvando}
        style={{
          fontSize: moderateScale(14),
          color: colors["main-text"],
          backgroundColor: colors["input-background"],
          borderColor: colors["input-border"],
        }}
        className="border rounded-xl px-3 py-3 mb-5"
      />

      <Pressable
        onPress={salvar}
        disabled={!valido || salvando}
        style={{ backgroundColor: valido && !salvando ? colors["active-icon"] : `${colors["active-icon"]}4D` }}
        className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Confirmar transferência"
      >
        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Transferir"}
        </Text>
      </Pressable>
    </>
  );
}

export const TransferenciaModal = memo(TransferenciaModalBase);
