import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, BackHandler, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Footer } from "../components/Footer";
import { OnboardingFluxo } from "../components/Onboarding/OnboardingFluxo";
import { AberturaAnimada } from "../components/common/AberturaAnimada";
import { onboardingConcluido, marcarOnboardingConcluido } from "@/utils/onboardingFlag";

import { Home } from "../pages/home";
import { Transferencias } from "../pages/Transferencias";
import { Planejamento } from "../pages/Planejamento";
import { Perfil } from "../pages/Perfil";
import { ImportarExtrato } from "../pages/ImportarExtrato";
import { Agenda } from "../pages/Agenda";
import { MetasConcluidas } from "../pages/MetasConcluidas";
import { Recorrencias } from "../pages/Recorrencias";
import { Notificacoes } from "../pages/Notificacoes";
import { Contas } from "../pages/Contas";
import { Categorias } from "../pages/Categorias";
import { Relatorio } from "../pages/Relatorio";
import { ouvirToqueEmNotificacao } from "@/database/notificacoes";
import { agendarAvisoRelatorioMensal } from "@/database/alertasAutomaticos";
import { usePerfil } from "@/context/PerfilContext";
import { TelaBloqueio } from "@/components/Bloqueio/TelaBloqueio";

import { useNavigation } from "@/context/NavigationContext";
import { MenuAcaoRapida, Acao } from "@/components/common/MenuAcaoRapida";
import { useNovaTransacao } from "@/context/NovaTransacaoContext";

// Depois de quanto tempo em segundo plano o app volta a pedir desbloqueio.
const TEMPO_PARA_REBLOQUEAR_MS = 60_000;

const Screens = {
  home: Home,
  transations: Transferencias,
  planejamento: Planejamento,
  user: Perfil,
  importarExtrato: ImportarExtrato,
  agenda: Agenda,
  metasConcluidas: MetasConcluidas,
  recorrencias: Recorrencias,
  notificacoes: Notificacoes,
  contas: Contas,
  categorias: Categorias,
  relatorio: Relatorio,
};

export default function AppIndex() {
  const insets = useSafeAreaInsets();
  const { activeScreen, navigate, goBack } = useNavigation();

  const [menuAcaoAberto, setMenuAcaoAberto] = useState(false);
  const { abrir: abrirNovaTransacao, abrirTransferencia } = useNovaTransacao();

  // Gate de primeira abertura: enquanto `null`, ainda estamos checando a
  // flag (não renderiza nada); `true` mostra o onboarding; `false` segue
  // para o app normal.
  const [precisaOnboarding, setPrecisaOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    onboardingConcluido().then((concluido) => {
      if (ativo) setPrecisaOnboarding(!concluido);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Botão/gesto "voltar" do Android. Sem isto, como a navegação é
  // própria (não usa a pilha do expo-router), o voltar do sistema
  // fechava o app em QUALQUER tela — inclusive no meio da importação de
  // extrato. Agora: fora da Home, volta uma tela no histórico; na Home
  // (ou durante o onboarding), deixa o sistema tratar (sair do app).
  // Modais abertos não chegam aqui: o `onRequestClose` deles consome o
  // evento antes.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (precisaOnboarding !== false || activeScreen === "home") return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [activeScreen, goBack, precisaOnboarding]);

  // Overlay de abertura (ver AberturaAnimada): ele mesmo libera a splash
  // nativa ao montar e anima a saída quando já sabemos o que mostrar
  // (onboarding ou app). A rede de segurança (timeout) fica no _layout.
  const [aberturaVisivel, setAberturaVisivel] = useState(true);

  // Bloqueio com biometria/PIN do aparelho (Perfil > Preferências). O
  // perfil precisa ter carregado antes de liberar a abertura — senão o
  // app apareceria um instante desbloqueado.
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const [desbloqueado, setDesbloqueado] = useState(false);
  const saiuEm = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "background") {
        saiuEm.current = Date.now();
      } else if (estado === "active" && saiuEm.current !== null) {
        if (Date.now() - saiuEm.current > TEMPO_PARA_REBLOQUEAR_MS) setDesbloqueado(false);
        saiuEm.current = null;
      }
    });
    return () => sub.remove();
  }, []);
  const mostrarBloqueio = precisaOnboarding === false && perfil.bloqueioAtivo && !desbloqueado;
  const handleDesbloquear = useCallback(() => setDesbloqueado(true), []);
  const handleFimAbertura = useCallback(() => setAberturaVisivel(false), []);

  // Com o app liberado (fora do onboarding): agenda o aviso do resumo
  // mensal (substitui o anterior) e passa a ouvir toques em notificações
  // que levam a uma tela (relatório, orçamento, metas).
  // `navigate` muda a cada troca de tela — guardado num ref para o
  // efeito não re-agendar nem re-assinar a cada navegação.
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    if (precisaOnboarding !== false) return;
    void agendarAvisoRelatorioMensal();
    return ouvirToqueEmNotificacao((destino) => {
      if (destino.tela === "relatorio") navigateRef.current("relatorio", { mesRelatorio: destino.mesAno });
      else navigateRef.current("planejamento", { planejamentoTab: destino.aba });
    });
  }, [precisaOnboarding]);

  const handleConcluirOnboarding = useCallback(() => {
    void marcarOnboardingConcluido();
    setPrecisaOnboarding(false);
  }, []);

  const ActiveScreen = Screens[activeScreen];

  // Telas que representam um fluxo guiado (não fazem parte do footer)
  // escondem a barra inferior, para não sugerir que dá pra trocar de
  // aba no meio do fluxo. "transations" agora é a lista completa de
  // transações (antiga TodasTransacoes), mas continua sendo uma aba
  // normal do footer — mantém o footer visível. "agenda" e
  // "metasConcluidas" seguem o mesmo padrão de "importarExtrato": são
  // acessadas a partir de outra tela (botão/link), não são abas
  // próprias. "Orçamento" NÃO entra aqui: é uma aba interna do
  // Planejamento (renderizada inline, igual "Metas"), então mantém
  // header + abas + footer visíveis.
  const TELAS_SEM_FOOTER: (keyof typeof Screens)[] = [
    "importarExtrato",
    "agenda",
    "metasConcluidas",
    "recorrencias",
    "notificacoes",
    "contas",
    "categorias",
    "relatorio",
  ];
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
          abrirNovaTransacao();
          break;
        case "transferencia":
          abrirTransferencia();
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
    [navigate, abrirNovaTransacao, abrirTransferencia]
  );

  let conteudo;
  if (precisaOnboarding === null) {
    // Ainda checando a flag: só o fundo (o overlay de abertura cobre).
    conteudo = <View style={{ flex: 1 }} className="bg-main-background" />;
  } else if (precisaOnboarding) {
    conteudo = <OnboardingFluxo onConcluir={handleConcluirOnboarding} />;
  } else {
    conteudo = (
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
              menuAcaoAberto={menuAcaoAberto}
            />
          </View>
        )}

        <MenuAcaoRapida
          visivel={menuAcaoAberto}
          onFechar={() => setMenuAcaoAberto(false)}
          onSelecionar={handleSelecionarAcao}
        />
        {/* NovaTransacaoModal agora é renderizado pelo NovaTransacaoProvider */}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {conteudo}
      {mostrarBloqueio && <TelaBloqueio onDesbloquear={handleDesbloquear} />}
      {aberturaVisivel && (
        <AberturaAnimada pronto={precisaOnboarding !== null && !carregandoPerfil} onFim={handleFimAbertura} />
      )}
    </View>
  );
}
