import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";

import { useImportacaoCsv } from "@/hooks/useImportacaoCsv";
import { SeletorBancoManual } from "@/components/ImportacaoComp/SeletorBancoManual";
import { PreviewImportacao } from "@/components/ImportacaoComp/PreviewImportacao";
import { ImportacaoConcluida } from "@/components/ImportacaoComp/ImportacaoConcluida";
import { useNavigation } from "@/context/NavigationContext";

export function ImportarExtrato() {
  const titleSize = moderateScale(22);
  const subtitleSize = moderateScale(12);
  const emptyTitleSize = moderateScale(15);
  const emptySubtitleSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  const { goBack } = useNavigation();

  const {
    estado,
    parsersDisponiveis,
    selecionarArquivo,
    selecionarBancoManualmente,
    alternarTransacao,
    definirCategoriaNoPreview,
    definirVinculoMeta,
    removerVinculoMeta,
    confirmarImportacao,
    reiniciar,
  } = useImportacaoCsv();

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="flex-col gap-4">
        {/* HEADER */}
        <View className="w-full flex-row items-center gap-3">
          <Pressable
            onPress={goBack}
            className="w-9 h-9 rounded-full bg-input-background border border-input-border items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" color={colors["main-text"]} size={18} />
          </Pressable>

          <View className="flex-1">
            <Text
              style={{ fontSize: titleSize, letterSpacing: titleSize * -0.03 }}
              className="text-main-text font-Inter-SemiBold"
            >
              Importar extrato
            </Text>
            <Text style={{ fontSize: subtitleSize }} className="text-second-text mt-1">
              Traga seus dados bancários para o Unify em segundos.
            </Text>
          </View>
        </View>

        {/* ESTADO: OCIOSO */}
        {estado.fase === "ocioso" && (
          <View className="bg-card-background border border-dashed border-input-border rounded-xl p-8 items-center">
            <View className="w-16 h-16 rounded-full bg-active-icon/15 items-center justify-center mb-4">
              <Ionicons name="document-attach-outline" color={colors["active-icon"]} size={30} />
            </View>
            <Text style={{ fontSize: emptyTitleSize }} className="text-main-text font-Inter-Medium mb-1 text-center">
              Nenhum arquivo selecionado
            </Text>
            <Text style={{ fontSize: emptySubtitleSize }} className="text-desactived-text text-center mb-5">
              Selecione o arquivo CSV exportado do seu banco (Nubank, Inter ou Banco do Brasil).
            </Text>
            <Pressable
              onPress={selecionarArquivo}
              className="bg-active-icon px-6 py-3 rounded-xl active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Selecionar arquivo CSV"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                Selecionar arquivo
              </Text>
            </Pressable>
          </View>
        )}

        {/* ESTADO: LENDO ARQUIVO */}
        {estado.fase === "lendo_arquivo" && (
          <View className="bg-card-background border border-lines-divisions rounded-xl p-8 items-center">
            <ActivityIndicator color={colors["active-icon"]} size="large" />
            <Text style={{ fontSize: emptySubtitleSize }} className="text-desactived-text mt-3">
              Lendo arquivo...
            </Text>
          </View>
        )}

        {/* ESTADO: BANCO NÃO IDENTIFICADO */}
        {estado.fase === "banco_nao_identificado" && (
          <SeletorBancoManual
            parsers={parsersDisponiveis}
            onSelecionar={(idBanco) =>
              selecionarBancoManualmente(idBanco, estado.conteudoCsv, estado.nomeArquivo)
            }
            onCancelar={reiniciar}
          />
        )}

        {/* ESTADO: VERIFICANDO DUPLICATAS */}
        {estado.fase === "verificando_duplicatas" && (
          <View className="bg-card-background border border-lines-divisions rounded-xl p-8 items-center">
            <ActivityIndicator color={colors["active-icon"]} size="large" />
            <Text style={{ fontSize: emptySubtitleSize }} className="text-desactived-text mt-3">
              Verificando transações já importadas...
            </Text>
          </View>
        )}

        {/* ESTADO: PREVIEW */}
        {estado.fase === "preview" && (
          <PreviewImportacao
            transacoes={estado.transacoes}
            transacoesExcluidas={estado.transacoesExcluidas}
            vinculosPendentes={estado.vinculosPendentes}
            linhasComErro={estado.linhasComErro}
            nomeBanco={nomeBancoPorId(estado.bancoId, parsersDisponiveis)}
            nomeArquivo={estado.nomeArquivo}
            onToggleTransacao={alternarTransacao}
            onDefinirCategoria={definirCategoriaNoPreview}
            onDefinirVinculoMeta={definirVinculoMeta}
            onRemoverVinculoMeta={removerVinculoMeta}
            onConfirmar={confirmarImportacao}
            onCancelar={reiniciar}
            salvando={false}
          />
        )}

        {/* ESTADO: SALVANDO */}
        {estado.fase === "salvando" && (
          <View className="bg-card-background border border-lines-divisions rounded-xl p-8 items-center">
            <ActivityIndicator color={colors["active-icon"]} size="large" />
            <Text style={{ fontSize: emptySubtitleSize }} className="text-desactived-text mt-3">
              Salvando transações...
            </Text>
          </View>
        )}

        {/* ESTADO: CONCLUÍDO */}
        {estado.fase === "concluido" && (
          <ImportacaoConcluida
            totalImportado={estado.totalImportado}
            totalSemCategoria={estado.totalSemCategoria}
            totalVinculadasMeta={estado.totalVinculadasMeta}
            onVoltarInicio={goBack}
            onImportarOutro={reiniciar}
          />
        )}

        {/* ESTADO: ERRO */}
        {estado.fase === "erro" && (
          <View className="bg-card-background border border-error-color/30 rounded-xl p-6 items-center">
            <Ionicons name="alert-circle-outline" color={colors["error-color"]} size={32} />
            <Text style={{ fontSize: emptyTitleSize }} className="text-main-text font-Inter-Medium mt-3 mb-1 text-center">
              Não foi possível importar
            </Text>
            <Text style={{ fontSize: emptySubtitleSize }} className="text-desactived-text text-center mb-5">
              {estado.mensagem}
            </Text>
            <Pressable
              onPress={reiniciar}
              className="bg-active-icon px-6 py-3 rounded-xl active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function nomeBancoPorId(idBanco: string | null, parsers: { idBanco: string; nomeBanco: string }[]): string {
  if (!idBanco) return "Banco";
  return parsers.find((p) => p.idBanco === idBanco)?.nomeBanco ?? "Banco";
}