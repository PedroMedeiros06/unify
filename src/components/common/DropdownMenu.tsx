import { View, Pressable, Modal, Animated, Easing, LayoutRectangle, useWindowDimensions } from "react-native";
import { ReactNode, useEffect, useRef, useState, useCallback } from "react";

// Distância mínima que o card deve manter das bordas da tela, para
// nunca colar exatamente na borda.
const MARGEM_TELA = 12;

type Props = {
  trigger: (props: { abrir: () => void; aberto: boolean }) => ReactNode;
  children: (props: { fechar: () => void }) => ReactNode;
  // Largura do card do dropdown. Altura é sempre automática (baseada
  // no conteúdo) — diferente do MenuAcaoRapida, que tem itens de
  // altura fixa e conhecida, aqui o conteúdo varia bastante (lista de
  // período vs grid de meses), então não faz sentido fixar altura.
  largura?: number;
  // Quando true, ignora `largura` e faz o card ter exatamente a mesma
  // largura do trigger que o abriu (medida em runtime). Útil para
  // dropdowns que substituem um <select> ocupando a linha inteira do
  // formulário — o card fica alinhado de borda a borda com o campo.
  larguraDoTrigger?: boolean;
  // Alinhamento horizontal PREFERIDO do card em relação ao trigger.
  // "centro" (padrão) centraliza o card no meio do trigger — é o que
  // se espera visualmente de um dropdown ancorado a um botão/card de
  // filtro. "esquerda"/"direita" alinham uma borda do card com a
  // borda correspondente do trigger, para casos onde centralizar não
  // faz sentido visual (ex: SeletorMesAno no canto do header). Em
  // qualquer um dos três casos, se o resultado estourar a tela, o
  // posicionamento final é ajustado automaticamente (ver calcularLeft)
  // para o card sempre caber inteiro na viewport.
  alinhamento?: "centro" | "esquerda" | "direita";
};

/**
 * Dropdown genérico ancorado a um trigger — mesmo padrão visual e de
 * animação do MenuAcaoRapida (fade + slide, fecha ao tocar fora), mas
 * posicionado relativo ao elemento que o abriu em vez de fixo acima do
 * footer. Usado por DropdownPeriodo e SeletorMesAno.
 *
 * Mede a posição do trigger via measureInWindow no próprio elemento
 * medido (View com ref) para saber onde ancorar o card. Por padrão o
 * card nasce CENTRALIZADO em relação ao trigger; o `left` final só se
 * afasta desse centro quando necessário para não estourar a tela (ver
 * calcularLeft) — importante porque vários triggers (ex: chips dentro
 * de uma ScrollView horizontal de filtros) podem estar perto de uma
 * borda, e sem esse ajuste o card nasceria parcialmente fora da
 * viewport.
 */
export function DropdownMenu({
  trigger,
  children,
  largura = 220,
  larguraDoTrigger = false,
  alinhamento = "centro",
}: Props) {
  const { width: larguraTela } = useWindowDimensions();

  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [posicaoTrigger, setPosicaoTrigger] = useState<LayoutRectangle | null>(null);

  const triggerRef = useRef<View>(null);
  const progresso = useRef(new Animated.Value(0)).current;

  const abrir = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPosicaoTrigger({ x, y, width, height });
      setAberto(true);
    });
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
  }, []);

  useEffect(() => {
    if (aberto) {
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
  }, [aberto, progresso]);

  const translateY = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  /**
   * Calcula o `left` final do card, respeitando o alinhamento
   * preferido mas sempre garantindo que o card caiba inteiro entre
   * MARGEM_TELA e (larguraTela - MARGEM_TELA). "centro" alinha o meio
   * do card com o meio do trigger; esse é o preferido por padrão para
   * o dropdown parecer ancorado ao elemento que o abriu, em vez de
   * "esticado" para um dos lados.
   */
  function calcularLeft(triggerRect: LayoutRectangle, larguraCard: number): number {
    const centroTrigger = triggerRect.x + triggerRect.width / 2;

    let leftPreferido: number;
    if (alinhamento === "centro") {
      leftPreferido = centroTrigger - larguraCard / 2;
    } else if (alinhamento === "direita") {
      leftPreferido = triggerRect.x + triggerRect.width - larguraCard;
    } else {
      leftPreferido = triggerRect.x;
    }

    const leftMaximo = larguraTela - larguraCard - MARGEM_TELA;
    const leftMinimo = MARGEM_TELA;

    return Math.min(Math.max(leftPreferido, leftMinimo), leftMaximo);
  }

  const larguraCard =
    larguraDoTrigger && posicaoTrigger ? posicaoTrigger.width : largura;
  const left = posicaoTrigger ? calcularLeft(posicaoTrigger, larguraCard) : 0;
  const top = posicaoTrigger ? posicaoTrigger.y + posicaoTrigger.height + 6 : 0;

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        {trigger({ abrir, aberto })}
      </View>

      <Modal visible={montado} transparent animationType="none" onRequestClose={fechar}>
        <Pressable
          className="flex-1"
          onPress={fechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
        />

        {posicaoTrigger && (
          <Animated.View
            pointerEvents={montado ? "auto" : "none"}
            style={{
              position: "absolute",
              top,
              left,
              width: larguraCard,
              opacity: progresso,
              transform: [{ translateY }],
            }}
          >
            <View className="bg-card-background border border-lines-divisions rounded-2xl overflow-hidden shadow-lg">
              {children({ fechar })}
            </View>
          </Animated.View>
        )}
      </Modal>
    </>
  );
}