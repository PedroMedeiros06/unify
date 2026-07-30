import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo } from "react";
import { MenuItem } from "./MenuItem";

function ContaSegurancaBase() {
  const sectionTitleSize = moderateScale(15);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Conta e segurança
      </Text>

      <MenuItem
        icone="person-outline"
        titulo="Dados pessoais"
        subtitulo="Nome, e-mail, telefone e endereço"
      />
      <MenuItem
        icone="shield-checkmark-outline"
        titulo="Segurança"
        subtitulo="Senha, autenticação e dispositivos"
      />
      <MenuItem
        icone="eye-outline"
        titulo="Privacidade"
        subtitulo="Gerencie seus dados e permissões"
      />
      <MenuItem
        icone="business-outline"
        titulo="Conectar novos bancos"
        subtitulo="Gerencie as instituições conectadas"
        isLast
      />
    </View>
  );
}

export const ContaSeguranca = memo(ContaSegurancaBase);
