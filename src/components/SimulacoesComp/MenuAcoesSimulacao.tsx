import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, Pressable, Share } from "react-native";
import { memo, useEffect, useState } from "react";
import { SimulacaoSalva } from "@/database/simulacoesQueries";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { TIPOS_SIMULACAO } from "@/components/SimulacoesComp/SeletorTipoSimulacao";
import { compartilharSimulacaoPdf } from "@/utils/exportarSimulacaoPdf";
import { useDialogo } from "@/context/DialogoContext";

type Props = {
  // Quando não-null, o menu está aberto para essa simulação.
  simulacao: SimulacaoSalva | null;
  onFechar: () => void;
  // Reabre o simulador com os parâmetros salvos (volta ao ponto em que
  // a simulação foi feita). Não altera nem apaga nada.
  onRestaurar: (s: SimulacaoSalva) => void;
  onExcluir: (id: string) => void;
  textoCompartilhar: (s: SimulacaoSalva) => string;
};

function LinhaAcao({
  icone,
  rotulo,
  cor,
  primeira,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  cor?: string;
  primeira?: boolean;
  onPress: () => void;
}) {
  const textoSize = moderateScale(14);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${
        primeira ? "" : "border-t border-lines-divisions/50"
      }`}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
    >
      <Ionicons name={icone} color={cor ?? colors["main-text"]} size={19} />
      <Text
        style={{ fontSize: textoSize, color: cor ?? colors["main-text"] }}
        className="font-Inter-Medium"
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

function MenuAcoesSimulacaoBase({ simulacao, onFechar, onRestaurar, onExcluir, textoCompartilhar }: Props) {
  const { avisar } = useDialogo();
  const tituloSize = moderateScale(15);
  const subSize = moderateScale(11);

  // Passo interno: "menu" (ações) ou "confirmarExclusao" (Tem certeza?).
  // Volta pra "menu" toda vez que o modal reabre.
  const [passo, setPasso] = useState<"menu" | "confirmarExclusao">("menu");
  // Enquanto o PDF é gerado (printToFileAsync pode levar ~1s).
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (simulacao) {
      setPasso("menu");
      setGerandoPdf(false);
    }
  }, [simulacao]);

  const handleCompartilharPdf = async () => {
    if (!simulacao || gerandoPdf) return;
    setGerandoPdf(true);
    try {
      const ok = await compartilharSimulacaoPdf(simulacao);
      if (!ok) {
        await avisar({
          titulo: "Indisponível",
          mensagem: "O compartilhamento de arquivos não está disponível neste dispositivo.",
        });
      }
      onFechar();
    } catch {
      await avisar({ titulo: "Não foi possível gerar o PDF", mensagem: "Tente novamente em instantes." });
    } finally {
      setGerandoPdf(false);
    }
  };

  const meta = simulacao ? TIPOS_SIMULACAO.find((t) => t.tipo === simulacao.tipo) : undefined;

  return (
    <ModalCentralizado
      visivel={simulacao !== null}
      onFechar={onFechar}
      // Card padrão; só o fundo ao redor fica bem escuro para destacar
      // que é outro menu por cima da tela.
      overlayOpacidade={0.6}
    >
      {simulacao && (
        <>
          {/* Cabeçalho — ícone do tipo + título da simulação */}
          <View className="flex-row items-center gap-3 mb-4">
            {meta && (
              <View
                style={{ backgroundColor: `${meta.cor}22` }}
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name={meta.icone} color={meta.cor} size={17} />
              </View>
            )}
            <View className="flex-1">
              <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-SemiBold" numberOfLines={1}>
                {simulacao.titulo}
              </Text>
              <Text style={{ fontSize: subSize }} className="text-desactived-text" numberOfLines={1}>
                {passo === "menu" ? "O que deseja fazer?" : "Esta ação não pode ser desfeita."}
              </Text>
            </View>
            <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <Ionicons name="close" color={colors["second-text"]} size={22} />
            </Pressable>
          </View>

          {passo === "menu" ? (
            <View>
              <LinhaAcao
                primeira
                icone="refresh-outline"
                rotulo="Restaurar simulação"
                onPress={() => {
                  onRestaurar(simulacao);
                  onFechar();
                }}
              />
              <LinhaAcao
                icone="chatbox-ellipses-outline"
                rotulo="Compartilhar como texto"
                onPress={() => {
                  void Share.share({ message: textoCompartilhar(simulacao) });
                  onFechar();
                }}
              />
              <LinhaAcao
                icone="document-outline"
                rotulo={gerandoPdf ? "Gerando PDF..." : "Compartilhar como PDF"}
                onPress={handleCompartilharPdf}
              />
              <LinhaAcao
                icone="trash-outline"
                rotulo="Excluir"
                cor={colors["error-color"]}
                onPress={() => setPasso("confirmarExclusao")}
              />
            </View>
          ) : (
            <View className="flex-row gap-2.5 mt-1">
              <Pressable
                onPress={() => setPasso("menu")}
                className="flex-1 py-3 rounded-xl items-center justify-center border border-input-border active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Cancelar exclusão"
              >
                <Text style={{ fontSize: moderateScale(14) }} className="text-second-text font-Inter-Medium">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onExcluir(simulacao.id);
                  onFechar();
                }}
                className="flex-1 py-3 rounded-xl items-center justify-center bg-error-color active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Confirmar exclusão"
              >
                <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
                  Excluir
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </ModalCentralizado>
  );
}

export const MenuAcoesSimulacao = memo(MenuAcoesSimulacaoBase);
