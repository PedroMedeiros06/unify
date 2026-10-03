import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo } from "react";
import { MenuItem } from "./MenuItem";
import { useNavigation } from "@/context/NavigationContext";
import { useContas } from "@/context/ContasContext";
import { useCategorias } from "@/context/CategoriasContext";

/**
 * Atalhos de organização no Perfil: contas/cartões e categorias
 * personalizadas (as duas telas também são acessíveis de outros pontos —
 * carteira no card de saldo, "Nova categoria" no seletor).
 */
function OrganizacaoBase() {
  const { navigate } = useNavigation();
  const { contasAtivas } = useContas();
  const { personalizadas } = useCategorias();

  const qtdContas = contasAtivas.length;
  const qtdCategorias = personalizadas.filter((c) => !c.arquivada).length;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: moderateScale(15) }} className="text-main-text font-Inter-Medium mb-1">
        Organização
      </Text>
      <MenuItem
        icone="wallet-outline"
        titulo="Minhas contas"
        subtitulo={`${qtdContas} conta${qtdContas === 1 ? "" : "s"} e cartões, saldos e transferências`}
        onPress={() => navigate("contas")}
      />
      <MenuItem
        icone="pricetags-outline"
        titulo="Categorias"
        subtitulo={
          qtdCategorias > 0
            ? `${qtdCategorias} personalizada${qtdCategorias === 1 ? "" : "s"}`
            : "Crie categorias do seu jeito"
        }
        isLast
        onPress={() => navigate("categorias")}
      />
    </View>
  );
}

export const Organizacao = memo(OrganizacaoBase);
