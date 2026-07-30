import { Text, View } from "react-native";
import { moderateScale, scale } from "../utils/scale"; // Importe apenas o moderateScale
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Resumo } from "@/components/HomeComp/resumo";
import { UltimasTransacoes } from "@/components/HomeComp/UltimasTransacoes";

export function Home() {
  const titleSize = moderateScale(20);
  const subtitleSize = moderateScale(12);
  const avatarSize = moderateScale(40);

  return (
    <View className="flex-1 gap-4">
      {/* HEADER */}
      <View className="w-full flex-row justify-between items-center ">
        <View className="flex-1">
          <Text 
            style={{  fontSize: titleSize,  letterSpacing: titleSize * -0.05 }}
            className="text-main-text font-Inter-SemiBold"
          >
            Olá Usuário
          </Text>
          
          <Text 
            style={{ fontSize: subtitleSize, letterSpacing: subtitleSize * -0.04 }}
            className="text-second-text"
          >
            Aqui está o resumo de sua vida financeira.
          </Text>
        </View>

        <View 
          style={{ width: avatarSize, height: avatarSize,  borderRadius: avatarSize / 2 }}
          className="bg-input-background border border-input-border/50 flex items-center justify-center"
        >
          <Ionicons name="notifications-outline" color={colors["desactived-text"]} size={scale(16)} />
        </View>
      </View>

      {/* BODY */}
      <View className="flex-col gap-4">
        <Resumo />
        <UltimasTransacoes />
      </View>
    </View>

  );
}