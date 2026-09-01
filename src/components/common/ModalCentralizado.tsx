import { View, Modal, Animated, Easing, Pressable, ScrollView } from "react-native";
import { ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  children: ReactNode;
  // Impede fechar tocando fora do card enquanto uma ação está em
  // andamento (salvando/excluindo) — mesma ideia do `disabled` nos
  // botões de fechar que os modais já tinham.
  bloquearFechamentoExterno?: boolean;
  // Classe do overlay escurecido atrás do card. Default: bg-black/60.
  // Modais que precisam de mais contraste com a tela (ex: nova
  // transação) passam algo mais opaco, ex: bg-black/85.
  overlayClassName?: string;
  // Classe extra no card em si — para modais que precisam se destacar
  // mais do fundo (borda mais viva, cor de superfície diferente). O
  // card já tem bg-card-background + border-lines-divisions + rounded;
  // isto é adicionado por cima.
  cardClassName?: string;
  // Ativa uma sombra forte no card (elevação no Android, shadow no iOS)
  // para separá-lo visualmente da tela.
  cardElevado?: boolean;
};

/**
 * Shell base para os modais de edição (Meta, Compromisso, Transação) —
 * substitui o padrão antigo de bottom sheet (Modal + justify-end +
 * rounded-t-2xl) por um diálogo centralizado: card com cantos
 * arredondados nos 4 lados, fundo escurecido, fade + leve scale na
 * entrada. Cada modal específico só precisa fornecer o conteúdo
 * (header, campos, botões) via children — este componente cuida
 * apenas de montagem/desmontagem e da animação.
 */
export function ModalCentralizado({
  visivel,
  onFechar,
  children,
  bloquearFechamentoExterno = false,
  overlayClassName = "bg-black/60",
  cardClassName = "",
  cardElevado = false,
}: Props) {
  const [montado, setMontado] = useState(visivel);
  const progresso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visivel) {
      setMontado(true);
      progresso.setValue(0);
      Animated.timing(progresso, {
        toValue: 1,
        duration: 200,
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

  const escala = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Modal visible={montado} transparent animationType="none" onRequestClose={onFechar}>
      <View className="flex-1 items-center justify-center px-5">
        <Animated.View
          style={{ opacity: progresso }}
          className={`absolute inset-0 ${overlayClassName}`}
        >
          <Pressable
            className="flex-1"
            onPress={bloquearFechamentoExterno ? undefined : onFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>

        <Animated.View
          style={{
            opacity: progresso,
            transform: [{ scale: escala }],
            width: "100%",
            maxWidth: 400,
            ...(cardElevado
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.5,
                  shadowRadius: 28,
                  elevation: 24,
                }
              : {}),
          }}
        >
          <View
            className={`bg-card-background border border-lines-divisions rounded-2xl overflow-hidden max-h-[85vh] ${cardClassName}`}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View className="p-5">{children}</View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}