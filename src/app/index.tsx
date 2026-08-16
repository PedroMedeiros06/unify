import { View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Footer } from "../components/footer";

import { useNavigation } from "@/context/NavigationContext";
import { Home } from "../pages/home";
import { ImportarExtrato } from "../pages/ImportarExtrato";
import { Perfil } from "../pages/Perfil";
import { Planejamento } from "../pages/Planejamento";
import { TodasTransacoes } from "../pages/TodasTransacoes";
import { Transferencias } from "../pages/Transferencias";

const Screens = {
  home: Home,
  transations: Transferencias,
  planejamento: Planejamento,
  user: Perfil,
  importarExtrato: ImportarExtrato,
  todasTransacoes: TodasTransacoes,
};

export default function AppIndex() {
  const insets = useSafeAreaInsets();
  const { activeScreen, navigate } = useNavigation();

  const ActiveScreen = Screens[activeScreen];

  // Telas que representam um fluxo guiado (não fazem parte do footer)
  // escondem a barra inferior, para não sugerir que dá pra trocar de
  // aba no meio do fluxo.
  const TELAS_SEM_FOOTER: (keyof typeof Screens)[] = [
    "importarExtrato",
    "todasTransacoes",
  ];
  const mostrarFooter = !TELAS_SEM_FOOTER.includes(activeScreen);

  return (
    <View
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-main-background"
    >
      <View style={{ flex: 1 }} className="p-6">
        <ActiveScreen />
      </View>

      {mostrarFooter && (
        <View className="absolute bottom-0 left-0 right-0">
          <Footer activeScreen={activeScreen} onChangeScreen={navigate} />
        </View>
      )}
    </View>
  );
}
