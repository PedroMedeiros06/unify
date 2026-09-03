import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { memo } from "react";
import Constants from "expo-constants";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import changelog from "@/generated/changelog.json";

const VERSAO_APP = Constants.expoConfig?.version ?? "—";

// Linhas de trailer ("Co-Authored-By:", "Signed-off-by:" etc.) não
// interessam ao changelog do usuário — corta do fim do corpo.
function limparCorpo(corpo: string): string {
  const linhas = corpo.split("\n");
  while (linhas.length > 0) {
    const ultima = linhas[linhas.length - 1].trim();
    if (ultima === "" || /^[A-Za-z-]+:\s/.test(ultima)) {
      linhas.pop();
    } else {
      break;
    }
  }
  return linhas.join("\n").trim();
}

function formatarData(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

type Props = {
  visivel: boolean;
  onFechar: () => void;
};

function SobreUnifyModalBase({ visivel, onFechar }: Props) {
  const tituloSize = moderateScale(16);
  const versaoSize = moderateScale(12);
  const rotuloSize = moderateScale(11);
  const assuntoSize = moderateScale(13);
  const corpoSize = moderateScale(12);

  const temCommit = changelog.hash != null;
  const corpoLimpo = temCommit && changelog.corpo ? limparCorpo(changelog.corpo) : "";

  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar}>
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-SemiBold">
          Sobre a Unify
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <Text style={{ fontSize: versaoSize }} className="text-second-text mb-4">
        Versão {VERSAO_APP}
        {temCommit && changelog.hashCurto ? `  ·  ${changelog.hashCurto}` : ""}
      </Text>

      {temCommit ? (
        <>
          <Text
            style={{ fontSize: rotuloSize, letterSpacing: 1 }}
            className="text-desactived-text font-Inter-Medium mb-2"
          >
            NESTA ATUALIZAÇÃO
            {changelog.data ? ` · ${formatarData(changelog.data)}` : ""}
          </Text>

          <View className="bg-input-background border border-lines-divisions rounded-xl p-3">
            <Text
              style={{ fontSize: assuntoSize }}
              className="text-main-text font-Inter-SemiBold mb-2"
            >
              {changelog.assunto}
            </Text>
            {corpoLimpo ? (
              <Text
                style={{ fontSize: corpoSize, lineHeight: corpoSize * 1.5 }}
                className="text-second-text font-Inter-Regular"
              >
                {corpoLimpo}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={{ fontSize: corpoSize }} className="text-second-text">
          Notas desta versão indisponíveis.
        </Text>
      )}
    </ModalCentralizado>
  );
}

export const SobreUnifyModal = memo(SobreUnifyModalBase);
