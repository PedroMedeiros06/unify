import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput } from "react-native";
import { memo, useCallback } from "react";
import { TipoVencimento } from "@/database/recorrenciasQueries";

type Props = {
  tipoVencimento: TipoVencimento;
  diaVencimento: number | null;
  // Sempre entrega o par consistente: quando o modo não usa dia
  // ("ultimo_dia_util"), `dia` volta como null.
  onChange: (tipoVencimento: TipoVencimento, diaVencimento: number | null) => void;
};

type Opcao = {
  valor: TipoVencimento;
  titulo: string;
  descricao: string;
  // Rótulo do campo numérico; ausente = modo sem dia.
  labelCampo?: string;
  placeholder?: string;
};

const OPCOES: Opcao[] = [
  {
    valor: "dia_fixo",
    titulo: "Dia específico",
    descricao: "Todo mês num dia corrido (1 a 31). Se o mês não tiver esse dia, cai no último dia do mês.",
    labelCampo: "Dia do mês",
    placeholder: "10",
  },
  {
    valor: "dia_util",
    titulo: "Dia útil",
    descricao: "No N-ésimo dia útil do mês (segunda a sexta). Feriados não são considerados.",
    labelCampo: "Qual dia útil",
    placeholder: "5",
  },
  {
    valor: "ultimo_dia_util",
    titulo: "Último dia útil",
    descricao: "Sempre no último dia útil do mês.",
  },
];

const DIA_PADRAO: Record<TipoVencimento, number | null> = {
  dia_fixo: 10,
  dia_util: 5,
  ultimo_dia_util: null,
};

function SeletorRegraVencimentoBase({ tipoVencimento, diaVencimento, onChange }: Props) {
  const labelSize = moderateScale(11);
  const tituloSize = moderateScale(13);
  const descricaoSize = moderateScale(10);
  const inputTextSize = moderateScale(14);

  const handleSelecionarModo = useCallback(
    (valor: TipoVencimento) => {
      if (valor === tipoVencimento) return;
      onChange(valor, DIA_PADRAO[valor]);
    },
    [tipoVencimento, onChange]
  );

  const handleDiaChange = useCallback(
    (texto: string) => {
      const somenteDigitos = texto.replace(/[^0-9]/g, "");
      if (somenteDigitos === "") {
        onChange(tipoVencimento, null);
        return;
      }
      let n = parseInt(somenteDigitos, 10);
      if (n < 1) n = 1;
      if (n > 31) n = 31;
      onChange(tipoVencimento, n);
    },
    [tipoVencimento, onChange]
  );

  const opcaoAtual = OPCOES.find((o) => o.valor === tipoVencimento) ?? OPCOES[0];

  return (
    <View>
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Quando vence
      </Text>

      <View className="gap-2">
        {OPCOES.map((opcao) => {
          const selecionado = opcao.valor === tipoVencimento;
          return (
            <Pressable
              key={opcao.valor}
              onPress={() => handleSelecionarModo(opcao.valor)}
              className={`rounded-xl border p-3 flex-row items-start gap-2.5 active:opacity-70 ${
                selecionado ? "border-active-icon bg-active-icon/10" : "border-input-border bg-input-background"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selecionado }}
              accessibilityLabel={opcao.titulo}
            >
              <Ionicons
                name={selecionado ? "radio-button-on" : "radio-button-off"}
                color={selecionado ? colors["active-icon"] : colors["desactived-text"]}
                size={18}
                style={{ marginTop: 1 }}
              />
              <View className="flex-1">
                <Text
                  style={{ fontSize: tituloSize }}
                  className={selecionado ? "text-active-icon font-Inter-Medium" : "text-main-text font-Inter-Medium"}
                >
                  {opcao.titulo}
                </Text>
                <Text style={{ fontSize: descricaoSize }} className="text-desactived-text mt-0.5">
                  {opcao.descricao}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {opcaoAtual.labelCampo && (
        <View className="mt-3">
          <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
            {opcaoAtual.labelCampo}
          </Text>
          <TextInput
            value={diaVencimento != null ? String(diaVencimento) : ""}
            onChangeText={handleDiaChange}
            keyboardType="numeric"
            maxLength={2}
            placeholder={opcaoAtual.placeholder}
            placeholderTextColor={colors["desactived-text"]}
            style={{ fontSize: inputTextSize, color: colors["main-text"] }}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 w-24"
            accessibilityLabel={opcaoAtual.labelCampo}
          />
        </View>
      )}
    </View>
  );
}

export const SeletorRegraVencimento = memo(SeletorRegraVencimentoBase);
