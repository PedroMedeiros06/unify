import { useThemeColors, PaletaCores } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { memo, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePerfil } from "@/context/PerfilContext";

/**
 * Apresentação do app: uma sequência de slides que mostra COMO usar
 * cada área (não só o que ela faz) — cada slide tem uma ilustração
 * montada com Views imitando a tela real, um texto curto e 2-3 dicas
 * práticas de uso.
 *
 * Dois modos:
 * - "primeiraVez" (padrão): após os slides vem o "cadastro" local (nome
 *   obrigatório, e-mail opcional). `onConcluir` é chamado ao terminar;
 *   quem monta (AppIndex) grava a flag de onboarding.
 * - "revisao": aberto de novo a partir do Perfil ("Rever apresentação").
 *   Sem cadastro — o último slide tem o botão "Entendi" que chama
 *   `onConcluir`, e há um "Fechar" no topo.
 *
 * Não usa biblioteca de carrossel — é uma ScrollView horizontal com
 * pagingEnabled e um índice controlado.
 */

type Dica = { icone: keyof typeof Ionicons.glyphMap; texto: string };

type Slide = {
  id: string;
  titulo: string;
  texto: string;
  dicas: Dica[];
  Ilustracao: (props: { c: PaletaCores }) => ReactNode;
};

/* ------------------------------------------------------------------ */
/* Ilustrações: miniaturas das telas reais, só com Views/ícones.        */
/* ------------------------------------------------------------------ */

function Cartao({ c, children, className = "" }: { c: PaletaCores; children: ReactNode; className?: string }) {
  return (
    <View
      style={{ backgroundColor: c["card-background"], borderColor: c["lines-divisions"] }}
      className={`border rounded-2xl p-3 ${className}`}
    >
      {children}
    </View>
  );
}

function TextoP({ c, children, cor, peso = "regular", tam = 10 }: {
  c: PaletaCores; children: ReactNode; cor?: string; peso?: "regular" | "semi"; tam?: number;
}) {
  return (
    <Text
      style={{ fontSize: moderateScale(tam), color: cor ?? c["second-text"] }}
      className={peso === "semi" ? "font-Inter-SemiBold" : "font-Inter-Regular"}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

function IlustracaoBoasVindas({ c }: { c: PaletaCores }) {
  const chips: Dica[] = [
    { icone: "phone-portrait-outline", texto: "Dados só no aparelho" },
    { icone: "person-outline", texto: "Sem login" },
    { icone: "cloud-offline-outline", texto: "Funciona offline" },
  ];
  return (
    <View className="items-center">
      <Image
        source={require("../../../assets/images/logo-u.png")}
        style={{ width: 113, height: 120 }}
        resizeMode="contain"
      />
      <View className="flex-row flex-wrap justify-center gap-2 mt-6">
        {chips.map((chip) => (
          <View
            key={chip.texto}
            style={{ backgroundColor: c["card-background"], borderColor: c["lines-divisions"] }}
            className="flex-row items-center border rounded-full px-3 py-1.5"
          >
            <Ionicons name={chip.icone} size={12} color={c["active-icon"]} />
            <Text style={{ fontSize: moderateScale(10), color: c["second-text"] }} className="ml-1.5 font-Inter-Medium">
              {chip.texto}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function IlustracaoBotaoMais({ c }: { c: PaletaCores }) {
  // Mesmas opções/ícones/cores do MenuAcaoRapida.
  const opcoes: { icone: keyof typeof Ionicons.glyphMap; titulo: string; cor: string }[] = [
    { icone: "add-circle-outline", titulo: "Nova transação", cor: c["active-icon"] },
    { icone: "swap-horizontal-outline", titulo: "Transferência", cor: "#3B9CBD" },
    { icone: "document-attach-outline", titulo: "Importar extrato", cor: c["sucess-color"] },
    { icone: "flag-outline", titulo: "Nova meta", cor: c["warn-color"] },
    { icone: "calendar-outline", titulo: "Novo compromisso", cor: "#378ADD" },
  ];
  return (
    <View className="items-center w-full">
      <Cartao c={c} className="w-56">
        {opcoes.map((o, i) => (
          <View key={o.titulo} className={`flex-row items-center py-1.5 ${i > 0 ? "mt-0.5" : ""}`}>
            <View style={{ backgroundColor: `${o.cor}22` }} className="w-6 h-6 rounded-lg items-center justify-center">
              <Ionicons name={o.icone} size={13} color={o.cor} />
            </View>
            <View className="ml-2">
              <TextoP c={c} cor={c["main-text"]} tam={11}>{o.titulo}</TextoP>
            </View>
          </View>
        ))}
      </Cartao>
      <View className="mt-3 items-center">
        <Ionicons name="add-circle-sharp" size={48} color={c["active-icon"]} />
        <TextoP c={c} tam={9}>botão central da barra inferior</TextoP>
      </View>
    </View>
  );
}

function IlustracaoImportar({ c }: { c: PaletaCores }) {
  const linhas: { icone: keyof typeof Ionicons.glyphMap; nome: string; cat: string; valor: string }[] = [
    { icone: "fast-food-outline", nome: "iFood", cat: "Alimentação", valor: "- R$ 42,90" },
    { icone: "car-outline", nome: "Uber", cat: "Transporte", valor: "- R$ 18,50" },
    { icone: "flash-outline", nome: "Conta de luz", cat: "Contas", valor: "- R$ 136,00" },
  ];
  return (
    <View className="items-center w-full">
      <Cartao c={c} className="w-60 flex-row items-center">
        <Ionicons name="document-text-outline" size={20} color={c["sucess-color"]} />
        <View className="ml-2 flex-1">
          <TextoP c={c} cor={c["main-text"]} peso="semi" tam={11}>extrato_nubank.csv</TextoP>
          <TextoP c={c} tam={9}>CSV: Nubank • Inter • BB — ou OFX de qualquer banco</TextoP>
        </View>
      </Cartao>
      <Ionicons name="arrow-down" size={18} color={c["desactived-text"]} style={{ marginVertical: 6 }} />
      <Cartao c={c} className="w-60">
        {linhas.map((l) => (
          <View key={l.nome} className="flex-row items-center py-1">
            <View style={{ backgroundColor: `${c["active-icon"]}22` }} className="w-6 h-6 rounded-full items-center justify-center">
              <Ionicons name={l.icone} size={12} color={c["active-icon"]} />
            </View>
            <View className="ml-2 flex-1">
              <TextoP c={c} cor={c["main-text"]} tam={10}>{l.nome}</TextoP>
              <TextoP c={c} tam={8}>{l.cat}</TextoP>
            </View>
            <TextoP c={c} cor={c["error-color"]} tam={10}>{l.valor}</TextoP>
          </View>
        ))}
      </Cartao>
    </View>
  );
}

function IlustracaoContas({ c }: { c: PaletaCores }) {
  const contas = [
    { sigla: "nu", cor: "#8D11DA", nome: "Nubank", valor: "R$ 2.180,00", sub: "saldo" },
    { sigla: "CX", cor: "#0A5EB0", nome: "Caixa", valor: "R$ 1.940,00", sub: "saldo" },
    { sigla: "CI", cor: "#EC0000", nome: "Cartão Itaú", valor: "R$ 860,00", sub: "fatura fecha dia 3" },
  ];
  return (
    <Cartao c={c} className="w-64">
      {contas.map((ct, i) => (
        <View key={ct.nome} className={`flex-row items-center py-1.5 ${i > 0 ? "mt-0.5" : ""}`}>
          <View style={{ backgroundColor: ct.cor }} className="w-7 h-7 rounded-lg items-center justify-center">
            <Text style={{ fontSize: 10 }} className="text-white font-Inter-Bold">
              {ct.sigla}
            </Text>
          </View>
          <View className="ml-2 flex-1">
            <TextoP c={c} cor={c["main-text"]} tam={11}>{ct.nome}</TextoP>
            <TextoP c={c} tam={8}>{ct.sub}</TextoP>
          </View>
          <TextoP c={c} cor={i === 2 ? c["error-color"] : c["main-text"]} peso="semi" tam={11}>{ct.valor}</TextoP>
        </View>
      ))}
      <View style={{ borderColor: c["lines-divisions"] }} className="border-t mt-1.5 pt-1.5 flex-row items-center">
        <Ionicons name="swap-horizontal" size={12} color={c["active-icon"]} />
        <View className="ml-1.5">
          <TextoP c={c} tam={9}>Nubank → Caixa · transferência, não é gasto</TextoP>
        </View>
      </View>
    </Cartao>
  );
}

function IlustracaoInicio({ c }: { c: PaletaCores }) {
  const barras = [0.45, 0.7, 0.35, 0.9, 0.55, 0.3];
  return (
    <Cartao c={c} className="w-64">
      <TextoP c={c} tam={9}>Saldo do mês</TextoP>
      <TextoP c={c} cor={c["main-text"]} peso="semi" tam={20}>R$ 4.250,00</TextoP>
      <View className="flex-row gap-2 mt-2">
        <View style={{ backgroundColor: `${c["green-money"]}1A` }} className="flex-1 rounded-lg px-2 py-1.5">
          <TextoP c={c} tam={8}>Entradas</TextoP>
          <TextoP c={c} cor={c["green-money"]} peso="semi" tam={10}>R$ 6.800</TextoP>
        </View>
        <View style={{ backgroundColor: `${c["error-color"]}1A` }} className="flex-1 rounded-lg px-2 py-1.5">
          <TextoP c={c} tam={8}>Saídas</TextoP>
          <TextoP c={c} cor={c["error-color"]} peso="semi" tam={10}>R$ 2.550</TextoP>
        </View>
      </View>
      <View className="flex-row items-end justify-between h-14 mt-3 px-1">
        {barras.map((b, i) => (
          <View
            key={i}
            style={{ height: `${b * 100}%`, backgroundColor: i === 3 ? c["active-icon"] : `${c["active-icon"]}55` }}
            className="w-5 rounded-md"
          />
        ))}
      </View>
    </Cartao>
  );
}

function BarraProgresso({ c, rotulo, valor, progresso, cor }: {
  c: PaletaCores; rotulo: string; valor: string; progresso: number; cor: string;
}) {
  return (
    <View className="mt-2">
      <View className="flex-row justify-between mb-1">
        <TextoP c={c} cor={c["main-text"]} tam={10}>{rotulo}</TextoP>
        <TextoP c={c} tam={9}>{valor}</TextoP>
      </View>
      <View style={{ backgroundColor: c["lines-divisions"] }} className="h-1.5 rounded-full overflow-hidden">
        <View style={{ width: `${progresso * 100}%`, backgroundColor: cor }} className="h-full rounded-full" />
      </View>
    </View>
  );
}

function IlustracaoPlanejamento({ c }: { c: PaletaCores }) {
  const abas = ["Resumo", "Metas", "Orçamento", "Simulações"];
  return (
    <View className="w-64">
      <View className="flex-row gap-1 mb-2">
        {abas.map((a, i) => (
          <View
            key={a}
            style={{ backgroundColor: i === 1 ? c["active-icon"] : c["card-background"], borderColor: c["lines-divisions"] }}
            className="border rounded-full px-2 py-1"
          >
            <TextoP c={c} cor={i === 1 ? "#FFFFFF" : c["second-text"]} tam={8}>{a}</TextoP>
          </View>
        ))}
      </View>
      <Cartao c={c}>
        <View className="flex-row items-center">
          <Ionicons name="airplane-outline" size={14} color={c["warn-color"]} />
          <View className="ml-1.5">
            <TextoP c={c} cor={c["main-text"]} peso="semi" tam={10}>Meta: Viagem</TextoP>
          </View>
        </View>
        <BarraProgresso c={c} rotulo="R$ 3.250 de R$ 5.000" valor="65%" progresso={0.65} cor={c["warn-color"]} />
      </Cartao>
      <Cartao c={c} className="mt-2">
        <TextoP c={c} cor={c["main-text"]} peso="semi" tam={10}>Orçamento de outubro</TextoP>
        <BarraProgresso c={c} rotulo="Mercado" valor="R$ 620 / 800" progresso={0.775} cor={c["sucess-color"]} />
        <BarraProgresso c={c} rotulo="Lazer" valor="R$ 310 / 300" progresso={1} cor={c["error-color"]} />
      </Cartao>
    </View>
  );
}

function IlustracaoAgenda({ c }: { c: PaletaCores }) {
  const dias = ["S", "T", "Q", "Q", "S", "S", "D"];
  const comPonto = [1, 4];
  return (
    <View className="w-64">
      <Cartao c={c}>
        <View className="flex-row justify-between">
          {dias.map((d, i) => (
            <View key={i} className="items-center">
              <TextoP c={c} tam={8}>{d}</TextoP>
              <View
                style={{ backgroundColor: i === 4 ? c["active-icon"] : "transparent" }}
                className="w-6 h-6 rounded-full items-center justify-center mt-1"
              >
                <TextoP c={c} cor={i === 4 ? "#FFFFFF" : c["main-text"]} tam={10}>{String(12 + i)}</TextoP>
              </View>
              <View
                style={{ backgroundColor: comPonto.includes(i) ? c["warn-color"] : "transparent" }}
                className="w-1 h-1 rounded-full mt-1"
              />
            </View>
          ))}
        </View>
      </Cartao>
      <Cartao c={c} className="mt-2 flex-row items-center">
        <View style={{ backgroundColor: `${c["warn-color"]}22` }} className="w-8 h-8 rounded-xl items-center justify-center">
          <Ionicons name="notifications-outline" size={16} color={c["warn-color"]} />
        </View>
        <View className="ml-2 flex-1">
          <TextoP c={c} cor={c["main-text"]} peso="semi" tam={10}>Conta de luz vence amanhã</TextoP>
          <TextoP c={c} tam={9}>R$ 136,00 • lembrete do compromisso</TextoP>
        </View>
      </Cartao>
    </View>
  );
}

function IlustracaoDados({ c }: { c: PaletaCores }) {
  return (
    <View className="items-center">
      <View
        style={{ backgroundColor: `${c["sucess-color"]}1F` }}
        className="w-24 h-24 rounded-3xl items-center justify-center"
      >
        <Ionicons name="shield-checkmark-outline" size={44} color={c["sucess-color"]} />
      </View>
      <Cartao c={c} className="w-60 mt-5 flex-row items-center">
        <Ionicons name="cloud-upload-outline" size={18} color={c["active-icon"]} />
        <View className="ml-2 flex-1">
          <TextoP c={c} cor={c["main-text"]} peso="semi" tam={10}>Exportar dados</TextoP>
          <TextoP c={c} tam={9}>Perfil › Backup</TextoP>
        </View>
      </Cartao>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const SLIDES: Slide[] = [
  {
    id: "boasVindas",
    titulo: "Bem-vindo ao Unify",
    texto: "Suas finanças de todos os bancos num app só. Em poucos passos você vê como tudo funciona.",
    dicas: [],
    Ilustracao: IlustracaoBoasVindas,
  },
  {
    id: "botaoMais",
    titulo: "Tudo começa no +",
    texto: "O botão central da barra inferior é o atalho para registrar qualquer coisa, de qualquer tela.",
    dicas: [
      { icone: "add-circle-outline", texto: "Nova transação: valor, banco, categoria e data." },
      { icone: "flag-outline", texto: "Metas e compromissos abrem direto no Planejamento." },
    ],
    Ilustracao: IlustracaoBotaoMais,
  },
  {
    id: "contas",
    titulo: "Todas as suas contas",
    texto: "Crie contas de qualquer banco, carteira e cartão de crédito. O saldo de cada uma bate com o do banco.",
    dicas: [
      { icone: "swap-horizontal-outline", texto: "Dinheiro entre suas contas é transferência: não conta como gasto." },
      { icone: "card-outline", texto: "Cartão: veja a fatura aberta e use “Pagar fatura”." },
      { icone: "wallet-outline", texto: "Minhas contas fica na carteira do card de saldo da Início." },
    ],
    Ilustracao: IlustracaoContas,
  },
  {
    id: "importar",
    titulo: "Importe seu extrato",
    texto: "Em vez de digitar tudo, importe o CSV do Nubank, Inter ou BB — ou o OFX de qualquer banco.",
    dicas: [
      { icone: "sparkles-outline", texto: "As transações já chegam categorizadas." },
      { icone: "school-outline", texto: "Corrigiu uma categoria? O app aprende para as próximas." },
      { icone: "copy-outline", texto: "Importou o mesmo extrato duas vezes? Duplicadas são ignoradas." },
    ],
    Ilustracao: IlustracaoImportar,
  },
  {
    id: "inicio",
    titulo: "Seu mês num olhar",
    texto: "A tela Início mostra saldo, entradas, saídas e para onde o dinheiro está indo.",
    dicas: [
      { icone: "funnel-outline", texto: "Filtre por período, banco ou categoria." },
      { icone: "hand-left-outline", texto: "Segure uma transação para editar ou excluir." },
      { icone: "bar-chart-outline", texto: "O Relatório do mês compara seus gastos com o mês anterior." },
    ],
    Ilustracao: IlustracaoInicio,
  },
  {
    id: "planejamento",
    titulo: "Planeje e guarde",
    texto: "No Planejamento você define limites por categoria, acompanha metas e simula decisões.",
    dicas: [
      { icone: "pie-chart-outline", texto: "Orçamento: limite por categoria, com aviso aos 80% e ao estourar." },
      { icone: "flag-outline", texto: "Metas: vincule transações para ver o progresso." },
      { icone: "calculator-outline", texto: "Simulações: financiamento, empréstimo, investimento e câmbio." },
    ],
    Ilustracao: IlustracaoPlanejamento,
  },
  {
    id: "agenda",
    titulo: "Nunca esqueça uma conta",
    texto: "Cadastre compromissos e lembretes — o app avisa na hora certa.",
    dicas: [
      { icone: "calendar-outline", texto: "A Agenda (ícone no topo do Planejamento) mostra o mês inteiro." },
      { icone: "repeat-outline", texto: "Recorrências: salário e contas fixas entram no orçamento sozinhas." },
      { icone: "checkmark-circle-outline", texto: "Pagou? Marque como pago e vincule à transação." },
    ],
    Ilustracao: IlustracaoAgenda,
  },
  {
    id: "dados",
    titulo: "Seus dados, seu controle",
    texto: "Nada vai para a nuvem: tudo fica salvo só neste aparelho.",
    dicas: [
      { icone: "cloud-upload-outline", texto: "Faça backup em Perfil antes de trocar de celular." },
      { icone: "finger-print-outline", texto: "Ative o bloqueio com biometria em Perfil › Preferências." },
      { icone: "refresh-outline", texto: "Quer ver esta apresentação de novo? Perfil › Rever apresentação." },
    ],
    Ilustracao: IlustracaoDados,
  },
];

/* ------------------------------------------------------------------ */

type Props = {
  onConcluir: () => void;
  modo?: "primeiraVez" | "revisao";
};

/** Ponto do indicador de progresso — anima a largura ao ficar ativo. */
function Ponto({ ativo, c }: { ativo: boolean; c: PaletaCores }) {
  const v = useState(() => new Animated.Value(ativo ? 1 : 0))[0];
  useEffect(() => {
    Animated.timing(v, {
      toValue: ativo ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [ativo, v]);
  return (
    <Animated.View
      style={{
        height: 6,
        borderRadius: 3,
        width: v.interpolate({ inputRange: [0, 1], outputRange: [6, 20] }),
        backgroundColor: v.interpolate({
          inputRange: [0, 1],
          outputRange: [c["lines-divisions"], c["active-icon"]],
        }),
      }}
    />
  );
}

function OnboardingFluxoBase({ onConcluir, modo = "primeiraVez" }: Props) {
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { atualizarPerfil } = usePerfil();

  const scrollRef = useRef<ScrollView>(null);
  const [indice, setIndice] = useState(0);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  const comCadastro = modo === "primeiraVez";
  // Total de páginas = slides (+ a página de cadastro na primeira vez).
  const totalPaginas = SLIDES.length + (comCadastro ? 1 : 0);
  const ultimaPagina = totalPaginas - 1;
  const naUltima = indice === ultimaPagina;
  const naCadastro = comCadastro && naUltima;

  const irPara = useCallback(
    (i: number) => {
      const alvo = Math.max(0, Math.min(i, totalPaginas - 1));
      scrollRef.current?.scrollTo({ x: alvo * width, animated: true });
      setIndice(alvo);
    },
    [totalPaginas, width]
  );

  const aoRolar = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (i !== indice) setIndice(i);
    },
    [indice, width]
  );

  const nomeValido = nome.trim().length > 0;

  const concluirCadastro = useCallback(async () => {
    if (!nomeValido || salvando) return;
    setSalvando(true);
    try {
      await atualizarPerfil({ nome: nome.trim(), email: email.trim() || null });
      onConcluir();
    } catch {
      // Se falhar ao salvar o perfil, ainda deixa entrar no app — o
      // usuário pode completar o cadastro depois na tela de Perfil.
      onConcluir();
    } finally {
      setSalvando(false);
    }
  }, [nomeValido, salvando, atualizarPerfil, nome, email, onConcluir]);

  const textoBotao = naUltima ? "Entendi" : indice === 0 ? "Começar o tour" : "Avançar";
  const acaoBotao = naUltima ? onConcluir : () => irPara(indice + 1);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c["main-background"] }}>
      {/* Topo: voltar (a partir do 2º slide) e Pular/Fechar */}
      <View className="h-11 px-5 flex-row items-center justify-between">
        {indice > 0 && !naCadastro ? (
          <Pressable onPress={() => irPara(indice - 1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={20} color={c["second-text"]} />
          </Pressable>
        ) : (
          <View />
        )}
        {!naUltima && (
          <Pressable
            onPress={comCadastro ? () => irPara(ultimaPagina) : onConcluir}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={comCadastro ? "Pular apresentação" : "Fechar apresentação"}
          >
            <Text style={{ fontSize: moderateScale(13), color: c["second-text"] }} className="font-Inter-Medium">
              {comCadastro ? "Pular" : "Fechar"}
            </Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={aoRolar}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!naCadastro}
        >
          {SLIDES.map(({ id, titulo, texto, dicas, Ilustracao }) => (
            <ScrollView
              key={id}
              style={{ width }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="items-center mb-7">
                <Ilustracao c={c} />
              </View>
              <Text
                style={{ fontSize: moderateScale(22), letterSpacing: moderateScale(22) * -0.03, color: c["main-text"] }}
                className="font-Inter-SemiBold text-center mb-2"
              >
                {titulo}
              </Text>
              <Text
                style={{ fontSize: moderateScale(13), lineHeight: moderateScale(13) * 1.55, color: c["second-text"] }}
                className="text-center"
              >
                {texto}
              </Text>
              {dicas.length > 0 && (
                <View className="mt-5 gap-2.5">
                  {dicas.map((d) => (
                    <View key={d.texto} className="flex-row items-start">
                      <View
                        style={{ backgroundColor: `${c["active-icon"]}1F` }}
                        className="w-6 h-6 rounded-lg items-center justify-center mr-2.5"
                      >
                        <Ionicons name={d.icone} size={13} color={c["active-icon"]} />
                      </View>
                      <Text
                        style={{ fontSize: moderateScale(12), lineHeight: moderateScale(12) * 1.45, color: c["main-text"] }}
                        className="flex-1 pt-0.5"
                      >
                        {d.texto}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ))}

          {/* Página de cadastro (só na primeira vez) */}
          {comCadastro && (
            <View style={{ width }} className="px-8 justify-center">
              <Text
                style={{ fontSize: moderateScale(22), letterSpacing: moderateScale(22) * -0.03, color: c["main-text"] }}
                className="font-Inter-SemiBold mb-1"
              >
                Como podemos te chamar?
              </Text>
              <Text style={{ fontSize: moderateScale(12), color: c["second-text"] }} className="mb-6">
                Fica tudo salvo só neste aparelho. Você pode alterar depois em Perfil.
              </Text>

              <Text style={{ fontSize: moderateScale(11), color: c["second-text"] }} className="mb-1.5">
                Nome
              </Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                placeholderTextColor={c["desactived-text"]}
                style={{
                  fontSize: moderateScale(14),
                  color: c["main-text"],
                  backgroundColor: c["input-background"],
                  borderColor: c["input-border"],
                }}
                className="border rounded-xl px-3 py-3 mb-4"
                editable={!salvando}
                returnKeyType="next"
              />

              <View className="flex-row items-center justify-between mb-1.5">
                <Text style={{ fontSize: moderateScale(11), color: c["second-text"] }}>E-mail</Text>
                <Text style={{ fontSize: moderateScale(11), color: c["desactived-text"] }}>opcional</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seuemail@exemplo.com"
                placeholderTextColor={c["desactived-text"]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  fontSize: moderateScale(14),
                  color: c["main-text"],
                  backgroundColor: c["input-background"],
                  borderColor: c["input-border"],
                }}
                className="border rounded-xl px-3 py-3 mb-6"
                editable={!salvando}
                returnKeyType="done"
                onSubmitEditing={concluirCadastro}
              />

              <Pressable
                onPress={concluirCadastro}
                disabled={!nomeValido || salvando}
                style={{ backgroundColor: nomeValido && !salvando ? c["active-icon"] : `${c["active-icon"]}4D` }}
                className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Começar a usar o app"
              >
                <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
                  {salvando ? "Salvando..." : "Começar a usar"}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Rodapé: progresso + botão principal (não aparece no cadastro, que tem o próprio) */}
      <View style={{ paddingBottom: insets.bottom + 16 }} className="px-8 pt-3">
        <View className="flex-row items-center justify-center gap-2 mb-4">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <Ponto key={i} ativo={i === indice} c={c} />
          ))}
        </View>

        {!naCadastro && (
          <Pressable
            onPress={acaoBotao}
            style={{ backgroundColor: c["active-icon"] }}
            className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={textoBotao}
          >
            <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
              {textoBotao}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const OnboardingFluxo = memo(OnboardingFluxoBase);
