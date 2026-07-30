import { useFonts } from "expo-font";

export function useAppFonts() {
  return useFonts({
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.otf"),
    "Inter-Medium": require("../../assets/fonts/Inter-Medium.otf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.otf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.otf"),
    "Inter-Italic": require("../../assets/fonts/Inter-Italic.otf"),
    "Inter-BoldItalic": require("../../assets/fonts/Inter-BoldItalic.otf")
  });
}   