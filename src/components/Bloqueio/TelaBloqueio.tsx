import { memo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { autenticar, verificarDisponibilidadeBloqueio } from "@/utils/autenticacaoLocal";

type Props = { onDesbloquear: () => void };

/**
 * Cobre o app inteiro enquanto o bloqueio está ativo. Pede a
 * autenticação sozinha ao aparecer; se o usuário cancelar, fica o botão
 * "Desbloquear" para tentar de novo. Cores fixas (mesmo fundo da splash)
 * — não depende do tema, que pode nem ter carregado.
 */
function TelaBloqueioBase({ onDesbloquear }: Props) {
  const [tentando, setTentando] = useState(false);

  const tentar = useCallback(async () => {
    setTentando(true);
    const ok = await autenticar();
    setTentando(false);
    if (ok) onDesbloquear();
  }, [onDesbloquear]);

  useEffect(() => {
    // Pequeno atraso: o prompt do sistema sobre a transição da splash
    // às vezes é descartado pelo Android.
    const t = setTimeout(async () => {
      // Aparelho sem nenhuma trava (ex: backup restaurado de outro
      // celular com o bloqueio ligado): não há como autenticar — libera
      // em vez de trancar o usuário fora dos próprios dados.
      const disp = await verificarDisponibilidadeBloqueio();
      if (!disp.disponivel) {
        onDesbloquear();
        return;
      }
      void tentar();
    }, 350);
    return () => clearTimeout(t);
  }, [tentar, onDesbloquear]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.fundo]}>
      <Image source={require("../../../assets/images/logo-u.png")} style={{ width: 75, height: 80 }} resizeMode="contain" />
      <Text style={[styles.titulo, { fontSize: moderateScale(18) }]} className="font-Inter-SemiBold">
        Unify bloqueado
      </Text>
      <Text style={[styles.texto, { fontSize: moderateScale(12) }]}>
        Use a biometria ou a senha do aparelho para continuar.
      </Text>
      <Pressable
        onPress={tentar}
        disabled={tentando}
        style={[styles.botao, { opacity: tentando ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Desbloquear"
      >
        <Ionicons name="finger-print" size={18} color="#FFFFFF" />
        <Text style={{ fontSize: moderateScale(14), color: "#FFFFFF" }} className="font-Inter-SemiBold">
          {tentando ? "Aguardando..." : "Desbloquear"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: {
    backgroundColor: "#0B0F14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 90,
    elevation: 90,
  },
  titulo: { color: "#E6EDF3", marginTop: 20 },
  texto: { color: "#AAB4C3", textAlign: "center", marginTop: 6, marginBottom: 24 },
  botao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8D51E6",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
});

export const TelaBloqueio = memo(TelaBloqueioBase);
