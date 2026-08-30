import { moderateScale } from "@/utils/scale";
import { View, Text, Alert } from "react-native";
import { memo, useCallback } from "react";
import Constants from "expo-constants";
import { MenuItem } from "./MenuItem";
import { useResetApp } from "@/context/ResetAppContext";

// Versão exibida no "Sobre o Unify" — vem do app.json (expo.version),
// que é mantido igual ao package.json e às tags de commit (vX.Y.Z).
// Nunca hardcodar aqui, senão a tela e a versão real divergem.
const VERSAO_APP = Constants.expoConfig?.version ?? "—";

function SuporteInformacoesBase() {
  const sectionTitleSize = moderateScale(15);
  const { apagando, apagarDadosDoApp } = useResetApp();

  // O Unify não tem login/conta — não existe "sair da conta". A ação
  // equivalente aqui é apagar tudo que está salvo localmente e voltar
  // o app ao estado de primeiro uso.
  const handleApagarDados = useCallback(() => {
    if (apagando) return;

    Alert.alert(
      "Apagar dados do app",
      "Isso remove permanentemente todas as transações, metas, compromissos, recorrências, limites e o perfil deste dispositivo. Não é possível desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: () => {
            apagarDadosDoApp().catch((e) => {
              console.error("[SuporteInformacoes] Falha ao apagar dados:", e);
              Alert.alert("Erro", "Não foi possível apagar os dados. Tente novamente.");
            });
          },
        },
      ]
    );
  }, [apagando, apagarDadosDoApp]);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Suporte e informações
      </Text>

      <MenuItem
        icone="help-circle-outline"
        titulo="Central de ajuda"
        subtitulo="Tire suas dúvidas"
      />
      <MenuItem
        icone="mail-outline"
        titulo="Fale conosco"
        subtitulo="Entre em contato com nossa equipe"
      />
      <MenuItem
        icone="document-text-outline"
        titulo="Sobre a Unify"
        subtitulo={`Versão ${VERSAO_APP}`}
      />
      <MenuItem
        icone="trash-outline"
        titulo="Apagar dados do app"
        subtitulo={apagando ? "Apagando..." : "Apaga todos os dados do usuário da Unify"}
        destructive
        isLast
        onPress={handleApagarDados}
      />
    </View>
  );
}

export const SuporteInformacoes = memo(SuporteInformacoesBase);
