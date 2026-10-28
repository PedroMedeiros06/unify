import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Switch } from "react-native";
import { memo } from "react";

type MenuItemProps = {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  subtitulo: string;
  isLast?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  // Se informado, o item vira um toggle em vez de navegação por seta
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  // Item puramente informativo: sem seta ">", sem Pressable, sem
  // accessibilityRole="button". Para linhas que só EXIBEM um valor fixo
  // (ex.: "Aparência: Tema escuro", "Idioma: Português") e não abrem
  // nada ao toque. Ignorado se for toggle ou se houver onPress.
  somenteLeitura?: boolean;
};

function MenuItemBase({
  icone,
  titulo,
  subtitulo,
  isLast = false,
  destructive = false,
  onPress,
  toggleValue,
  onToggleChange,
  somenteLeitura = false,
}: MenuItemProps) {
  const colors = useThemeColors();
  const tituloSize = moderateScale(14);
  const subtituloSize = moderateScale(11);

  const isToggle = toggleValue !== undefined;
  const isSomenteLeitura = somenteLeitura && !isToggle && !onPress;
  const iconColor = destructive ? colors["error-color"] : colors["active-icon"];
  const iconBg = destructive ? `${colors["error-color"]}22` : `${colors["active-icon"]}22`;

  const content = (
    <View
      className={`flex-row items-center gap-3 py-3 ${isLast ? "" : "border-b border-lines-divisions"}`}
    >
      <View
        style={{ backgroundColor: iconBg }}
        className="w-9 h-9 rounded-lg items-center justify-center flex-shrink-0"
      >
        <Ionicons name={icone} color={iconColor} size={17} />
      </View>

      <View className="flex-1">
        <Text
          style={{ fontSize: tituloSize }}
          className={destructive ? "text-error-color font-Inter-Medium" : "text-main-text font-Inter-Medium"}
          numberOfLines={1}
        >
          {titulo}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>

      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          trackColor={{ false: colors["lines-divisions"], true: colors["active-icon"] }}
          thumbColor="#fff"
        />
      ) : isSomenteLeitura ? null : (
        <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
      )}
    </View>
  );

  if (isToggle || isSomenteLeitura) {
    // Toggle: o próprio Switch já é a área de toque.
    // Somente leitura: não há ação nenhuma — não embrulha em Pressable
    // nem anuncia como botão para leitores de tela.
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-60"
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      {content}
    </Pressable>
  );
}

export const MenuItem = memo(MenuItemBase);
