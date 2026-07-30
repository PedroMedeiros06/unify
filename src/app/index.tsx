import { useState } from "react";
import { View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Footer } from "../components/footer";

import { Home } from "../pages/home";
// import { Wallet } from "../pages/Wallet";
// import { UserCalendar } from "../pages/Calendar";

const Screens = {
  home: Home,
//   calendar: UserCalendar,
//   wallet: Wallet,
};

export type ScreenType = keyof typeof Screens;

export default function AppIndex() {
  const insets = useSafeAreaInsets();
  const [activeScreen, setScreen] = useState<ScreenType>("home");

  const ActiveScreen = Screens[activeScreen];

  return (
    <View
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-main-background"
    >
      {/* Tela ativa */}
      <View style={{ flex: 1 }} className="p-6">
        <ActiveScreen />
      </View>

      {/* 
        Footer posicionado de forma absoluta colado no limite físico da tela (bottom-0).
        Não colocamos padding aqui para o fundo dele cobrir tudo até a borda inferior.
      */}
      <View className="absolute bottom-0 left-0 right-0">
        <Footer activeScreen={activeScreen} onChangeScreen={setScreen} />
      </View>
    </View>
  );
}