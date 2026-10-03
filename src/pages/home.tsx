import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { moderateScale, scale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { Ionicons } from "@expo/vector-icons";
import { Resumo } from "@/components/HomeComp/Resumo";
import { UltimasTransacoes } from "@/components/HomeComp/UltimasTransacoes";
import { AnaliseGrafica } from "@/components/HomeComp/AnaliseGrafica";
import { BarraFiltros } from "@/components/common/BarraFiltros";
import { SeletorPeriodoPersonalizado } from "@/components/common/SeletorPeriodoPersonalizado";
import { useFiltrosTransacao } from "@/hooks/useFiltrosTransacao";
import { listarBancos, Banco } from "@/database/queries";
import { usePerfil } from "@/context/PerfilContext";
import { useNavigation } from "@/context/NavigationContext";
import { useNotificacoes } from "@/context/NotificacoesContext";

export function Home() {
  const colors = useThemeColors();
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);
  const avatarSize = moderateScale(40);

  // Vem do PerfilProvider (carregado uma vez no _layout.tsx) — sem
  // refetch nem delay a cada vez que a Home remonta.
  const { perfil } = usePerfil();
  const nomeUsuario = perfil.nome || "Usuário";

  const { navigate } = useNavigation();
  const { naoLidas } = useNotificacoes();

  // Estado de filtros LOCAL desta tela — independente do Planejamento
  // (ver decisão de escopo em useFiltrosTransacao.ts).
  const {
    filtros,
    alternarBanco,
    limparFiltroBanco,
    alternarCategoria,
    limparFiltroCategoria,
    definirPeriodoPreset,
    definirPeriodoPersonalizado,
    limparTodosFiltros,
    possuiFiltrosAtivos,
    filtrosParaQuery,
  } = useFiltrosTransacao({ presetInicial: "esteMes" });

  const [bancos, setBancos] = useState<Banco[]>([]);
  const [modalPeriodoAberto, setModalPeriodoAberto] = useState(false);

  useEffect(() => {
    listarBancos()
      .then(setBancos)
      .catch((e) => console.warn("[listarBancos] Falha ao carregar bancos:", e));
  }, []);

  const handleConfirmarPeriodo = useCallback(
    (inicioIso: string, fimIso: string) => {
      definirPeriodoPersonalizado(inicioIso, fimIso);
      setModalPeriodoAberto(false);
    },
    [definirPeriodoPersonalizado],
  );

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      removeClippedSubviews
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row justify-between items-center">
          <View className="flex-1">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.05 }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              Olá, {nomeUsuario}
            </Text>
            <Text
              style={{
                fontSize: subtitleSize,
                letterSpacing: subtitleSize * -0.04,
              }}
              className="text-second-text"
            >
              Aqui está o resumo de sua vida financeira.
            </Text>
          </View>

          <Pressable
            onPress={() => navigate("notificacoes")}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            }}
            className="bg-input-background border border-input-border/50 items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={
              naoLidas > 0
                ? `Notificações, ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`
                : "Notificações"
            }
          >
            <Ionicons
              name="notifications-outline"
              color={colors["desactived-text"]}
              size={scale(16)}
            />
            {naoLidas > 0 && (
              <View
                className="absolute bg-error-color rounded-full items-center justify-center border border-main-background"
                style={{
                  minWidth: scale(16),
                  height: scale(16),
                  paddingHorizontal: scale(3),
                  top: -scale(2),
                  right: -scale(2),
                }}
              >
                <Text
                  style={{ fontSize: scale(9), lineHeight: scale(12) }}
                  className="text-white font-Inter-Bold"
                >
                  {naoLidas > 9 ? "9+" : naoLidas}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* BODY */}
        <View className="flex-col gap-4">
          <Resumo />
          <UltimasTransacoes />

          <BarraFiltros
            bancos={bancos}
            filtros={filtros}
            possuiFiltrosAtivos={possuiFiltrosAtivos}
            onAlternarBanco={alternarBanco}
            onLimparBanco={limparFiltroBanco}
            onAlternarCategoria={alternarCategoria}
            onLimparCategoria={limparFiltroCategoria}
            onDefinirPeriodoPreset={definirPeriodoPreset}
            onAbrirPeriodoPersonalizado={() => setModalPeriodoAberto(true)}
            onLimparTodos={limparTodosFiltros}
          />
          <AnaliseGrafica filtrosParaQuery={filtrosParaQuery} />
        </View>
      </View>

      <SeletorPeriodoPersonalizado
        visivel={modalPeriodoAberto}
        inicioIso={filtros.periodoInicioPersonalizado}
        fimIso={filtros.periodoFimPersonalizado}
        onConfirmar={handleConfirmarPeriodo}
        onFechar={() => setModalPeriodoAberto(false)}
      />
    </ScrollView>
  );
}