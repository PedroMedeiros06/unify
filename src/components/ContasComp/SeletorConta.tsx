import { memo, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { DropdownMenu } from "@/components/common/DropdownMenu";
import { useContas } from "@/context/ContasContext";
import { ContaComSaldo, TipoConta } from "@/database/contasQueries";

type Props = {
  label: string;
  contaId: string | null;
  onSelecionar: (conta: ContaComSaldo) => void;
  placeholder?: string;
  // Esconde uma conta da lista (ex: a origem, no seletor de destino).
  excluirId?: string | null;
  // Restringe a um tipo (ex: só cartões no "pagar fatura").
  somenteTipo?: TipoConta;
  desabilitado?: boolean;
};

/** Selo colorido com a sigla da conta — o mesmo visual dos chips de banco. */
export function SeloConta({ sigla, cor, tamanho = 24 }: { sigla: string; cor: string; tamanho?: number }) {
  return (
    <View
      style={{ backgroundColor: cor, width: tamanho, height: tamanho, borderRadius: tamanho * 0.28 }}
      className="items-center justify-center flex-shrink-0"
    >
      <Text style={{ fontSize: tamanho * 0.4 }} className="text-white font-Inter-Bold">
        {sigla}
      </Text>
    </View>
  );
}

/**
 * Dropdown de contas ativas (bancos do catálogo + personalizadas +
 * cartões). Substitui a lista fixa BANCOS_SUPORTADOS nos formulários —
 * é por aqui que "Outro banco" passa a existir: qualquer conta criada
 * em Minhas contas aparece.
 */
function SeletorContaBase({
  label,
  contaId,
  onSelecionar,
  placeholder = "Selecione a conta",
  excluirId,
  somenteTipo,
  desabilitado,
}: Props) {
  const colors = useThemeColors();
  const { contasAtivas, obterConta } = useContas();
  const labelSize = moderateScale(11);
  const textoSize = moderateScale(14);

  const opcoes = useMemo(
    () =>
      contasAtivas.filter(
        (c) => c.id !== excluirId && (!somenteTipo || c.tipo === somenteTipo)
      ),
    [contasAtivas, excluirId, somenteTipo]
  );
  const selecionada = contaId ? obterConta(contaId) : undefined;

  return (
    <View>
      <Text style={{ fontSize: labelSize, color: colors["second-text"] }} className="mb-1.5">
        {label}
      </Text>
      <DropdownMenu
        larguraDoTrigger
        alinhamento="esquerda"
        trigger={({ abrir, aberto }) => (
          <Pressable
            onPress={abrir}
            disabled={desabilitado}
            style={{
              backgroundColor: colors["input-background"],
              borderColor: aberto ? colors["active-icon"] : colors["input-border"],
            }}
            className="border rounded-xl px-3 py-3 flex-row items-center gap-2"
            accessibilityRole="button"
            accessibilityLabel={`${label}. ${selecionada ? selecionada.nome : "Nenhuma selecionada"}`}
          >
            {selecionada ? (
              <>
                <SeloConta sigla={selecionada.sigla} cor={selecionada.cor} />
                <Text
                  style={{ fontSize: textoSize, color: colors["main-text"] }}
                  className="font-Inter-Medium flex-1"
                  numberOfLines={1}
                >
                  {selecionada.nome}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: textoSize, color: colors["desactived-text"] }} className="flex-1">
                {placeholder}
              </Text>
            )}
            <Ionicons
              name="chevron-down"
              color={aberto ? colors["active-icon"] : colors["second-text"]}
              size={16}
            />
          </Pressable>
        )}
      >
        {({ fechar }) => (
          <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
            <View className="py-1">
              {opcoes.length === 0 && (
                <Text style={{ fontSize: textoSize, color: colors["second-text"] }} className="px-4 py-3">
                  Nenhuma conta disponível. Crie uma em Minhas contas.
                </Text>
              )}
              {opcoes.map((c, index) => {
                const marcada = c.id === contaId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      onSelecionar(c);
                      fechar();
                    }}
                    style={index < opcoes.length - 1 ? { borderBottomWidth: 1, borderColor: `${colors["lines-divisions"]}99` } : undefined}
                    className="flex-row items-center gap-3 px-4 py-3 active:opacity-70"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: marcada }}
                    accessibilityLabel={c.nome}
                  >
                    <SeloConta sigla={c.sigla} cor={c.cor} tamanho={28} />
                    <View className="flex-1">
                      <Text
                        style={{ fontSize: textoSize, color: marcada ? colors["active-icon"] : colors["main-text"] }}
                        className={marcada ? "font-Inter-Medium" : ""}
                        numberOfLines={1}
                      >
                        {c.nome}
                      </Text>
                      {c.tipo === "cartao" && (
                        <Text style={{ fontSize: moderateScale(10), color: colors["second-text"] }}>
                          Cartão de crédito
                        </Text>
                      )}
                    </View>
                    {marcada && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </DropdownMenu>
    </View>
  );
}

export const SeletorConta = memo(SeletorContaBase);
