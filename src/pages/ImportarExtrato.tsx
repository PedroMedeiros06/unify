import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/theme/useThemeColors";
import { moderateScale } from "@/utils/scale";

import { useImportacaoCsv } from "@/hooks/useImportacaoCsv";
import { SeletorBancoManual } from "@/components/ImportacaoComp/SeletorBancoManual";
import { PreviewImportacao } from "@/components/ImportacaoComp/PreviewImportacao";
import { ImportacaoConcluida } from "@/components/ImportacaoComp/ImportacaoConcluida";
import { CabecalhoTela } from "@/components/common/CabecalhoTela";
import { SeloConta } from "@/components/ContasComp/SeletorConta";
import { useNavigation } from "@/context/NavigationContext";
import { useContas } from "@/context/ContasContext";
import { ID_OFX_SEM_CONTA } from "@/database/parsers/OfxParser";

export function ImportarExtrato() {
  const colors = useThemeColors();
  const emptyTitleSize = moderateScale(15);
  const emptySubtitleSize = moderateScale(12);
  const buttonTextSize = moderateScale(14);

  const { goBack, navigate } = useNavigation();
  const { contasAtivas, obterConta } = useContas();

  const {
    estado,
    parsersDisponiveis,
    selecionarArquivo,
    selecionarBancoManualmente,
    selecionarContaDoOfx,
    trocarContaDestino,
    alternarTransacao,
    definirCategoriaNoPreview,
    definirVinculoMeta,
    removerVinculoMeta,
    confirmarImportacao,
    reiniciar,
  } = useImportacaoCsv();

  const carregando = (texto: string) => (
    <View
      style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
      className="border rounded-xl p-8 items-center"
    >
      <ActivityIndicator color={colors["active-icon"]} size="large" />
      <Text style={{ fontSize: emptySubtitleSize, color: colors["desactived-text"] }} className="mt-3">
        {texto}
      </Text>
    </View>
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-col gap-4">
        <CabecalhoTela titulo="Importar extrato" subtitulo="Traga seus dados bancários para o Unify em segundos." />

        {/* ESTADO: OCIOSO */}
        {estado.fase === "ocioso" && (
          <View
            style={{ backgroundColor: colors["card-background"], borderColor: colors["input-border"] }}
            className="border border-dashed rounded-xl p-8 items-center"
          >
            <View
              style={{ backgroundColor: `${colors["active-icon"]}26` }}
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
            >
              <Ionicons name="document-attach-outline" color={colors["active-icon"]} size={30} />
            </View>
            <Text style={{ fontSize: emptyTitleSize, color: colors["main-text"] }} className="font-Inter-Medium mb-1 text-center">
              Nenhum arquivo selecionado
            </Text>
            <Text style={{ fontSize: emptySubtitleSize, color: colors["desactived-text"] }} className="text-center mb-5">
              CSV do Nubank, Inter ou Banco do Brasil — ou OFX de qualquer banco (Itaú, Bradesco, Caixa, Santander...).
            </Text>
            <Pressable
              onPress={selecionarArquivo}
              style={{ backgroundColor: colors["active-icon"] }}
              className="px-6 py-3 rounded-xl active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Selecionar arquivo de extrato"
            >
              <Text style={{ fontSize: buttonTextSize }} className="text-white font-Inter-SemiBold">
                Selecionar arquivo
              </Text>
            </Pressable>
          </View>
        )}

        {estado.fase === "lendo_arquivo" && carregando("Lendo arquivo...")}

        {/* CSV sem banco reconhecido: escolhe o formato (parser) */}
        {estado.fase === "banco_nao_identificado" && (
          <SeletorBancoManual
            parsers={parsersDisponiveis}
            onSelecionar={(idBanco) => selecionarBancoManualmente(idBanco, estado.conteudoCsv, estado.nomeArquivo)}
            onCancelar={reiniciar}
          />
        )}

        {/* OFX de banco fora do catálogo: escolhe a conta de destino */}
        {estado.fase === "conta_nao_identificada" && (
          <View
            style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
            className="border rounded-xl p-4"
          >
            <Text style={{ fontSize: emptyTitleSize, color: colors["main-text"] }} className="font-Inter-Medium mb-1">
              Para qual conta é este extrato?
            </Text>
            <Text style={{ fontSize: emptySubtitleSize, color: colors["second-text"] }} className="mb-4">
              {estado.resultadoParse.transacoes.length} transações em {estado.nomeArquivo}. Se a conta ainda não existe,
              crie em Minhas contas.
            </Text>
            <View className="gap-2">
              {contasAtivas.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => selecionarContaDoOfx(c.id)}
                  style={{ backgroundColor: colors["input-background"], borderColor: colors["input-border"] }}
                  className="flex-row items-center gap-3 border rounded-xl p-3 active:opacity-70"
                  accessibilityRole="button"
                >
                  <SeloConta sigla={c.sigla} cor={c.cor} tamanho={32} />
                  <Text style={{ fontSize: buttonTextSize, color: colors["main-text"] }} className="flex-1 font-Inter-Medium">
                    {c.nome}
                  </Text>
                  <Ionicons name="chevron-forward" color={colors["second-text"]} size={16} />
                </Pressable>
              ))}
            </View>
            <View className="flex-row justify-between mt-4">
              <Pressable onPress={() => navigate("contas")} hitSlop={8}>
                <Text style={{ fontSize: emptySubtitleSize, color: colors["active-icon"] }} className="font-Inter-Medium">
                  + Criar conta
                </Text>
              </Pressable>
              <Pressable onPress={reiniciar} hitSlop={8}>
                <Text style={{ fontSize: emptySubtitleSize, color: colors["desactived-text"] }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {estado.fase === "verificando_duplicatas" && carregando("Verificando transações já importadas...")}

        {estado.fase === "preview" && (
          <PreviewImportacao
            transacoes={estado.transacoes}
            transacoesExcluidas={estado.transacoesExcluidas}
            vinculosPendentes={estado.vinculosPendentes}
            linhasComErro={estado.linhasComErro}
            nomeBanco={nomeFormato(estado.parserId, parsersDisponiveis)}
            nomeArquivo={estado.nomeArquivo}
            contaDestinoId={estado.bancoId}
            onTrocarContaDestino={trocarContaDestino}
            onToggleTransacao={alternarTransacao}
            onDefinirCategoria={definirCategoriaNoPreview}
            onDefinirVinculoMeta={definirVinculoMeta}
            onRemoverVinculoMeta={removerVinculoMeta}
            onConfirmar={confirmarImportacao}
            onCancelar={reiniciar}
            salvando={false}
          />
        )}

        {estado.fase === "salvando" && carregando("Salvando transações...")}

        {estado.fase === "concluido" && (
          <ImportacaoConcluida
            totalImportado={estado.totalImportado}
            totalSemCategoria={estado.totalSemCategoria}
            totalVinculadasMeta={estado.totalVinculadasMeta}
            totalDuplicadasIgnoradas={estado.totalDuplicadasIgnoradas}
            sugestoesTransferencia={estado.sugestoesTransferencia}
            onRevisarSemCategoria={() => navigate("transations", { transacoesSemCategoria: true })}
            onVoltarInicio={goBack}
            onImportarOutro={reiniciar}
          />
        )}

        {estado.fase === "erro" && (
          <View
            style={{ backgroundColor: colors["card-background"], borderColor: `${colors["error-color"]}4D` }}
            className="border rounded-xl p-6 items-center"
          >
            <Ionicons name="alert-circle-outline" color={colors["error-color"]} size={32} />
            <Text style={{ fontSize: emptyTitleSize, color: colors["main-text"] }} className="font-Inter-Medium mt-3 mb-1 text-center">
              Não foi possível importar
            </Text>
            <Text style={{ fontSize: emptySubtitleSize, color: colors["desactived-text"] }} className="text-center mb-5">
              {estado.mensagem}
            </Text>
            <Pressable
              onPress={reiniciar}
              style={{ backgroundColor: colors["active-icon"] }}
              className="px-6 py-3 rounded-xl active:opacity-80"
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

  /** Nome exibido no topo do preview: o banco do CSV ou "Arquivo OFX (<conta>)". */
  function nomeFormato(parserId: string, parsers: { idBanco: string; nomeBanco: string }[]): string {
    if (parserId === ID_OFX_SEM_CONTA) return "Arquivo OFX";
    return parsers.find((p) => p.idBanco === parserId)?.nomeBanco ?? obterConta(parserId)?.nome ?? "Banco";
  }
}
