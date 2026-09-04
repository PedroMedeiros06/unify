import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { memo, useCallback, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePerfil } from "@/context/PerfilContext";

/**
 * Fluxo de primeira abertura: alguns slides apresentando o app e, no
 * último passo, um formulário de "cadastro" local (nome obrigatório,
 * e-mail opcional). Não usa biblioteca de carrossel — é uma ScrollView
 * horizontal com pagingEnabled e um índice controlado.
 *
 * `onConcluir` é chamado quando o usuário termina o cadastro (ou pula o
 * e-mail): quem monta este componente (AppIndex) grava a flag de
 * onboarding e passa a renderizar o app normal.
 */

type Slide = {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto: string;
};

const SLIDES: Slide[] = [
  {
    icone: "wallet-outline",
    titulo: "Tudo num lugar só",
    texto:
      "Registre transações, acompanhe o saldo de cada banco e veja para onde o dinheiro está indo, por categoria.",
  },
  {
    icone: "flag-outline",
    titulo: "Metas, agenda e lembretes",
    texto:
      "Defina objetivos de guardar dinheiro, agende contas a pagar e receba lembretes na hora certa.",
  },
  {
    icone: "calculator-outline",
    titulo: "Simule antes de decidir",
    texto:
      "Financiamento, empréstimo, investimento e câmbio: veja parcelas, juros e custo total na hora.",
  },
];

function OnboardingFluxoBase({ onConcluir }: { onConcluir: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { atualizarPerfil } = usePerfil();

  const scrollRef = useRef<ScrollView>(null);
  const [indice, setIndice] = useState(0);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Total de páginas = slides + a página de cadastro.
  const totalPaginas = SLIDES.length + 1;
  const paginaCadastro = SLIDES.length;
  const naUltima = indice === paginaCadastro;

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

  const concluir = useCallback(async () => {
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

  return (
    <View className="flex-1 bg-main-background" style={{ paddingTop: insets.top }}>
      {/* Topo: "Pular" (só nos slides, vai direto ao cadastro) */}
      <View className="h-10 px-5 flex-row items-center justify-end">
        {!naUltima && (
          <Pressable
            onPress={() => irPara(paginaCadastro)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Pular apresentação"
          >
            <Text style={{ fontSize: moderateScale(13) }} className="text-second-text font-Inter-Medium">
              Pular
            </Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={aoRolar}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!naUltima}
        >
          {SLIDES.map((slide) => (
            <View key={slide.titulo} style={{ width }} className="px-8 items-center justify-center">
              <View
                style={{ backgroundColor: `${colors["active-icon"]}1F` }}
                className="w-24 h-24 rounded-3xl items-center justify-center mb-8"
              >
                <Ionicons name={slide.icone} color={colors["active-icon"]} size={44} />
              </View>
              <Text
                style={{ fontSize: moderateScale(22), letterSpacing: moderateScale(22) * -0.03 }}
                className="text-main-text font-Inter-SemiBold text-center mb-3"
              >
                {slide.titulo}
              </Text>
              <Text
                style={{ fontSize: moderateScale(13), lineHeight: moderateScale(13) * 1.6 }}
                className="text-second-text text-center"
              >
                {slide.texto}
              </Text>
            </View>
          ))}

          {/* Página de cadastro */}
          <View style={{ width }} className="px-8 justify-center">
            <Text
              style={{ fontSize: moderateScale(22), letterSpacing: moderateScale(22) * -0.03 }}
              className="text-main-text font-Inter-SemiBold mb-1"
            >
              Como podemos te chamar?
            </Text>
            <Text style={{ fontSize: moderateScale(12) }} className="text-second-text mb-6">
              Fica tudo salvo só neste aparelho. Você pode alterar depois em Perfil.
            </Text>

            <Text style={{ fontSize: moderateScale(11) }} className="text-second-text mb-1.5">
              Nome
            </Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome"
              placeholderTextColor={colors["desactived-text"]}
              style={{ fontSize: moderateScale(14), color: colors["main-text"] }}
              className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
              editable={!salvando}
              returnKeyType="next"
            />

            <View className="flex-row items-center justify-between mb-1.5">
              <Text style={{ fontSize: moderateScale(11) }} className="text-second-text">
                E-mail
              </Text>
              <Text style={{ fontSize: moderateScale(11) }} className="text-desactived-text">
                opcional
              </Text>
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seuemail@exemplo.com"
              placeholderTextColor={colors["desactived-text"]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{ fontSize: moderateScale(14), color: colors["main-text"] }}
              className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-6"
              editable={!salvando}
              returnKeyType="done"
              onSubmitEditing={concluir}
            />

            <Pressable
              onPress={concluir}
              disabled={!nomeValido || salvando}
              className={`w-full py-3.5 rounded-xl items-center justify-center ${
                nomeValido && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"
              }`}
              accessibilityRole="button"
              accessibilityLabel="Começar a usar o app"
            >
              <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
                {salvando ? "Salvando..." : "Começar a usar"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Rodapé: bolinhas de progresso + botão Avançar (só nos slides) */}
      <View style={{ paddingBottom: insets.bottom + 16 }} className="px-8 pt-4">
        <View className="flex-row items-center justify-center gap-2 mb-4">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === indice ? "bg-active-icon w-5" : "bg-lines-divisions w-1.5"}`}
            />
          ))}
        </View>

        {!naUltima && (
          <Pressable
            onPress={() => irPara(indice + 1)}
            className="w-full py-3.5 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Avançar"
          >
            <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
              Avançar
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const OnboardingFluxo = memo(OnboardingFluxoBase);
