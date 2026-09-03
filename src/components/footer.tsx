import { ScreenType } from "@/context/NavigationContext";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, Animated, Easing, useWindowDimensions } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "home", label: "Início", icon: "home-sharp" },
  { name: "transations", label: "Transações", icon: "swap-horizontal-sharp" },
  { name: "Add", label: "", icon: "add-circle-sharp" }, 
  { name: "planejamento", label: "Planejamento", icon: "calendar-sharp" },
  { name: "user", label: "Perfil", icon: "person-sharp" },
] as const;



export type ScreenName = (typeof tabs)[number]["name"];

type FooterProps = {
  activeScreen: ScreenType;
  onChangeScreen: (screen: any) => void;
  // Chamado especificamente quando o botão central "+" é tocado — ele
  // não é uma tela navegável (ScreenType), então precisa de um handler
  // próprio em vez de reusar onChangeScreen, que espera um ScreenType válido.
  onPressAdicionar: () => void;
  // Quando o menu de ações rápidas está aberto, o botão "+" gira 45°
  // (vira "×") e fica vermelho, sinalizando que tocar de novo fecha.
  menuAcaoAberto?: boolean;
};

export function Footer({ activeScreen, onChangeScreen, onPressAdicionar, menuAcaoAberto = false }: FooterProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

  // Progresso 0→1 do estado "menu aberto": anima rotação do botão + e
  // faz cross-fade entre o ícone roxo e o vermelho. NÃO animamos as
  // props do <Ionicons> direto (Animated.createAnimatedComponent nele
  // estoura em `setNativeProps` nesta versão do @expo/vector-icons) —
  // por isso são dois ícones sobrepostos com opacidade cruzada.
  const progressoMenu = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressoMenu, {
      toValue: menuAcaoAberto ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true, // só opacity + rotate: ok no native driver
    }).start();
  }, [menuAcaoAberto, progressoMenu]);

  const rotacaoMais = progressoMenu.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View 
      style={{ 
        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 14, 
        paddingTop: 6,
      }}
      className="bg-input-background flex-row justify-around items-center px-2 border-t border-lines-divisions w-full overflow-visible relative"
    >
      {tabs.map((tab) => {
        const isActive = activeScreen === tab.name;

        // Estilização Especial para o botão de Adicionar (Central flutuante)
       // Estilização Especial para o botão de Adicionar (Central flutuante)
        if (tab.name === "Add") {
          const buttonSize = isSmallDevice ? 56 : 64;
          
          // 0.52 (52%) é o tamanho exato para caber dentro do preenchimento da cruz sem transbordar o círculo
          const whiteBgSize = buttonSize * 0.52; 

          return (
            <View 
              key={tab.name} 
              className="flex-1 items-center justify-center overflow-visible"
              style={{ height: 40 }}
            >
              <Pressable
                className="absolute items-center justify-center"
                style={({ pressed }) => [
                  {
                    transform: [
                      { translateY: isSmallDevice ? -10 : -16 },
                      { scale: pressed ? 0.95 : 1 },
                    ],
                    elevation: 8,
                  },
                ]}
                onPress={onPressAdicionar}
                accessibilityRole="button"
                accessibilityLabel="Adicionar"
              >
                {/* 
                  Fundo Branco do Ícone:
                  Agora com o tamanho reduzido para se encaixar perfeitamente no miolo da cruz.
                */}
                <View
                  style={{
                    width: whiteBgSize,
                    height: whiteBgSize,
                    borderRadius: whiteBgSize / 2,
                  }}
                  className="bg-main-text  absolute"
                />

                <Animated.View style={{ transform: [{ rotate: rotacaoMais }] }}>
                  {/* Ícone roxo (estado normal) */}
                  <Ionicons name={tab.icon} size={buttonSize} color={colors["active-icon"]} />
                  {/* Ícone vermelho sobreposto, revelado quando o menu abre */}
                  <Animated.View style={{ position: "absolute", opacity: progressoMenu }}>
                    <Ionicons name={tab.icon} size={buttonSize} color={colors["error-color"]} />
                  </Animated.View>
                </Animated.View>
              </Pressable>
            </View>
          );
        }

        // Estilização das Abas Padrão
        return (
          <Pressable
            key={tab.name}
            className="flex-1 flex-col items-center justify-center py-2 relative"
            onPress={() => onChangeScreen(tab.name)}
          >
            {/* Traço Indicador Superior */}
            {isActive && (
              <View 
                style={{ 
                  width: isSmallDevice ? 32 : 44,
                  position: 'absolute',
                  top: -7.5
                }}
                className="h-[3px] rounded-full bg-active-icon" 
              />
            )}

            {/* Container do Ícone */}
            <View className="justify-center items-center mt-1">
              <Ionicons
                name={tab.icon}
                size={isSmallDevice ? 18 : 22}
                className={isActive ? "text-active-icon" : "text-desactived-text"}
              />
            </View>

            {/* Texto Adaptável */}
            <Text
              numberOfLines={1}
              style={{ 
                fontSize: isSmallDevice ? 10 : 11 
              }}
              className={`tracking-tight px-0.5 mt-1 ${
                isActive 
                  ? "font-semibold text-active-icon" 
                  : "font-regular text-desactived-text"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}