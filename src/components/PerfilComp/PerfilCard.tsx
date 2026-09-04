import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput } from "react-native";
import { Image } from "expo-image";
import { memo, useCallback, useState } from "react";
import { usePerfil } from "@/context/PerfilContext";
import { useDialogo } from "@/context/DialogoContext";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { escolherFotoPerfil, apagarFotoPerfil } from "@/utils/fotoPerfil";

function PerfilCardBase() {
  const nameSize = moderateScale(18);
  const emailSize = moderateScale(12);
  const modalTitleSize = moderateScale(16);
  const inputTextSize = moderateScale(14);
  const labelSize = moderateScale(11);
  const buttonTextSize = moderateScale(14);

  // Nome/email/foto vêm do PerfilContext (fonte única, compartilhada com
  // a Home). Métricas (saldo, gastos, meta) não ficam mais aqui — já
  // aparecem completas nas telas de Home/Planejamento.
  const { perfil, atualizarPerfil } = usePerfil();
  const { avisar } = useDialogo();

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [emailEdicao, setEmailEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocandoFoto, setTrocandoFoto] = useState(false);

  const handleAbrirEdicao = useCallback(() => {
    setNomeEdicao(perfil.nome);
    setEmailEdicao(perfil.email ?? "");
    setModalEdicaoAberto(true);
  }, [perfil.nome, perfil.email]);

  const handleSalvarPerfil = useCallback(async () => {
    if (!nomeEdicao.trim()) {
      await avisar({ titulo: "Nome obrigatório", mensagem: "Informe um nome para continuar." });
      return;
    }

    setSalvando(true);
    try {
      await atualizarPerfil({ nome: nomeEdicao.trim(), email: emailEdicao.trim() || null });
      setModalEdicaoAberto(false);
    } catch {
      await avisar({
        titulo: "Não foi possível salvar",
        mensagem: "Ocorreu um erro ao salvar seu perfil. Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }, [nomeEdicao, emailEdicao, atualizarPerfil, avisar]);

  const handleEscolherFoto = useCallback(async () => {
    if (trocandoFoto) return;
    setTrocandoFoto(true);
    try {
      const r = await escolherFotoPerfil(perfil.avatarUri);
      if (r.status === "ok") {
        await atualizarPerfil({ avatarUri: r.uri });
      } else if (r.status === "sem_permissao") {
        await avisar({
          titulo: "Permissão necessária",
          mensagem: "Para escolher uma foto, permita o acesso às fotos nas configurações do aparelho.",
        });
      } else if (r.status === "erro") {
        await avisar({ titulo: "Não foi possível usar a imagem", mensagem: r.mensagem });
      }
    } finally {
      setTrocandoFoto(false);
    }
  }, [trocandoFoto, perfil.avatarUri, atualizarPerfil, avisar]);

  const handleRemoverFoto = useCallback(() => {
    const uri = perfil.avatarUri;
    if (!uri) return;
    void atualizarPerfil({ avatarUri: null }).then(() => apagarFotoPerfil(uri));
  }, [perfil.avatarUri, atualizarPerfil]);

  const nomeExibido = perfil.nome || "Toque para se cadastrar";
  const emailExibido = perfil.email ?? "Adicione um e-mail (opcional)";
  const temFoto = !!perfil.avatarUri;

  return (
    <View className="bg-active-icon/15 border border-active-icon/30 rounded-xl overflow-hidden">
      <View className="flex-row items-center gap-4 p-4">
        {/* AVATAR — toque troca a foto */}
        <Pressable
          onPress={handleEscolherFoto}
          className="relative active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={temFoto ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        >
          <View className="w-16 h-16 rounded-full bg-active-icon/30 items-center justify-center overflow-hidden">
            {temFoto ? (
              <Image
                source={{ uri: perfil.avatarUri! }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" color={colors["active-icon"]} size={32} />
            )}
          </View>
          <View className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-active-icon items-center justify-center border-2 border-main-background">
            <Ionicons name={trocandoFoto ? "hourglass-outline" : "camera"} color="#fff" size={11} />
          </View>
        </Pressable>

        {/* NOME + EMAIL — toque abre o modal de edição */}
        <Pressable
          onPress={handleAbrirEdicao}
          className="flex-1 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Editar nome e e-mail"
        >
          <Text
            style={{ fontSize: nameSize }}
            className={perfil.nome ? "text-main-text font-Inter-SemiBold mb-0.5" : "text-desactived-text font-Inter-SemiBold mb-0.5"}
            numberOfLines={1}
          >
            {nomeExibido}
          </Text>
          <Text style={{ fontSize: emailSize }} className="text-second-text" numberOfLines={1}>
            {emailExibido}
          </Text>
        </Pressable>

        <Pressable onPress={handleAbrirEdicao} hitSlop={8} accessibilityRole="button" accessibilityLabel="Editar perfil">
          <Ionicons name="chevron-forward" color={colors["second-text"]} size={18} />
        </Pressable>
      </View>

      {temFoto && (
        <Pressable
          onPress={handleRemoverFoto}
          className="border-t border-active-icon/20 py-2.5 items-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Remover foto de perfil"
        >
          <Text style={{ fontSize: moderateScale(11) }} className="text-second-text">
            Remover foto
          </Text>
        </Pressable>
      )}

      {/* MODAL DE EDIÇÃO — cadastro local simples, sem tabela de usuário completa */}
      <ModalCentralizado
        visivel={modalEdicaoAberto}
        onFechar={() => setModalEdicaoAberto(false)}
        bloquearFechamentoExterno={salvando}
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text style={{ fontSize: modalTitleSize }} className="text-main-text font-Inter-SemiBold">
            Seu perfil
          </Text>
          <Pressable onPress={() => setModalEdicaoAberto(false)} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
            <Ionicons name="close" color={colors["second-text"]} size={22} />
          </Pressable>
        </View>

        <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
          Nome
        </Text>
        <TextInput
          value={nomeEdicao}
          onChangeText={setNomeEdicao}
          placeholder="Seu nome"
          placeholderTextColor={colors["desactived-text"]}
          style={{ fontSize: inputTextSize, color: colors["main-text"] }}
          className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
          editable={!salvando}
          autoFocus
          accessibilityLabel="Nome"
        />

        <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
          E-mail (opcional)
        </Text>
        <TextInput
          value={emailEdicao}
          onChangeText={setEmailEdicao}
          placeholder="seuemail@exemplo.com"
          placeholderTextColor={colors["desactived-text"]}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ fontSize: inputTextSize, color: colors["main-text"] }}
          className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-6"
          editable={!salvando}
          accessibilityLabel="E-mail"
        />

        <Pressable
          onPress={handleSalvarPerfil}
          disabled={salvando}
          className="w-full py-3.5 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Salvar perfil"
        >
          <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
            {salvando ? "Salvando..." : "Salvar"}
          </Text>
        </Pressable>
      </ModalCentralizado>
    </View>
  );
}

export const PerfilCard = memo(PerfilCardBase);
