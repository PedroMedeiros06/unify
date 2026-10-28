import { moderateScale } from "@/utils/scale";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useState } from "react";
import { MenuItem } from "./MenuItem";
import { verificarDisponibilidadeBloqueio, autenticar } from "@/utils/autenticacaoLocal";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { usePerfil } from "@/context/PerfilContext";
import { useCompromissos } from "@/context/CompromissosContext";
import { useLembretes } from "@/context/LembretesContext";
import { useNotificacoes } from "@/context/NotificacoesContext";
import { useDialogo } from "@/context/DialogoContext";
import { useTema } from "@/components/theme.provider";
import { useThemeColors } from "@/theme/useThemeColors";
import type { TemaPreferido } from "@/database/perfilQueries";

const OPCOES_TEMA: { valor: TemaPreferido; rotulo: string; descricao: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { valor: "sistema", rotulo: "Automático", descricao: "Segue o tema do aparelho", icone: "phone-portrait-outline" },
  { valor: "claro", rotulo: "Claro", descricao: "Sempre no tema claro", icone: "sunny-outline" },
  { valor: "escuro", rotulo: "Escuro", descricao: "Sempre no tema escuro", icone: "moon-outline" },
];

function PreferenciasBase() {
  const sectionTitleSize = moderateScale(15);

  const { perfil, carregando, atualizarPerfil } = usePerfil();
  const { ressincronizarNotificacoes: ressincronizarCompromissos } = useCompromissos();
  const { ressincronizarNotificacoes: ressincronizarLembretes } = useLembretes();
  const { recarregar: recarregarHistoricoNotificacoes } = useNotificacoes();
  const { avisar } = useDialogo();
  const { temaPreferido, definirTema } = useTema();
  const colors = useThemeColors();

  // true enquanto o toggle está aplicando a mudança (cancelar/reagendar
  // todas as notificações pode levar um instante). Bloqueia toques
  // repetidos e mostra o estado no subtítulo.
  const [aplicando, setAplicando] = useState(false);
  const [modalTemaAberto, setModalTemaAberto] = useState(false);

  const notificacoesAtivas = perfil.notificacoesAtivas;
  const rotuloTemaAtual =
    OPCOES_TEMA.find((o) => o.valor === temaPreferido)?.rotulo ?? "Automático";

  const handleEscolherTema = useCallback(
    async (valor: TemaPreferido) => {
      setModalTemaAberto(false);
      if (valor === temaPreferido) return;
      try {
        await definirTema(valor);
      } catch (e) {
        console.error("[Preferencias] Falha ao trocar tema:", e);
        await avisar({
          titulo: "Não foi possível alterar",
          mensagem: "Ocorreu um erro ao trocar o tema. Tente novamente.",
        });
      }
    },
    [temaPreferido, definirTema, avisar]
  );

  // Ligar o bloqueio exige que o aparelho tenha alguma trava (biometria
  // ou PIN) e uma autenticação na hora — confirma que o usuário consegue
  // desbloquear antes de prender o app. Desligar também pede, para
  // ninguém com o celular desbloqueado na mão tirar a proteção.
  const [aplicandoBloqueio, setAplicandoBloqueio] = useState(false);
  const handleToggleBloqueio = useCallback(
    async (novoValor: boolean) => {
      if (aplicandoBloqueio || carregando) return;
      setAplicandoBloqueio(true);
      try {
        if (novoValor) {
          const disp = await verificarDisponibilidadeBloqueio();
          if (!disp.disponivel) {
            await avisar({ titulo: "Bloqueio indisponível", mensagem: disp.motivo });
            return;
          }
        }
        const ok = await autenticar(novoValor ? "Confirme para ativar o bloqueio" : "Confirme para desativar o bloqueio");
        if (!ok) return;
        await atualizarPerfil({ bloqueioAtivo: novoValor });
      } finally {
        setAplicandoBloqueio(false);
      }
    },
    [aplicandoBloqueio, carregando, atualizarPerfil, avisar]
  );

  const handleToggleNotificacoes = useCallback(
    async (novoValor: boolean) => {
      if (aplicando || carregando) return;
      setAplicando(true);
      try {
        // 1) Persiste a preferência ANTES de reagendar — assim
        //    agendarNotificacao*, que relê essa flag do banco, já vê o
        //    novo valor ao ser chamado pela ressincronização.
        await atualizarPerfil({ notificacoesAtivas: novoValor });

        // 2) Aplica em massa: liga -> reagenda pendentes futuros;
        //    desliga -> cancela tudo que estava agendado.
        await Promise.all([
          ressincronizarCompromissos(novoValor),
          ressincronizarLembretes(novoValor),
        ]);

        // 3) O histórico pode ter ganhado/perdido linhas agendadas.
        await recarregarHistoricoNotificacoes();
      } catch (e) {
        console.error("[Preferencias] Falha ao alternar notificações:", e);
        // Reverte a preferência se algo falhou no meio.
        await atualizarPerfil({ notificacoesAtivas: !novoValor }).catch(() => {});
        await avisar({
          titulo: "Não foi possível alterar",
          mensagem: "Ocorreu um erro ao ajustar as notificações. Tente novamente.",
        });
      } finally {
        setAplicando(false);
      }
    },
    [
      aplicando,
      carregando,
      atualizarPerfil,
      ressincronizarCompromissos,
      ressincronizarLembretes,
      recarregarHistoricoNotificacoes,
      avisar,
    ]
  );

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Preferências
      </Text>

      <MenuItem
        icone="notifications-outline"
        titulo="Notificações"
        subtitulo={
          aplicando
            ? "Aplicando..."
            : notificacoesAtivas
              ? "Lembretes e avisos de vencimento ativados"
              : "Você não receberá lembretes nem avisos de vencimento"
        }
        toggleValue={notificacoesAtivas}
        onToggleChange={handleToggleNotificacoes}
      />
      <MenuItem
        icone="finger-print-outline"
        titulo="Bloqueio do app"
        subtitulo={
          aplicandoBloqueio
            ? "Aguardando confirmação..."
            : perfil.bloqueioAtivo
              ? "Pede biometria ou senha do aparelho ao abrir"
              : "Proteja seus dados com biometria ou senha"
        }
        toggleValue={perfil.bloqueioAtivo}
        onToggleChange={handleToggleBloqueio}
      />
      <MenuItem
        icone="color-palette-outline"
        titulo="Aparência"
        subtitulo={rotuloTemaAtual}
        onPress={() => setModalTemaAberto(true)}
      />
      <MenuItem
        icone="language-outline"
        titulo="Idioma"
        subtitulo="Português (Brasil)"
        somenteLeitura
        isLast
      />

      <ModalCentralizado visivel={modalTemaAberto} onFechar={() => setModalTemaAberto(false)}>
        <View className="flex-row justify-between items-center mb-4">
          <Text style={{ fontSize: moderateScale(16) }} className="text-main-text font-Inter-SemiBold">
            Aparência
          </Text>
          <Pressable
            onPress={() => setModalTemaAberto(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" color={colors["second-text"]} size={22} />
          </Pressable>
        </View>

        <View className="gap-2">
          {OPCOES_TEMA.map((opcao) => {
            const selecionada = opcao.valor === temaPreferido;
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => handleEscolherTema(opcao.valor)}
                className={`flex-row items-center gap-3 border rounded-xl p-3 ${
                  selecionada
                    ? "border-active-icon bg-active-icon/10"
                    : "border-lines-divisions bg-input-background active:opacity-70"
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionada }}
                accessibilityLabel={`${opcao.rotulo}. ${opcao.descricao}`}
              >
                <View
                  style={{ backgroundColor: `${colors["active-icon"]}22` }}
                  className="w-9 h-9 rounded-full items-center justify-center shrink-0"
                >
                  <Ionicons name={opcao.icone} color={colors["active-icon"]} size={17} />
                </View>
                <View className="flex-1">
                  <Text style={{ fontSize: moderateScale(13) }} className="text-main-text font-Inter-Medium">
                    {opcao.rotulo}
                  </Text>
                  <Text style={{ fontSize: moderateScale(11) }} className="text-desactived-text">
                    {opcao.descricao}
                  </Text>
                </View>
                {selecionada && (
                  <Ionicons name="checkmark-circle" color={colors["active-icon"]} size={18} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ModalCentralizado>
    </View>
  );
}

export const Preferencias = memo(PreferenciasBase);
