import { useCallback, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { importarCsv, obterParserPorId, PARSERS_DISPONIVEIS } from "@/database/parsers";
import { marcarPossiveisDuplicatas, TransacaoComStatusDuplicata } from "@/database/deduplicacao";
import { categorizarLote, normalizarPadraoDescricao } from "@/database/categorizacao";
import { salvarRegraCategorizacao } from "@/database/regrasAprendidasQueries";
import { pareceMovimentacaoParaMeta } from "@/database/deteccaoMovimentacoesMeta";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { useTransacoes } from "@/context/TransacoesContext";
import { useMetas } from "@/context/MetasContext";
import { vincularTransacaoAMeta } from "@/database/metaTransacoesQueries";
import { dataIsoParaBR } from "@/utils/dateUtils";

// Uma transação categorizada automaticamente carrega junto o id da
// categoria resolvida (ou null, se ficou sem categoria) — o preview
// usa isso para exibir e para contar quantas ficaram pendentes.
//
// `possivelMovimentacaoMeta` é PURAMENTE INFORMATIVO (ver
// deteccaoMovimentacoesMeta.ts): sinaliza no preview que a transação
// pode ser relevante para uma meta, mas NUNCA cria vínculo nenhum.
// confirmarImportacao() abaixo nunca lê este campo — ele existe só
// para a UI (PreviewImportacao.tsx) desenhar a seção/badge.
export type TransacaoComCategoria = TransacaoComStatusDuplicata & {
  categoriaId: CategoriaId | null;
  possivelMovimentacaoMeta: boolean;
};

// Intenção de vínculo com meta escolhida AINDA no preview, antes da
// transação existir no banco. Guarda só o necessário para (a) exibir o
// chip "🎯 <meta>" na linha e (b) criar o vínculo de verdade em
// confirmarImportacao(), depois que adicionarTransacao() devolver o id.
// valorVinculado usa o valor CHEIO da transação, com sinal aplicado na
// hora de gravar (entrada soma, saída subtrai) — ajuste parcial fica
// para a tela de edição da transação já importada.
export type VinculoMetaPendente = {
  metaId: string;
  metaNome: string;
  metaIcone: string;
  metaCor: string;
};

export type EstadoImportacao =
  | { fase: "ocioso" }
  | { fase: "lendo_arquivo" }
  | { fase: "banco_nao_identificado"; conteudoCsv: string; nomeArquivo: string }
  | { fase: "verificando_duplicatas" }
  | {
      fase: "preview";
      bancoId: string;
      nomeArquivo: string;
      transacoes: TransacaoComCategoria[];
      linhasComErro: { numeroLinha: number; conteudoOriginal: string; motivo: string }[];
      // ids (índice) das transações que o usuário optou por NÃO importar
      // — por padrão, duplicatas já vêm desmarcadas, tudo mais vem marcado
      transacoesExcluidas: Set<number>;
      // índice da transação -> meta escolhida no preview. Vazio por
      // padrão; nada é vinculado automaticamente. Só entra aqui quando
      // o usuário escolhe explicitamente uma meta para a linha.
      vinculosPendentes: Map<number, VinculoMetaPendente>;
    }
  | { fase: "salvando" }
  | { fase: "concluido"; totalImportado: number; totalSemCategoria: number; totalVinculadasMeta: number }
  | { fase: "erro"; mensagem: string };

async function lerConteudoArquivo(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    return await file.text();
  } catch {
    try {
      const resposta = await fetch(uri);
      return await resposta.text();
    } catch {
      throw new Error(
        "Não foi possível ler o arquivo selecionado. Tente selecionar o arquivo novamente ou verifique se ele não foi movido/excluído."
      );
    }
  }
}

export function useImportacaoCsv() {
  const [estado, setEstado] = useState<EstadoImportacao>({ fase: "ocioso" });
  const { adicionarTransacao } = useTransacoes();
  // Recarrega metas depois de importar com vínculos — o progresso é
  // derivado de meta_transacoes e o MetasContext não observa essa
  // tabela sozinho.
  const { recarregar: recarregarMetas } = useMetas();

  const reiniciar = useCallback(() => {
    setEstado({ fase: "ocioso" });
  }, []);

  const prepararPreview = useCallback(async (bancoId: string, nomeArquivo: string, resultadoParse: ReturnType<typeof importarCsv>) => {
    setEstado({ fase: "verificando_duplicatas" });

    try {
      const transacoesComStatus = await marcarPossiveisDuplicatas(resultadoParse.transacoes, bancoId);

      // Categorização em LOTE: uma única consulta de regras aprendidas
      // para todas as descrições do arquivo, em vez de uma consulta por
      // transação — importante porque um CSV pode ter dezenas/centenas
      // de linhas.
      const categorias = await categorizarLote(transacoesComStatus.map((t) => t.descricao));

      // Detecção de possíveis movimentações para metas roda em memória,
      // sobre o texto da descrição — não acessa banco, não sabe quais
      // metas existem, não decide vínculo nenhum (ver
      // deteccaoMovimentacoesMeta.ts). Completamente independente da
      // categorização acima, mesmo rodando no mesmo laço.
      const transacoesComCategoria: TransacaoComCategoria[] = transacoesComStatus.map((t) => ({
        ...t,
        categoriaId: categorias.get(t.descricao)?.categoriaId ?? null,
        possivelMovimentacaoMeta: pareceMovimentacaoParaMeta(t.descricao),
      }));

      // Por padrão: transações marcadas como possível duplicata começam
      // DESMARCADAS (excluídas da importação) — o usuário precisa incluir
      // manualmente se quiser importar mesmo assim. Todas as outras
      // começam marcadas para importar. Possíveis movimentações para
      // metas NÃO afetam essa seleção — são só uma sinalização visual.
      const transacoesExcluidas = new Set<number>(
        transacoesComCategoria.reduce<number[]>((acc, t, index) => {
          if (t.possivelDuplicata) acc.push(index);
          return acc;
        }, [])
      );

      setEstado({
        fase: "preview",
        bancoId,
        nomeArquivo,
        transacoes: transacoesComCategoria,
        linhasComErro: resultadoParse.linhasComErro,
        transacoesExcluidas,
        vinculosPendentes: new Map(),
      });
    } catch (e) {
      setEstado({
        fase: "erro",
        mensagem: e instanceof Error ? e.message : "Erro ao verificar duplicatas.",
      });
    }
  }, []);

  const selecionarArquivo = useCallback(async () => {
    setEstado({ fase: "lendo_arquivo" });

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv", "*/*"],
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) {
        setEstado({ fase: "ocioso" });
        return;
      }

      const arquivo = resultado.assets[0];

      if (!arquivo?.uri) {
        setEstado({ fase: "erro", mensagem: "Não foi possível acessar o arquivo selecionado." });
        return;
      }

      const conteudoCsv = await lerConteudoArquivo(arquivo.uri);

      if (!conteudoCsv.trim()) {
        setEstado({ fase: "erro", mensagem: "O arquivo selecionado está vazio." });
        return;
      }

      const resultadoParse = importarCsv(conteudoCsv);

      if (!resultadoParse.bancoDetectado) {
        setEstado({ fase: "banco_nao_identificado", conteudoCsv, nomeArquivo: arquivo.name });
        return;
      }

      await prepararPreview(resultadoParse.bancoDetectado, arquivo.name, resultadoParse);
    } catch (e) {
      setEstado({
        fase: "erro",
        mensagem: e instanceof Error ? e.message : "Erro inesperado ao ler o arquivo.",
      });
    }
  }, [prepararPreview]);

  const selecionarBancoManualmente = useCallback(
    async (idBanco: string, conteudoCsv: string, nomeArquivo: string) => {
      const parser = obterParserPorId(idBanco);
      if (!parser) {
        setEstado({ fase: "erro", mensagem: "Banco selecionado não é suportado." });
        return;
      }

      const resultadoParse = parser.parse(conteudoCsv);
      await prepararPreview(idBanco, nomeArquivo, resultadoParse);
    },
    [prepararPreview]
  );

  // Alterna se uma transação específica (pelo índice na lista de preview)
  // será importada ou não — usado tanto para desmarcar duplicatas
  // indesejadas quanto para o usuário decidir incluir uma mesmo assim.
  const alternarTransacao = useCallback((index: number) => {
    setEstado((prev) => {
      if (prev.fase !== "preview") return prev;

      const novasExcluidas = new Set(prev.transacoesExcluidas);
      let novosVinculos = prev.vinculosPendentes;

      if (novasExcluidas.has(index)) {
        novasExcluidas.delete(index);
      } else {
        novasExcluidas.add(index);
        // Desmarcar uma linha também descarta a meta escolhida para
        // ela — não faz sentido manter um vínculo pendente de algo que
        // não vai ser importado. Se o usuário reincluir depois, escolhe
        // a meta de novo.
        if (novosVinculos.has(index)) {
          novosVinculos = new Map(novosVinculos);
          novosVinculos.delete(index);
        }
      }

      return { ...prev, transacoesExcluidas: novasExcluidas, vinculosPendentes: novosVinculos };
    });
  }, []);

  // Define/troca a meta que a transação do índice será vinculada ao
  // importar. Não cria nada no banco agora — só guarda a intenção.
  const definirVinculoMeta = useCallback((index: number, vinculo: VinculoMetaPendente) => {
    setEstado((prev) => {
      if (prev.fase !== "preview") return prev;
      const novos = new Map(prev.vinculosPendentes);
      novos.set(index, vinculo);
      return { ...prev, vinculosPendentes: novos };
    });
  }, []);

  // Remove a intenção de vínculo de uma linha (o "✕" no chip da meta).
  const removerVinculoMeta = useCallback((index: number) => {
    setEstado((prev) => {
      if (prev.fase !== "preview") return prev;
      if (!prev.vinculosPendentes.has(index)) return prev;
      const novos = new Map(prev.vinculosPendentes);
      novos.delete(index);
      return { ...prev, vinculosPendentes: novos };
    });
  }, []);

  // Permite ao usuário corrigir/definir a categoria de uma transação
  // ainda na tela de preview, ANTES de confirmar a importação. Isso já
  // conta como categorização manual: salva regra aprendida (origem
  // 'usuario') para esse padrão de descrição, valendo para importações
  // futuras — não é preciso esperar editar depois de já importada.
  const definirCategoriaNoPreview = useCallback(async (index: number, categoriaId: CategoriaId) => {
    let descricaoAlterada: string | null = null;

    setEstado((prev) => {
      if (prev.fase !== "preview") return prev;

      const novasTransacoes = prev.transacoes.map((t, i) => {
        if (i !== index) return t;
        descricaoAlterada = t.descricao;
        return { ...t, categoriaId };
      });

      return { ...prev, transacoes: novasTransacoes };
    });

    if (descricaoAlterada) {
      const padrao = normalizarPadraoDescricao(descricaoAlterada);
      await salvarRegraCategorizacao(padrao, categoriaId, "usuario");
    }
  }, []);

  const confirmarImportacao = useCallback(async () => {
    if (estado.fase !== "preview") return;

    // Mantém o índice ORIGINAL de cada transação selecionada — é a
    // chave usada em vinculosPendentes, então não dá para usar um
    // filter que descarta o índice.
    const selecionadas = estado.transacoes
      .map((transacao, index) => ({ transacao, index }))
      .filter(({ index }) => !estado.transacoesExcluidas.has(index));

    if (selecionadas.length === 0) {
      setEstado({ fase: "erro", mensagem: "Nenhuma transação selecionada para importar." });
      return;
    }

    setEstado({ fase: "salvando" });

    const parser = obterParserPorId(estado.bancoId);

    if (!parser) {
      setEstado({ fase: "erro", mensagem: "Banco de destino inválido para salvar as transações." });
      return;
    }

    try {
      let totalSemCategoria = 0;
      let totalVinculadasMeta = 0;

      // A importação grava os campos normais da transação. Um vínculo
      // com meta só é criado quando o usuário escolheu explicitamente
      // uma meta para aquela linha no preview (vinculosPendentes) —
      // `possivelMovimentacaoMeta` sozinho NUNCA cria vínculo nenhum.
      for (const { transacao, index } of selecionadas) {
        const categoria = obterCategoriaPorId(transacao.categoriaId);
        if (!categoria) totalSemCategoria += 1;

        const novoId = await adicionarTransacao({
          nome: transacao.descricao,
          // subtitulo continua com o texto vindo do banco (ou nome da
          // categoria como fallback legível) — categoria é um campo
          // separado, ver categoriaId abaixo.
          subtitulo: transacao.extra?.categoria ?? categoria?.nome ?? "Outros",
          valor: transacao.valor,
          tipo: transacao.tipo,
          data: dataIsoParaBR(transacao.data),
          banco: { sigla: siglaPorBanco(estado.bancoId), cor: corPorBanco(estado.bancoId) },
          bancoId: estado.bancoId,
          status: "concluida",
          categoriaIcone: categoria?.icone,
          categoriaId: transacao.categoriaId,
          identificadorExterno: transacao.extra?.identificadorExterno ?? null,
        });

        const vinculo = estado.vinculosPendentes.get(index);
        if (vinculo) {
          // Valor CHEIO da transação, com sinal: entrada soma no
          // progresso da meta, saída subtrai. Ajuste parcial fica para
          // a tela de edição da transação já importada.
          const sinal = transacao.tipo === "entrada" ? 1 : -1;
          await vincularTransacaoAMeta(vinculo.metaId, novoId, transacao.valor * sinal);
          totalVinculadasMeta += 1;
        }
      }

      if (totalVinculadasMeta > 0) {
        await recarregarMetas();
      }

      setEstado({
        fase: "concluido",
        totalImportado: selecionadas.length,
        totalSemCategoria,
        totalVinculadasMeta,
      });
    } catch (e) {
      setEstado({
        fase: "erro",
        mensagem: e instanceof Error ? e.message : "Erro ao salvar as transações importadas.",
      });
    }
  }, [estado, adicionarTransacao, recarregarMetas]);

  return {
    estado,
    parsersDisponiveis: PARSERS_DISPONIVEIS,
    selecionarArquivo,
    selecionarBancoManualmente,
    alternarTransacao,
    definirCategoriaNoPreview,
    definirVinculoMeta,
    removerVinculoMeta,
    confirmarImportacao,
    reiniciar,
  };
}

function siglaPorBanco(idBanco: string): string {
  const siglas: Record<string, string> = { nubank: "nu", inter: "in", bb: "BB" };
  return siglas[idBanco] ?? "??";
}

function corPorBanco(idBanco: string): string {
  const cores: Record<string, string> = { nubank: "#8D11DA", inter: "#FF7A01", bb: "#FDFC30" };
  return cores[idBanco] ?? "#6B778C";
}