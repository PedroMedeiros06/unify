import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { memo } from "react";

export type StatTile = {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  rotulo: string;
  valor: string;
};

/**
 * Grade de 4 indicadores no topo do "Resultado da simulação" — mesmo
 * desenho do anexo: ícone colorido em círculo, rótulo pequeno acima,
 * valor grande e colorido abaixo. Renderiza em 4 colunas, quebrando em
 * 2x2 em telas estreitas via flex-wrap.
 */
function StatTilesSimulacaoBase({ tiles }: { tiles: StatTile[] }) {
  const rotuloSize = moderateScale(10);
  const valorSize = moderateScale(14);

  return (
    <View className="flex-row flex-wrap">
      {tiles.map((tile, i) => (
        <View
          key={tile.rotulo}
          className={`w-1/2 ${i % 2 === 0 ? "pr-1.5" : "pl-1.5"} ${i < 2 ? "mb-3" : ""}`}
        >
          <View className="bg-input-background border border-lines-divisions rounded-xl p-3">
            <View className="flex-row items-center gap-2 mb-1.5">
              <View
                style={{ backgroundColor: `${tile.cor}22` }}
                className="w-7 h-7 rounded-full items-center justify-center"
              >
                <Ionicons name={tile.icone} color={tile.cor} size={14} />
              </View>
              <Text style={{ fontSize: rotuloSize }} className="text-second-text flex-1" numberOfLines={2}>
                {tile.rotulo}
              </Text>
            </View>
            <Text style={{ fontSize: valorSize, color: tile.cor }} className="font-Inter-SemiBold" numberOfLines={1}>
              {tile.valor}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export const StatTilesSimulacao = memo(StatTilesSimulacaoBase);

/** Cores padrão dos tiles, na ordem em que aparecem no anexo. */
export const CORES_TILE = [
  colors["active-icon"],
  colors["sucess-color"],
  colors["warn-color"],
  "#378ADD",
] as const;
