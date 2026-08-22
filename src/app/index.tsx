import { useCallback, useState } from "react";
import { View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Footer } from "../components/footer";

import { Home } from "../pages/home";
import { Transferencias } from "../pages/Transferencias";
import { Planejamento } from "../pages/Planejamento";
import { Perfil } from "../pages/Perfil";
import { ImportarExtrato } from "../pages/ImportarExtrato";
import { Agenda } from "../pages/Agenda";
import { MetasConcluidas } from "../pages/MetasConcluidas";
import { useNavigation } from "@/context/NavigationContext";
import { MenuAcaoRapida, Acao } from "@/components/common/MenuAcaoRapida";
import { NovaTransacaoModal } from "@/components/TransacoesComp/NovaTransacaoModal";

const Screens = {
  home: Home,
  transations: Transferencias,
  planejamento: Planejamento,
  user: Perfil,
  importarExtrato: ImportarExtrato,
  agenda: Agenda,
  metasConcluidas: MetasConcluidas,
};

export default function AppIndex() {
  const insets = useSafeAreaInsets();
  const { activeScreen, navigate } = useNavigation();

  const [menuAcaoAberto, setMenuAcaoAberto] = useState(false);
  const [modalNovaTransacaoAberto, setModalNovaTransacaoAberto] = useState(false);

  const ActiveScreen = Screens[activeScreen];

  // Telas que representam um fluxo guiado (não fazem parte do footer)
  // escondem a barra inferior, para não sugerir que dá pra trocar de
  // aba no meio do fluxo. "transations" agora é a lista completa de
  // transações (antiga TodasTransacoes), mas continua sendo uma aba
  // normal do footer — mantém o footer visível. "agenda" e
  // "metasConcluidas" seguem o mesmo padrão de "importarExtrato": são
  // acessadas a partir de outra tela (botão/link), não são abas próprias.
  const TELAS_SEM_FOOTER: (keyof typeof Screens)[] = ["importarExtrato", "agenda", "metasConcluidas"];
  const mostrarFooter = !TELAS_SEM_FOOTER.includes(activeScreen);

  const handlePressAdicionar = useCallback(() => {
    setMenuAcaoAberto(true);
  }, []);

  // "Nova meta" e "Novo compromisso" não abrem modal direto daqui — o
  // menu só navega até Planejamento, onde o usuário abre o modal
  // correspondente normalmente (MetasFinanceiras/ProximosCompromissos
  // já têm esse fluxo pronto e mantêm seu próprio estado local).
  const handleSelecionarAcao = useCallback(
    (acao: Acao) => {
      setMenuAcaoAberto(false);

      switch (acao) {
        case "novaTransacao":
          setModalNovaTransacaoAberto(true);
          break;
        case "importarExtrato":
          navigate("importarExtrato");
          break;
        case "novaMeta":
        case "novoCompromisso":
          navigate("planejamento");
          break;
      }
    },
    [navigate]
  );

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
          <Footer
            activeScreen={activeScreen}
            onChangeScreen={navigate}
            onPressAdicionar={handlePressAdicionar}
          />
        </View>
      )}

      <MenuAcaoRapida
        visivel={menuAcaoAberto}
        onFechar={() => setMenuAcaoAberto(false)}
        onSelecionar={handleSelecionarAcao}
      />

      <NovaTransacaoModal
        visivel={modalNovaTransacaoAberto}
        onFechar={() => setModalNovaTransacaoAberto(false)}
      />
    </View>
  );
}