import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Modal } from "react-native";
import { memo, useEffect, useState } from "react";
import { SeletorData } from "@/components/common/SeletorData";

type Props = {
  visivel: boolean;
  inicioIso: string | null;
  fimIso: string | null;
  onConfirmar: (inicioIso: string, fimIso: string) => void;
  onFechar: () => void;
};

function SeletorPeriodoPersonalizadoBase({ visivel, inicioIso, fimIso, onConfirmar, onFechar }: Props) {
  const titleSize = moderateScale(16);
  const buttonTextSize = moderateScale(14);
  const avisoSize = moderateScale(11);

  const [inicio, setInicio] = useState<string | null>(inicioIso);
  const [fim, setFim] = useState<string | null>(fimIso);

  useEffect(() => {
    if (visivel) {
      setInicio(inicioIso);
      setFim(fimIso);
    }
  }, [visivel, inicioIso, fimIso]);

  const intervaloInvalido = !!(inicio && fim && inicio > fim);
  const valido = !!inicio && !!fim && !intervaloInvalido;

  const handleConfirmar = () => {
    if (!inicio || !fim || intervaloInvalido) return;
    onConfirmar(inicio, fim);
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-card-background rounded-t-2xl p-5 pb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
              Período personalizado
            </Text>
            <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <Ionicons name="close" color={colors["second-text"]} size={22} />
            </Pressable>
          </View>

          <View className="mb-4">
            <SeletorData label="De" valorIso={inicio} onChange={setInicio} />
          </View>

          <View className="mb-2">
            <SeletorData label="Até" valorIso={fim} onChange={setFim} />
          </View>

          {intervaloInvalido && (
            <Text style={{ fontSize: avisoSize }} className="text-error-color mb-4">
              A data final não pode ser anterior à data inicial.
            </Text>
          )}

          <Pressable
            onPress={handleConfirmar}
            disabled={!valido}
            className={`w-full py-3.5 rounded-xl items-center justify-center mt-4 ${valido ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"}`}
            accessibilityRole="button"
            accessibilityLabel="Aplicar período"
            accessibilityState={{ disabled: !valido }}
          >
            <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
              Aplicar período
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const SeletorPeriodoPersonalizado = memo(SeletorPeriodoPersonalizadoBase);
