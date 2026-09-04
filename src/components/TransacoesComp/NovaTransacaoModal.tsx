import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, TextInput } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useTransacoes } from "@/context/TransacoesContext";
import { SeletorData } from "@/components/common/SeletorData";
import { SeletorCategoria } from "@/components/common/SeletorCategoria";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { BANCOS_SUPORTADOS, BancoSuportado } from "@/database/parsers/bancosSuportados";
import { dataHojeIso } from "@/utils/dateUtils";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { useDialogo } from "@/context/DialogoContext";

type Props = {
  visivel: boolean;
  onFechar: () => void;
};

/**
 * Criação manual de transação. Formulário único (sem passos), com os
 * campos essenciais: banco, nome, valor, data — mais o tipo
 * (entrada/saída) e a categoria. O detalhe/subtítulo antigo foi
 * removido; quando vazio, cai no nome da categoria.
 *
 * O banco é escolhido num dropdown que lista os bancos com suporte a
 * importação de CSV (BANCOS_SUPORTADOS) — os mesmos que aparecem no
 * fluxo de importar extrato.
 */
function NovaTransacaoModalBase({ visivel, onFechar }: Props) {
  const { avisar } = useDialogo();
  const titleSize = moderateScale(17);
  const labelSize = moderateScale(11);
  const inputTextSize = moderateScale(14);
  const buttonTextSize = moderateScale(14);

  const { adicionarTransacao } = useTransacoes();

  const [banco, setBanco] = useState<BancoSuportado | null>(null);
  const [nome, setNome] = useState("");
  const [valorTexto, setValorTexto] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dataIso, setDataIso] = useState<string | null>(dataHojeIso());
  const [categoriaId, setCategoriaId] = useState<CategoriaId | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setBanco(null);
    setNome("");
    setValorTexto("");
    setTipo("saida");
    setDataIso(dataHojeIso());
    setCategoriaId(null);
    setSalvando(false);
  }, [visivel]);

  const handleValorChange = useCallback((texto: string) => {
    setValorTexto(texto.replace(/[^0-9]/g, ""));
  }, []);

  const valorNumerico = valorTexto ? parseInt(valorTexto, 10) / 100 : 0;
  const valorExibicao = valorTexto
    ? valorNumerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 0,00";

  const formularioValido = !!banco && nome.trim().length > 0 && valorNumerico > 0 && !!dataIso;

  const handleSalvar = useCallback(async () => {
    if (!formularioValido || !banco || !dataIso || salvando) return;

    setSalvando(true);
    try {
      const categoria = obterCategoriaPorId(categoriaId);
      await adicionarTransacao({
        nome: nome.trim(),
        subtitulo: categoria?.nome || "Outros",
        valor: valorNumerico,
        tipo,
        data: dataIso,
        banco: { sigla: banco.sigla, cor: banco.cor },
        bancoId: banco.id,
        status: "concluida",
        categoriaIcone: categoria?.icone,
        categoriaId,
      });
      onFechar();
    } catch {
      await avisar({ titulo: "Não foi possível salvar", mensagem: "Ocorreu um erro ao criar a transação. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [formularioValido, banco, dataIso, salvando, nome, valorNumerico, tipo, categoriaId, adicionarTransacao, onFechar, avisar]);

  return (
    <ModalCentralizado
      visivel={visivel}
      onFechar={onFechar}
      bloquearFechamentoExterno={salvando}
      overlayOpacidade={0.6}
    >
      <View className="flex-row justify-between items-center mb-5">
        <Text style={{ fontSize: titleSize }} className="text-main-text font-Inter-SemiBold">
          Nova transação
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      {/* BANCO — dropdown com os bancos suportados pelo importador de CSV */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Banco
      </Text>
      <View className="mb-4">
        <DropdownMenu
          larguraDoTrigger
          alinhamento="esquerda"
          trigger={({ abrir, aberto }) => (
            <Pressable
              onPress={abrir}
              disabled={salvando}
              className={`bg-input-background border rounded-xl px-3 py-3 flex-row items-center gap-2 ${
                aberto ? "border-active-icon" : "border-input-border"
              }`}
              accessibilityRole="button"
              accessibilityLabel={`Banco. ${banco ? banco.nome : "Nenhum selecionado"}`}
            >
              {banco ? (
                <>
                  <View
                    style={{ backgroundColor: banco.cor }}
                    className="w-6 h-6 rounded-md items-center justify-center flex-shrink-0"
                  >
                    <Text style={{ fontSize: 10 }} className="text-white font-Inter-Bold">
                      {banco.sigla}
                    </Text>
                  </View>
                  <Text style={{ fontSize: inputTextSize }} className="text-main-text font-Inter-Medium flex-1" numberOfLines={1}>
                    {banco.nome}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: inputTextSize }} className="text-desactived-text flex-1">
                  Selecione o banco
                </Text>
              )}
              <Ionicons
                name="chevron-down"
                color={aberto ? colors["active-icon"] : colors["second-text"]}
                size={16}
                style={{ flexShrink: 0 }}
              />
            </Pressable>
          )}
        >
          {({ fechar }) => (
            <View className="py-1">
              {BANCOS_SUPORTADOS.map((b, index) => {
                const selecionado = b.id === banco?.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      setBanco(b);
                      fechar();
                    }}
                    className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
                      index < BANCOS_SUPORTADOS.length - 1 ? "border-b border-lines-divisions/60" : ""
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selecionado }}
                    accessibilityLabel={b.nome}
                  >
                    <View
                      style={{ backgroundColor: b.cor }}
                      className="w-7 h-7 rounded-lg items-center justify-center flex-shrink-0"
                    >
                      <Text style={{ fontSize: 10 }} className="text-white font-Inter-Bold">
                        {b.sigla}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: inputTextSize }}
                      className={selecionado ? "text-active-icon font-Inter-Medium flex-1" : "text-main-text flex-1"}
                      numberOfLines={1}
                    >
                      {b.nome}
                    </Text>
                    {selecionado && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </DropdownMenu>
      </View>

      {/* NOME */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Nome
      </Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Mercado, Salário..."
        placeholderTextColor={colors["desactived-text"]}
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!salvando}
        accessibilityLabel="Nome da transação"
      />

      {/* VALOR */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Valor
      </Text>
      <TextInput
        value={valorExibicao}
        onChangeText={handleValorChange}
        keyboardType="numeric"
        style={{ fontSize: inputTextSize, color: colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3 mb-4"
        editable={!salvando}
        accessibilityLabel="Valor da transação"
      />

      {/* DATA */}
      <View className="mb-4">
        <SeletorData label="Data" valorIso={dataIso} onChange={setDataIso} />
      </View>

      {/* TIPO */}
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        Tipo
      </Text>
      <View className="flex-row gap-2 mb-4">
        <Pressable
          onPress={() => setTipo("entrada")}
          disabled={salvando}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            tipo === "entrada" ? "bg-sucess-color/15 border-sucess-color" : "border-input-border"
          }`}
          accessibilityRole="radio"
          accessibilityState={{ checked: tipo === "entrada" }}
        >
          <Text style={{ fontSize: inputTextSize }} className={tipo === "entrada" ? "text-sucess-color font-Inter-Medium" : "text-second-text"}>
            Entrada
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTipo("saida")}
          disabled={salvando}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            tipo === "saida" ? "bg-error-color/15 border-error-color" : "border-input-border"
          }`}
          accessibilityRole="radio"
          accessibilityState={{ checked: tipo === "saida" }}
        >
          <Text style={{ fontSize: inputTextSize }} className={tipo === "saida" ? "text-error-color font-Inter-Medium" : "text-second-text"}>
            Saída
          </Text>
        </Pressable>
      </View>

      {/* CATEGORIA */}
      <View className="mb-5">
        <SeletorCategoria categoriaSelecionada={categoriaId} onSelecionar={setCategoriaId} />
      </View>

      <Pressable
        onPress={handleSalvar}
        disabled={!formularioValido || salvando}
        className={`w-full py-3.5 rounded-xl items-center justify-center ${
          formularioValido && !salvando ? "bg-active-icon active:opacity-80" : "bg-active-icon/30"
        }`}
        accessibilityRole="button"
        accessibilityLabel="Salvar transação"
      >
        <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : "Salvar transação"}
        </Text>
      </Pressable>
    </ModalCentralizado>
  );
}

export const NovaTransacaoModal = memo(NovaTransacaoModalBase);
