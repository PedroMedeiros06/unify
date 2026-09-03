import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { useTaxas } from "@/context/TaxasContext";

/**
 * Dropdown que lista as taxas de referência do Brasil (Selic, CDI,
 * poupança, IPCA), atualizadas em segundo plano pelo TaxasContext a
 * partir da API do Banco Central e cacheadas offline no SQLite — mesmo
 * esquema das cotações de câmbio.
 *
 * Ao escolher uma, chama `onSelecionar` com a taxa em % ao ano, para o
 * formulário preencher o campo de rentabilidade. É um atalho: o usuário
 * continua livre para digitar qualquer valor no campo depois.
 */

const rotuloSize = moderateScale(12);
const itemTextSize = moderateScale(13);

function formatarPct(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

type Props = {
  onSelecionar: (taxaAnualPct: number) => void;
  // % a.a. atualmente no campo — usado só para marcar qual item do menu
  // (se algum) bate com o valor atual.
  valorAtual?: number;
};

function SeletorTaxaReferenciaBase({ onSelecionar, valorAtual }: Props) {
  const { taxas, carregando } = useTaxas();

  // O seletor não guarda estado próprio: se o valor no campo de
  // rentabilidade bate com alguma taxa da lista, o trigger mostra o nome
  // dela; qualquer outro valor (o usuário editou à mão) volta a
  // "Selecionar".
  const taxaCasada =
    valorAtual !== undefined
      ? taxas.find((t) => Math.abs(valorAtual - t.valorAnualPct) < 0.005)
      : undefined;
  const rotuloTrigger = taxaCasada ? taxaCasada.nome : "Selecionar";

  return (
    <View className="flex-1">
      <Text style={{ fontSize: rotuloSize }} className="text-second-text mb-1.5">
        Usar taxa de referência
      </Text>

      <DropdownMenu
        larguraDoTrigger
        alinhamento="esquerda"
        trigger={({ abrir, aberto }) => (
          <Pressable
            onPress={abrir}
            className={`bg-input-background border rounded-xl px-3 py-3 flex-row items-center justify-between active:opacity-70 ${
              aberto ? "border-active-icon" : "border-input-border"
            }`}
            accessibilityRole="button"
            accessibilityLabel="Escolher uma taxa de referência"
          >
            <Text
              style={{ fontSize: itemTextSize }}
              className={`flex-1 mr-2 ${taxaCasada ? "text-main-text" : "text-second-text"}`}
              numberOfLines={1}
            >
              {rotuloTrigger}
            </Text>
            <Ionicons name="chevron-down" color={colors["active-icon"]} size={16} style={{ flexShrink: 0 }} />
          </Pressable>
        )}
      >
        {({ fechar }) => (
          <View className="py-1">
            {carregando && taxas.length === 0 ? (
              <Text style={{ fontSize: itemTextSize }} className="text-second-text px-3 py-3">
                Carregando taxas...
              </Text>
            ) : (
              taxas.map((taxa, index) => {
                const ativa =
                  valorAtual !== undefined && Math.abs(valorAtual - taxa.valorAnualPct) < 0.005;
                return (
                  <Pressable
                    key={taxa.codigo}
                    onPress={() => {
                      onSelecionar(taxa.valorAnualPct);
                      fechar();
                    }}
                    className={`px-3 py-2.5 flex-row items-center justify-between active:bg-input-background ${
                      index < taxas.length - 1 ? "border-b border-lines-divisions/50" : ""
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`${taxa.nome}: ${formatarPct(taxa.valorAnualPct)} ao ano`}
                  >
                    <View className="flex-1 mr-2">
                      <Text
                        style={{ fontSize: itemTextSize }}
                        className={ativa ? "text-active-icon font-Inter-Medium" : "text-main-text"}
                      >
                        {taxa.nome}
                      </Text>
                      <Text style={{ fontSize: rotuloSize }} className="text-desactived-text">
                        {formatarPct(taxa.valorAnualPct)} a.a.
                      </Text>
                    </View>
                    {ativa && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </DropdownMenu>
    </View>
  );
}

export const SeletorTaxaReferencia = memo(SeletorTaxaReferenciaBase);
