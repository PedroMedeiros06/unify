import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo } from "react";
import { MenuItem } from "./MenuItem";

function SuporteInformacoesBase() {
  const sectionTitleSize = moderateScale(15);

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
        titulo="Sobre o Unify"
        subtitulo="Versão 1.0.0"
      />
      <MenuItem
        icone="log-out-outline"
        titulo="Sair da conta"
        subtitulo="Encerrar sessão no aplicativo"
        destructive
        isLast
      />
    </View>
  );
}

export const SuporteInformacoes = memo(SuporteInformacoesBase);
