// app/_layout.tsx
import "../global.css"
import { Slot } from "expo-router";
import { ThemeProvider } from "../components/theme.provider"
import { useAppFonts } from "@/theme/fonts";


export default function RootLayout() {

  const [LoadedFonts] = useAppFonts()
  if (!LoadedFonts) return null 

  return (
    <ThemeProvider name="default">
      <Slot />
    </ThemeProvider>
  );
}