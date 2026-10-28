import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { SugestaoTransferencia } from "@/database/contasQueries";
import { SugestoesTransferencia } from "@/components/ImportacaoComp/SugestoesTransferencia";
import { SugestoesRecorrencia } from "@/components/RecorrenciasComp/SugestoesRecorrencia";

type Props = {
  totalImportado: number;
  totalSemCategoria: number;
  totalVinculadasMeta: number;
  totalDuplicadasIgnoradas: number;
  sugestoesTransferencia: SugestaoTransferencia[];
  onRevisarSemCategoria: () => void;
  onVoltarInicio: () => void;
  onImportarOutro: () => void;
};

/**
 * Resumo depois de importar: quantas entraram, quantas duplicadas
 * ficaram de fora, quantas sem categoria (com atalho para revisar), e
 * sugestões — pares que parecem transferência entre contas e gastos que
 * parecem recorrentes.
 */
function ImportacaoConcluidaBase({
  totalImportado,
  totalSemCategoria,
  totalVinculadasMeta,
  totalDuplicadasIgnoradas,
  sugestoesTransferencia,
  onRevisarSemCategoria,
  onVoltarInicio,
  onImportarOutro,
}: Props) {
  const colors = useThemeColors();
  const titleSize = moderateScale(17);
  const subtitleSize = moderateScale(13);
  const avisoSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  return (
    <View className="gap-4">
      <View
        style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
        className="border rounded-xl p-6 items-center"
      >
        <View
          style={{ backgroundColor: `${colors["sucess-color"]}33` }}
          className="w-16 h-16 rounded-full items-center justify-center mb-3"
        >
          <Ionicons name="checkmark" color={colors["sucess-color"]} size={32} />
        </View>

        <Text style={{ fontSize: titleSize, color: colors["main-text"] }} className="font-Inter-SemiBold mb-1 text-center">
          Importação concluída
        </Text>
        <Text style={{ fontSize: subtitleSize, color: colors["second-text"] }} className="text-center mb-4">
          {totalImportado} {totalImportado === 1 ? "transação foi adicionada" : "transações foram adicionadas"}
          {totalDuplicadasIgnoradas > 0
            ? `, ${totalDuplicadasIgnoradas} ${totalDuplicadasIgnoradas === 1 ? "duplicada ignorada" : "duplicadas ignoradas"}`
            : ""}
          .
        </Text>

        {totalVinculadasMeta > 0 && (
          <View style={{ backgroundColor: `${colors["active-icon"]}1A` }} className="w-full rounded-lg p-3 mb-3">
            <Text style={{ fontSize: avisoSize, color: colors["active-icon"] }}>
              🎯 {totalVinculadasMeta} {totalVinculadasMeta === 1 ? "transação foi vinculada" : "transações foram vinculadas"} a metas
              — o progresso já foi atualizado.
            </Text>
          </View>
        )}

        {totalSemCategoria > 0 && (
          <View style={{ backgroundColor: `${colors["warn-color"]}1A` }} className="w-full rounded-lg p-3 mb-3">
            <View className="flex-row items-start gap-2">
              <Ionicons name="pricetag-outline" color={colors["warn-color"]} size={16} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: avisoSize, color: colors["second-text"] }} className="flex-1">
                {totalSemCategoria} {totalSemCategoria === 1 ? "transação ficou" : "transações ficaram"} sem categoria. Ao
                categorizar, o app aprende para as próximas importações.
              </Text>
            </View>
            <Pressable onPress={onRevisarSemCategoria} className="self-start mt-2 ml-6" hitSlop={6} accessibilityRole="button">
              <Text style={{ fontSize: avisoSize, color: colors["warn-color"] }} className="font-Inter-SemiBold">
                Revisar agora →
              </Text>
            </Pressable>
          </View>
        )}

        <SugestoesTransferencia sugestoes={sugestoesTransferencia} />

        <Pressable
          onPress={onVoltarInicio}
          style={{ backgroundColor: colors["active-icon"] }}
          className="w-full py-3 rounded-xl items-center justify-center active:opacity-80 mb-2.5 mt-1"
          accessibilityRole="button"
          accessibilityLabel="Voltar para o início"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
            Concluir
          </Text>
        </Pressable>

        <Pressable
          onPress={onImportarOutro}
          style={{ borderColor: colors["input-border"] }}
          className="w-full py-3 rounded-xl items-center justify-center border active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Importar outro arquivo"
        >
          <Text style={{ fontSize: buttonTextSize, color: colors["second-text"] }} className="font-Inter-Medium">
            Importar outro arquivo
          </Text>
        </Pressable>
      </View>

      <SugestoesRecorrencia />
    </View>
  );
}

export const ImportacaoConcluida = memo(ImportacaoConcluidaBase);
