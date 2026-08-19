import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Image, Modal, TextInput, Alert } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { listarResumoPorBanco, calcularResumoReceitasDespesas } from "@/database/queries";
import { obterMetaDeMaiorProgresso } from "@/database/metasQueries";
import { obterPerfil, salvarPerfil } from "@/database/perfilQueries";

function PerfilCardBase() {
  const nameSize = moderateScale(18);
  const emailSize = moderateScale(12);
  const planoSize = moderateScale(11);
  const metricLabelSize = moderateScale(11);
  const metricValueSize = moderateScale(13);
  const modalTitleSize = moderateScale(16);
  const inputTextSize = moderateScale(14);
  const labelSize = moderateScale(11);
  const buttonTextSize = moderateScale(14);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [saldoConsolidado, setSaldoConsolidado] = useState(0);
  const [gastosNoMes, setGastosNoMes] = useState(0);
  const [metaAtingida, setMetaAtingida] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [emailEdicao, setEmailEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [perfil, resumoBancos, receitasDespesas, metaTop] = await Promise.all([
        obterPerfil(),
        listarResumoPorBanco(),
        calcularResumoReceitasDespesas(),
        obterMetaDeMaiorProgresso(),
      ]);

      setNome(perfil.nome);
      setEmail(perfil.email);

      const saldo = resumoBancos.reduce((acc, r) => acc + (r.totalEntradas - r.totalSaidas), 0);
      setSaldoConsolidado(saldo);
      setGastosNoMes(receitasDespesas.despesasMesAtual);

      const percentual = metaTop && metaTop.valorMeta > 0
        ? Math.min(100, Math.round((metaTop.progressoAtual / metaTop.valorMeta) * 100))
        : 0;
      setMetaAtingida(percentual);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleAbrirEdicao = useCallback(() => {
    setNomeEdicao(nome);
    setEmailEdicao(email ?? "");
    setModalEdicaoAberto(true);
  }, [nome, email]);

  const handleSalvarPerfil = useCallback(async () => {
    if (!nomeEdicao.trim()) {
      Alert.alert("Nome obrigatório", "Informe um nome para continuar.");
      return;
    }

    setSalvando(true);
    try {
      await salvarPerfil({ nome: nomeEdicao.trim(), email: emailEdicao.trim() || null });
      setNome(nomeEdicao.trim());
      setEmail(emailEdicao.trim() || null);
      setModalEdicaoAberto(false);
    } catch {
      Alert.alert("Não foi possível salvar", "Ocorreu um erro ao salvar seu perfil. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }, [nomeEdicao, emailEdicao]);

  const nomeExibido = nome || "Toque para se cadastrar";
  const emailExibido = email ?? "Adicione um e-mail (opcional)";

  return (
    <View className="bg-active-icon/15 border border-active-icon/30 rounded-xl overflow-hidden">
      {/* CABEÇALHO: avatar + nome + email + plano */}
      <Pressable
        onPress={handleAbrirEdicao}
        className="flex-row items-center gap-4 p-4 active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Editar informações do perfil"
      >
        <View className="relative">
          <View className="w-16 h-16 rounded-full bg-active-icon/30 items-center justify-center overflow-hidden">
            <Ionicons name="person" color={colors["active-icon"]} size={32} />
          </View>
          <View className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-active-icon items-center justify-center border-2 border-main-background">
            <Ionicons name="pencil" color="#fff" size={11} />
          </View>
        </View>

        <View className="flex-1">
          <Text
            style={{ fontSize: nameSize }}
            className={nome ? "text-main-text font-Inter-SemiBold mb-0.5" : "text-desactived-text font-Inter-SemiBold mb-0.5"}
            numberOfLines={1}
          >
            {nomeExibido}
          </Text>
          <Text
            style={{ fontSize: emailSize }}
            className="text-second-text mb-2"
            numberOfLines={1}
          >
            {emailExibido}
          </Text>
          <View className="self-start bg-active-icon/40 px-2.5 py-1 rounded-full">
            <Text style={{ fontSize: planoSize }} className="text-main-text font-Inter-Medium">
              Plano Gratuito
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" color={colors["second-text"]} size={18} />
      </Pressable>

      {/* MÉTRICAS RÁPIDAS */}
      <View className="flex-row border-t border-active-icon/20">
        <View className="flex-1 flex-row items-center gap-2 p-3">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="wallet-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Saldo consolidado
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              {carregando ? "···" : FormatToCurrency(saldoConsolidado)}
            </Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-2 p-3 border-l border-active-icon/20">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="pie-chart-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Gastos no mês
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-main-text font-Inter-SemiBold"
              numberOfLines={1}
            >
              {carregando ? "···" : FormatToCurrency(gastosNoMes)}
            </Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-2 p-3 border-l border-active-icon/20">
          <View className="w-8 h-8 rounded-lg bg-active-icon/30 items-center justify-center flex-shrink-0">
            <Ionicons name="radio-button-on-outline" color={colors["main-text"]} size={15} />
          </View>
          <View className="flex-1">
            <Text style={{ fontSize: metricLabelSize }} className="text-second-text" numberOfLines={1}>
              Meta mensal
            </Text>
            <Text
              style={{ fontSize: metricValueSize }}
              className="text-active-icon font-Inter-SemiBold"
              numberOfLines={1}
            >
              {carregando ? "···" : `${metaAtingida}% atingido`}
            </Text>
          </View>
        </View>
      </View>

      {/* MODAL DE EDIÇÃO — cadastro local simples, sem tabela de usuário completa */}
      <Modal visible={modalEdicaoAberto} transparent animationType="slide" onRequestClose={() => setModalEdicaoAberto(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card-background rounded-t-2xl p-5 pb-8">
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const PerfilCard = memo(PerfilCardBase);