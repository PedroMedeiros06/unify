import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { useDialogo } from "@/context/DialogoContext";
import { usePerfil } from "@/context/PerfilContext";
import { FiltrosTransacao } from "@/database/queries";
import { exportarCsv, exportarPdf } from "@/utils/exportarTransacoes";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  filtros: FiltrosTransacao;
  quantidade: number; // transações com os filtros atuais (exibido)
};

/** Escolha do formato de exportação das transações filtradas na tela. */
function ExportarModalBase({ visivel, onFechar, filtros, quantidade }: Props) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const { perfil } = usePerfil();
  const [gerando, setGerando] = useState<"csv" | "pdf" | null>(null);

  const exportar = useCallback(
    async (formato: "csv" | "pdf") => {
      setGerando(formato);
      try {
        if (formato === "csv") await exportarCsv(filtros);
        else await exportarPdf(filtros, perfil.nome || "Usuário");
        onFechar();
      } catch (e) {
        await avisar({ titulo: "Não foi possível exportar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
      } finally {
        setGerando(null);
      }
    },
    [filtros, perfil.nome, onFechar, avisar]
  );

  const opcao = (formato: "csv" | "pdf", icone: keyof typeof Ionicons.glyphMap, titulo: string, texto: string) => (
    <Pressable
      onPress={() => exportar(formato)}
      disabled={gerando !== null}
      style={{ backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
      className="flex-row items-center gap-3 border rounded-xl p-3 mb-2 active:opacity-70"
      accessibilityRole="button"
    >
      <View style={{ backgroundColor: `${colors["active-icon"]}22` }} className="w-10 h-10 rounded-lg items-center justify-center">
        {gerando === formato ? (
          <ActivityIndicator color={colors["active-icon"]} />
        ) : (
          <Ionicons name={icone} size={20} color={colors["active-icon"]} />
        )}
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: moderateScale(14), color: colors["main-text"] }} className="font-Inter-Medium">
          {titulo}
        </Text>
        <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }}>{texto}</Text>
      </View>
    </Pressable>
  );

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={gerando !== null} overlayOpacidade={0.6}>
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: moderateScale(17), color: colors["main-text"] }} className="font-Inter-SemiBold">
          Exportar transações
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={gerando !== null} accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>
      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-4">
        {quantidade} transaç{quantidade === 1 ? "ão" : "ões"} com os filtros atuais.
      </Text>
      {opcao("csv", "grid-outline", "Planilha (CSV)", "Abre no Excel, Planilhas Google, LibreOffice")}
      {opcao("pdf", "document-text-outline", "Relatório (PDF)", "Totais, resumo por categoria e lista — bom para o contador")}
    </ModalCentralizado>
  );
}

export const ExportarModal = memo(ExportarModalBase);
