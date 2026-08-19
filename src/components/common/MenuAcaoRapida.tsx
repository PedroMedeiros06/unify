import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Modal, Animated, Easing, useWindowDimensions } from "react-native";
import { memo, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Acao = "novaTransacao" | "importarExtrato" | "novaMeta" | "novoCompromisso";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  onSelecionar: (acao: Acao) => void;
};

const OPCOES: { acao: Acao; titulo: string; icone: keyof typeof Ionicons.glyphMap; cor: string }[] = [
  { acao: "novaTransacao", titulo: "Nova transação", icone: "add-circle-outline", cor: colors["active-icon"] },
  { acao: "importarExtrato", titulo: "Importar extrato", icone: "document-attach-outline", cor: colors["sucess-color"] },
  { acao: "novaMeta", titulo: "Nova meta", icone: "flag-outline", cor: colors["warn-color"] },
  { acao: "novoCompromisso", titulo: "Novo compromisso", icone: "calendar-outline", cor: "#378ADD" },
];

// Altura aproximada da barra de footer (para ancorar o menu logo acima
// dela, independente do dispositivo) — mesma lógica de padding usada
// em footer.tsx (paddingTop 6 + paddingBottom dinâmico + conteúdo).
const ALTURA_FOOTER_BASE = 64;

function MenuAcaoRapidaBase({ visivel, onFechar, onSelecionar }: Props) {
  const itemTitleSize = moderateScale(13);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const progresso = useRef(new Animated.Value(0)).current;
  // Controla se o <Modal> está de fato montado. Diferente de `visivel`:
  // ao fechar, mantemos montado (true) até a animação de saída terminar,
  // e só então desmontamos — senão o Modal do RN remove o conteúdo da
  // tela instantaneamente assim que `visivel` vira false, sem dar tempo
  // nenhum da animação ser percebida.
  const [montado, setMontado] = useState(visivel);

  useEffect(() => {
    if (visivel) {
      setMontado(true);
      progresso.setValue(0);
      Animated.timing(progresso, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progresso, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMontado(false);
      });
    }
  }, [visivel, progresso]);

  const translateY = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0], // sobe 16px ao abrir, desce 16px ao fechar
  });

  const alturaFooter = ALTURA_FOOTER_BASE + insets.bottom;

  return (
    <Modal visible={montado} transparent animationType="none" onRequestClose={onFechar}>
      {/* Área de fundo: toque fora fecha o menu. Fade próprio (via
          Animated.View + opacity), não usa animationType do Modal para
          poder combinar com o slide do card sem dessincronizar. */}
      <Animated.View
        style={{ opacity: progresso }}
        className="flex-1 bg-black/40"
      >
        <Pressable
          className="flex-1"
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar menu de ações rápidas"
        />
      </Animated.View>

      {/* Card flutuante ancorado acima do botão + (centralizado
          horizontalmente, posicionado a partir da base da tela). */}
      <Animated.View
        pointerEvents={montado ? "auto" : "none"}
        style={{
          position: "absolute",
          bottom: alturaFooter + 12,
          left: width / 2 - 130,
          width: 260,
          opacity: progresso,
          transform: [{ translateY }],
        }}
      >
        <View className="bg-card-background border border-lines-divisions rounded-2xl py-2 shadow-lg">
          {OPCOES.map((opcao, index) => (
            <Pressable
              key={opcao.acao}
              onPress={() => onSelecionar(opcao.acao)}
              className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
                index < OPCOES.length - 1 ? "border-b border-lines-divisions/60" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel={opcao.titulo}
            >
              <View style={{ backgroundColor: `${opcao.cor}22` }} className="w-8 h-8 rounded-full items-center justify-center">
                <Ionicons name={opcao.icone} color={opcao.cor} size={16} />
              </View>
              <Text style={{ fontSize: itemTitleSize }} className="text-main-text font-Inter-Medium flex-1">
                {opcao.titulo}
              </Text>
            </Pressable>
          ))}

          {/* Seta apontando para o botão +, reforçando a ancoragem visual */}
          <View
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              marginLeft: -6,
              width: 12,
              height: 12,
              backgroundColor: colors["card-background"],
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors["lines-divisions"],
              transform: [{ rotate: "45deg" }],
            }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

export const MenuAcaoRapida = memo(MenuAcaoRapidaBase);
export type { Acao };