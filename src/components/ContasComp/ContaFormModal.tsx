import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { CampoValor } from "@/components/common/CampoValor";
import { SeloConta } from "@/components/ContasComp/SeletorConta";
import { useContas } from "@/context/ContasContext";
import { useDialogo } from "@/context/DialogoContext";
import { ContaComSaldo, TipoConta } from "@/database/contasQueries";
import { useChaveAbertura } from "@/hooks/useChaveAbertura";

// Paleta das contas personalizadas — cores de banco comuns no Brasil +
// neutras, todas legíveis com a sigla em branco por cima.
export const CORES_CONTA = [
  "#8D11DA", "#FF7A01", "#E8C400", "#CC092F", "#EC0000", "#0A5EB0",
  "#00A868", "#1D9E75", "#378ADD", "#E24B4A", "#6B778C", "#2F3A4D",
];

type Props = {
  visivel: boolean;
  onFechar: () => void;
  // Ausente = criar. Presente = editar.
  conta?: ContaComSaldo | null;
  tipoInicial?: TipoConta;
};

/** Sigla automática: iniciais das 2 primeiras palavras ("Caixa Econômica" -> "CE"). */
function siglaAutomatica(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  if (palavras.length === 1) return palavras[0].slice(0, 2);
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

function diaValido(texto: string): number | null {
  const n = parseInt(texto, 10);
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
}

function ContaFormModalBase({ visivel, onFechar, conta, tipoInicial = "conta" }: Props) {
  const chave = useChaveAbertura(visivel);
  const [salvando, setSalvando] = useState(false);
  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando} overlayOpacidade={0.6}>
      <Conteudo
        key={chave}
        onFechar={onFechar}
        conta={conta}
        tipoInicial={tipoInicial}
        salvando={salvando}
        setSalvando={setSalvando}
      />
    </ModalCentralizado>
  );
}

type PropsConteudo = {
  onFechar: () => void;
  conta?: ContaComSaldo | null;
  tipoInicial: TipoConta;
  salvando: boolean;
  setSalvando: (v: boolean) => void;
};

// Remontado a cada abertura (key) — estado inicial vem da conta editada.
function Conteudo({ onFechar, conta, tipoInicial, salvando, setSalvando }: PropsConteudo) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const { criarConta, editarConta } = useContas();
  const editando = !!conta;
  // Contas do catálogo (com importador) têm nome/sigla/cor regravados a
  // cada boot — nelas só o que é do cartão poderia mudar, e elas são
  // sempre "conta". Então o formulário trava a identidade visual.
  const identidadeTravada = editando && !conta?.personalizada;

  const [tipo, setTipo] = useState<TipoConta>(conta?.tipo ?? tipoInicial);
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [sigla, setSigla] = useState(conta?.sigla ?? "");
  const [siglaEditada, setSiglaEditada] = useState(!!conta);
  const [cor, setCor] = useState(conta?.cor ?? CORES_CONTA[0]);
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [saldoNegativo, setSaldoNegativo] = useState(false);
  const [fechamento, setFechamento] = useState(conta?.diaFechamento ? String(conta.diaFechamento) : "");
  const [vencimento, setVencimento] = useState(conta?.diaVencimento ? String(conta.diaVencimento) : "");

  const handleNome = useCallback(
    (texto: string) => {
      setNome(texto);
      if (!siglaEditada) setSigla(siglaAutomatica(texto));
    },
    [siglaEditada]
  );

  const ehCartao = tipo === "cartao";
  const diaF = diaValido(fechamento);
  const diaV = diaValido(vencimento);
  const valido =
    nome.trim().length > 0 && sigla.trim().length > 0 && (!ehCartao || (diaF !== null && diaV !== null));

  const salvar = useCallback(async () => {
    if (!valido || salvando) return;
    setSalvando(true);
    try {
      if (editando && conta) {
        await editarConta(conta.id, {
          nome,
          sigla,
          cor,
          diaFechamento: ehCartao ? diaF : null,
          diaVencimento: ehCartao ? diaV : null,
        });
      } else {
        // Cartão: o usuário informa quanto DEVE; o saldo do cartão é a
        // dívida em negativo. Conta: pode ser negativa (cheque especial).
        const inicial = ehCartao || saldoNegativo ? -saldoInicial : saldoInicial;
        await criarConta({
          nome,
          sigla,
          cor,
          tipo,
          saldoInicial: inicial,
          diaFechamento: diaF,
          diaVencimento: diaV,
        });
      }
      onFechar();
    } catch (e) {
      await avisar({ titulo: "Não foi possível salvar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [valido, salvando, setSalvando, editando, conta, editarConta, nome, sigla, cor, ehCartao, diaF, diaV, saldoNegativo, saldoInicial, criarConta, tipo, onFechar, avisar]);

  const estiloInput = {
    fontSize: moderateScale(14),
    color: colors["main-text"],
    backgroundColor: colors["input-background"],
    borderColor: colors["input-border"],
  };
  const rotulo = (texto: string) => (
    <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-1.5">
      {texto}
    </Text>
  );

  return (
    <>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: moderateScale(17), color: colors["main-text"] }} className="font-Inter-SemiBold">
          {editando ? "Editar conta" : "Nova conta"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      {/* TIPO — só na criação; mudar o tipo de uma conta com histórico confundiria a fatura */}
      {!editando && (
        <View className="flex-row gap-2 mb-4">
          {(["conta", "cartao"] as const).map((t) => {
            const ativo = tipo === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTipo(t)}
                style={{
                  borderColor: ativo ? colors["active-icon"] : colors["input-border"],
                  backgroundColor: ativo ? `${colors["active-icon"]}22` : "transparent",
                }}
                className="flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-1.5"
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
              >
                <Ionicons
                  name={t === "conta" ? "wallet-outline" : "card-outline"}
                  size={15}
                  color={ativo ? colors["active-icon"] : colors["second-text"]}
                />
                <Text style={{ fontSize: moderateScale(13), color: ativo ? colors["active-icon"] : colors["second-text"] }}>
                  {t === "conta" ? "Conta" : "Cartão de crédito"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View className="flex-row items-end gap-3 mb-4">
        <View className="flex-1">
          {rotulo("Nome")}
          <TextInput
            value={nome}
            onChangeText={handleNome}
            placeholder={ehCartao ? "Ex.: Cartão Itaú" : "Ex.: Caixa, Carteira, Itaú..."}
            placeholderTextColor={colors["desactived-text"]}
            editable={!salvando && !identidadeTravada}
            style={estiloInput}
            className="border rounded-xl px-3 py-3"
          />
        </View>
        <View style={{ width: 64 }}>
          {rotulo("Sigla")}
          <TextInput
            value={sigla}
            onChangeText={(t) => {
              setSigla(t.slice(0, 3));
              setSiglaEditada(true);
            }}
            maxLength={3}
            autoCapitalize="characters"
            editable={!salvando && !identidadeTravada}
            style={estiloInput}
            className="border rounded-xl px-3 py-3 text-center"
          />
        </View>
      </View>

      {!identidadeTravada && (
        <>
          {rotulo("Cor")}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {CORES_CONTA.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCor(c)}
                style={{
                  backgroundColor: c,
                  borderColor: cor === c ? colors["main-text"] : "transparent",
                }}
                className="w-8 h-8 rounded-lg border-2 items-center justify-center"
                accessibilityRole="radio"
                accessibilityState={{ checked: cor === c }}
                accessibilityLabel={`Cor ${c}`}
              >
                {cor === c && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {ehCartao && (
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            {rotulo("Dia do fechamento")}
            <TextInput
              value={fechamento}
              onChangeText={(t) => setFechamento(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="1 a 31"
              placeholderTextColor={colors["desactived-text"]}
              editable={!salvando}
              style={estiloInput}
              className="border rounded-xl px-3 py-3"
            />
          </View>
          <View className="flex-1">
            {rotulo("Dia do vencimento")}
            <TextInput
              value={vencimento}
              onChangeText={(t) => setVencimento(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="1 a 31"
              placeholderTextColor={colors["desactived-text"]}
              editable={!salvando}
              style={estiloInput}
              className="border rounded-xl px-3 py-3"
            />
          </View>
        </View>
      )}

      {!editando && (
        <View className="mb-5">
          <CampoValor
            label={ehCartao ? "Quanto você deve hoje neste cartão" : "Saldo atual da conta"}
            valor={saldoInicial}
            onChange={setSaldoInicial}
            desabilitado={salvando}
            ajuda={
              ehCartao
                ? "Fatura em aberto + parcelas a vencer. Pode deixar zero."
                : "Assim o saldo do app começa igual ao do banco."
            }
          />
          {!ehCartao && (
            <Pressable onPress={() => setSaldoNegativo((v) => !v)} className="flex-row items-center gap-2 mt-2" hitSlop={6}>
              <Ionicons
                name={saldoNegativo ? "checkbox" : "square-outline"}
                size={16}
                color={saldoNegativo ? colors["error-color"] : colors["second-text"]}
              />
              <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>Saldo negativo</Text>
            </Pressable>
          )}
        </View>
      )}

      {editando && <View className="h-1" />}

      <View className="flex-row items-center gap-2 mb-4">
        <SeloConta sigla={sigla || "?"} cor={cor} tamanho={28} />
        <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>Prévia</Text>
      </View>

      <Pressable
        onPress={salvar}
        disabled={!valido || salvando}
        style={{ backgroundColor: valido && !salvando ? colors["active-icon"] : `${colors["active-icon"]}4D` }}
        className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80"
        accessibilityRole="button"
      >
        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar conta"}
        </Text>
      </Pressable>
    </>
  );
}

export const ContaFormModal = memo(ContaFormModalBase);
