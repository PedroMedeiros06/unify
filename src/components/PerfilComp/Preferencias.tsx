import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useCallback, useState } from "react";
import { MenuItem } from "./MenuItem";

function PreferenciasBase() {
  const sectionTitleSize = moderateScale(15);

  // Estado local do toggle. Se precisar persistir entre sessões,
  // trocar por um hook de storage/preferences no futuro.
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  const handleToggleNotificacoes = useCallback((value: boolean) => {
    setNotificacoesAtivas(value);
  }, []);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Preferências
      </Text>

      <MenuItem
        icone="notifications-outline"
        titulo="Notificações"
        subtitulo="Configure alertas e lembretes"
        toggleValue={notificacoesAtivas}
        onToggleChange={handleToggleNotificacoes}
      />
      <MenuItem
        icone="color-palette-outline"
        titulo="Aparência"
        subtitulo="Tema escuro"
      />
      <MenuItem
        icone="language-outline"
        titulo="Idioma"
        subtitulo="Português (Brasil)"
        isLast
      />
    </View>
  );
}

export const Preferencias = memo(PreferenciasBase);
