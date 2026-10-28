import { memo, useCallback } from "react";
import { View, Text, TextInput } from "react-native";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";

type Props = {
  label: string;
  // Valor em reais (>= 0). O campo trabalha em centavos: cada dígito
  // digitado entra pela direita ("1", "12", "123" -> R$ 0,01 / 0,12 / 1,23),
  // o mesmo comportamento do formulário de Nova transação.
  valor: number;
  onChange: (valor: number) => void;
  desabilitado?: boolean;
  ajuda?: string;
};

function CampoValorBase({ label, valor, onChange, desabilitado, ajuda }: Props) {
  const colors = useThemeColors();

  const handleChange = useCallback(
    (texto: string) => {
      const digitos = texto.replace(/[^0-9]/g, "");
      onChange(digitos ? parseInt(digitos, 10) / 100 : 0);
    },
    [onChange]
  );

  return (
    <View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-1.5">
        {label}
      </Text>
      <TextInput
        value={valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        onChangeText={handleChange}
        keyboardType="numeric"
        editable={!desabilitado}
        style={{
          fontSize: moderateScale(14),
          color: colors["main-text"],
          backgroundColor: colors["input-background"],
          borderColor: colors["input-border"],
        }}
        className="border rounded-xl px-3 py-3"
        accessibilityLabel={label}
      />
      {ajuda && (
        <Text style={{ fontSize: moderateScale(10), color: colors["desactived-text"] }} className="mt-1">
          {ajuda}
        </Text>
      )}
    </View>
  );
}

export const CampoValor = memo(CampoValorBase);
