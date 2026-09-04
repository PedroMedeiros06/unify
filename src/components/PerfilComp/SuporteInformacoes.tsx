import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useCallback, useMemo, useState } from "react";
import Constants from "expo-constants";
import { MenuItem } from "./MenuItem";
import { SobreUnifyModal } from "./SobreUnifyModal";
import { useResetApp } from "@/context/ResetAppContext";
import { useCotacoes } from "@/context/CotacoesContext";
import { useTaxas } from "@/context/TaxasContext";
import { useDialogo } from "@/context/DialogoContext";

// Versão exibida no "Sobre o Unify" — vem do app.json (expo.version),
// que é mantido igual ao package.json e às tags de commit (vX.Y.Z).
// Nunca hardcodar aqui, senão a tela e a versão real divergem.
const VERSAO_APP = Constants.expoConfig?.version ?? "—";

// "há 3 dias", "hoje" etc. a partir de um ISO. Aproximação simples —
// só para dar noção de quão fresco está o dado de câmbio/juros.
function tempoRelativo(iso: string | null): string {
  if (!iso) return "nunca sincronizado";
  const quando = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const diffMs = Date.now() - quando.getTime();
  if (Number.isNaN(diffMs)) return "data desconhecida";
  const dias = Math.floor(diffMs / 86_400_000);
  if (dias <= 0) return "atualizado hoje";
  if (dias === 1) return "atualizado ontem";
  if (dias < 30) return `atualizado há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "atualizado há 1 mês" : `atualizado há ${meses} meses`;
}

function SuporteInformacoesBase() {
  const sectionTitleSize = moderateScale(15);
  const { apagando, apagarDadosDoApp } = useResetApp();
  const { confirmar, avisar } = useDialogo();
  const [sobreAberto, setSobreAberto] = useState(false);

  const {
    atualizando: atualizandoCotacoes,
    ultimaAtualizacao: ultimaCotacoes,
    atualizarAgora: atualizarCotacoes,
  } = useCotacoes();
  const {
    atualizando: atualizandoTaxas,
    ultimaAtualizacao: ultimaTaxas,
    atualizarAgora: atualizarTaxas,
  } = useTaxas();

  const sincronizando = atualizandoCotacoes || atualizandoTaxas;

  // Subtítulo do item: usa o dado MAIS ANTIGO entre câmbio e juros —
  // "atualizado há X" só é verdade se os dois foram atualizados nesse
  // intervalo.
  const subtituloSync = useMemo(() => {
    if (sincronizando) return "Sincronizando...";
    const candidatos = [ultimaCotacoes, ultimaTaxas].filter(Boolean) as string[];
    if (candidatos.length === 0) return "Toque para sincronizar";
    const maisAntigo = candidatos.sort()[0];
    return `Câmbio e juros — ${tempoRelativo(maisAntigo)}`;
  }, [sincronizando, ultimaCotacoes, ultimaTaxas]);

  const handleSincronizar = useCallback(() => {
    if (sincronizando) return;
    void Promise.allSettled([atualizarCotacoes(), atualizarTaxas()]);
  }, [sincronizando, atualizarCotacoes, atualizarTaxas]);

  // O Unify não tem login/conta — não existe "sair da conta". A ação
  // equivalente aqui é apagar tudo que está salvo localmente e voltar
  // o app ao estado de primeiro uso.
  const handleApagarDados = useCallback(async () => {
    if (apagando) return;

    const ok = await confirmar({
      titulo: "Apagar dados do app",
      mensagem:
        "Isso remove permanentemente todas as transações, metas, compromissos, recorrências, limites e o perfil deste dispositivo. Não é possível desfazer.",
      textoConfirmar: "Apagar tudo",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await apagarDadosDoApp();
    } catch (e) {
      console.error("[SuporteInformacoes] Falha ao apagar dados:", e);
      await avisar({ titulo: "Erro", mensagem: "Não foi possível apagar os dados. Tente novamente." });
    }
  }, [apagando, apagarDadosDoApp, confirmar, avisar]);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Suporte e informações
      </Text>

      <MenuItem
        icone="sync-outline"
        titulo="Atualizar cotações e taxas"
        subtitulo={subtituloSync}
        onPress={handleSincronizar}
      />
      <MenuItem
        icone="document-text-outline"
        titulo="Sobre a Unify"
        subtitulo={`Versão ${VERSAO_APP} — ver novidades`}
        onPress={() => setSobreAberto(true)}
      />
      <MenuItem
        icone="trash-outline"
        titulo="Apagar dados do app"
        subtitulo={apagando ? "Apagando..." : "Apaga todos os dados do usuário da Unify"}
        destructive
        isLast
        onPress={handleApagarDados}
      />

      <SobreUnifyModal visivel={sobreAberto} onFechar={() => setSobreAberto(false)} />
    </View>
  );
}

export const SuporteInformacoes = memo(SuporteInformacoesBase);
