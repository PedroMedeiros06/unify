import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "home", label: "Início", icon: "home-sharp" },
  { name: "transations", label: "Transações", icon: "swap-horizontal-sharp" },
  { name: "Add", label: "", icon: "add-circle-sharp" }, 
  { name: "planejamento", label: "Planejamento", icon: "calendar-sharp" },
  { name: "user", label: "Perfil", icon: "person-sharp" },
] as const;

type ScreenName = (typeof tabs)[number]["name"];

type FooterProps = {
  activeScreen: ScreenName;
  onChangeScreen: (screen: ScreenName) => void;
};

export function Footer({ activeScreen, onChangeScreen }: FooterProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

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
                className="absolute active:scale-95 items-center justify-center"
                style={{ 
                  transform: [{ translateY: isSmallDevice ? -10 : -16 }],
                  elevation: 8,
                }}
                onPress={() => onChangeScreen(tab.name)}
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

                <Ionicons
                  name={tab.icon}
                  size={buttonSize}
                  className="text-active-icon"
                />
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