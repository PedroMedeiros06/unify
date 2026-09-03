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
  // Opacidade do preto do overlay atrás do card, aplicada via STYLE
  // (rgba, não className) — o escurecimento acontece mesmo que o
  // NativeWind não resolva `bg-black/NN` neste contexto animado. 0..1.
  // Todos os modais do app usam o padrão 0.6; só passe outro valor com
  // um motivo claro.
  overlayOpacidade?: number;
  // Classe extra no card em si — para modais que precisam se destacar
  // mais do fundo (borda mais viva, cor de superfície diferente). O
  // card já tem bg-card-background + border-lines-divisions + rounded;
  // isto é adicionado por cima. Se trouxer seu próprio `bg-`/`border-`,
  // o padrão correspondente não é emitido (ver merge abaixo).
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
  overlayOpacidade = 0.6,
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
    <Modal
      visible={montado}
      transparent
      animationType="none"
      onRequestClose={onFechar}
      // Sem isto, o container do Modal do Android não cobre a área da
      // status bar / navigation bar e sobra uma faixa branca (fundo
      // default do Modal) por baixo do footer, na altura dos botões de
      // navegação do sistema.
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 items-center justify-center px-5">
        <Animated.View
          style={{
            // position/inset por STYLE (não `inset-0` do NativeWind) para
            // garantir que o overlay cubra a tela inteira, inclusive sob
            // a barra de navegação — senão sobra faixa branca ali.
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: progresso,
            backgroundColor: `rgba(0,0,0,${overlayOpacidade})`,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
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
            className={[
              // Só aplica a cor/borda padrão se `cardClassName` não
              // trouxer a sua própria — evita duas classes `bg-`/`border-`
              // brigando (ordem de merge do NativeWind não é garantida).
              /\bbg-/.test(cardClassName) ? "" : "bg-card-background",
              /\bborder-[a-z]/.test(cardClassName) ? "border" : "border border-lines-divisions",
              "rounded-2xl overflow-hidden max-h-[85vh]",
              cardClassName,
            ].join(" ")}
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