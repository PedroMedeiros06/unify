import { useCallback, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { importarCsv, obterParserPorId, PARSERS_DISPONIVEIS } from "@/database/parsers";
import { marcarPossiveisDuplicatas, TransacaoComStatusDuplicata } from "@/database/deduplicacao";
import { categorizarLote, normalizarPadraoDescricao } from "@/database/categorizacao";
import { salvarRegraCategorizacao } from "@/database/regrasAprendidasQueries";
import { CategoriaId, obterCategoriaPorId } from "@/database/categorias";
import { useTransacoes } from "@/context/TransacoesContext";
import { dataIsoParaBR } from "@/utils/dateUtils";

// Uma transação categorizada automaticamente carrega junto o id da
// categoria resolvida (ou null, se ficou sem categoria) — o preview
// usa isso para exibir e para contar quantas ficaram pendentes.
export type TransacaoComCategoria = TransacaoComStatusDuplicata & {
  categoriaId: CategoriaId | null;
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
    }
  | { fase: "salvando" }
  | { fase: "concluido"; totalImportado: number; totalSemCategoria: number }
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

      const transacoesComCategoria: TransacaoComCategoria[] = transacoesComStatus.map((t) => ({
        ...t,
        categoriaId: categorias.get(t.descricao)?.categoriaId ?? null,
      }));

      // Por padrão: transações marcadas como possível duplicata começam
      // DESMARCADAS (excluídas da importação) — o usuário precisa incluir
      // manualmente se quiser importar mesmo assim. Todas as outras
      // começam marcadas para importar.
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
      if (novasExcluidas.has(index)) {
        novasExcluidas.delete(index);
      } else {
        novasExcluidas.add(index);
      }

      return { ...prev, transacoesExcluidas: novasExcluidas };
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

    const transacoesParaImportar = estado.transacoes.filter(
      (_, index) => !estado.transacoesExcluidas.has(index)
    );

    if (transacoesParaImportar.length === 0) {
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

      for (const transacao of transacoesParaImportar) {
        const categoria = obterCategoriaPorId(transacao.categoriaId);
        if (!categoria) totalSemCategoria += 1;

        await adicionarTransacao({
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
      }

      setEstado({ fase: "concluido", totalImportado: transacoesParaImportar.length, totalSemCategoria });
    } catch (e) {
      setEstado({
        fase: "erro",
        mensagem: e instanceof Error ? e.message : "Erro ao salvar as transações importadas.",
      });
    }
  }, [estado, adicionarTransacao]);

  return {
    estado,
    parsersDisponiveis: PARSERS_DISPONIVEIS,
    selecionarArquivo,
    selecionarBancoManualmente,
    alternarTransacao,
    definirCategoriaNoPreview,
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