import { useCallback, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { importarCsv, obterParserPorId, PARSERS_DISPONIVEIS } from "@/database/parsers";
import { ResultadoParse, TransacaoImportada } from "@/database/parsers/TransacaoImportada";
import { useTransacoes } from "@/context/TransacoesContext";

export type EstadoImportacao =
  | { fase: "ocioso" }
  | { fase: "lendo_arquivo" }
  | { fase: "banco_nao_identificado"; conteudoCsv: string; nomeArquivo: string }
  | { fase: "preview"; resultado: ResultadoParse; nomeArquivo: string }
  | { fase: "salvando" }
  | { fase: "concluido"; totalImportado: number }
  | { fase: "erro"; mensagem: string };

const ICONE_CATEGORIA_PADRAO = "swap-horizontal-outline";

const REGRAS_CATEGORIA: { palavras: string[]; categoria: string; icone: string }[] = [
  { palavras: ["uber", "99", "taxi"], categoria: "Transporte", icone: "car-outline" },
  { palavras: ["mercado", "supermercado", "supermarcon"], categoria: "Mercado", icone: "cart-outline" },
  { palavras: ["pix"], categoria: "Transferência", icone: "swap-horizontal-outline" },
  { palavras: ["boleto"], categoria: "Boleto", icone: "document-text-outline" },
  { palavras: ["aplicação", "aplicacao", "rdb", "resgate", "cdb"], categoria: "Investimentos", icone: "trending-up-outline" },
  { palavras: ["cartão", "cartao", "compra"], categoria: "Compras", icone: "card-outline" },
];

function categorizarPorPalavraChave(descricao: string): { categoria: string; icone: string } {
  const descricaoLower = descricao.toLowerCase();
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.palavras.some((palavra) => descricaoLower.includes(palavra))) {
      return { categoria: regra.categoria, icone: regra.icone };
    }
  }
  return { categoria: "Outros", icone: ICONE_CATEGORIA_PADRAO };
}

/**
 * Lê o conteúdo de texto de um arquivo selecionado pelo DocumentPicker.
 *
 * Por que isso precisa de tratamento especial: no Android, o DocumentPicker
 * frequentemente retorna uma URI do tipo `content://` (Storage Access
 * Framework), não um caminho de arquivo `file://` direto — mesmo quando
 * `copyToCacheDirectory: true` é usado. A API antiga de expo-file-system
 * (`readAsStringAsync`) podia falhar nesses casos com "Location isn't
 * readable". A classe `File` da API nova lida melhor com isso, mas ainda
 * assim mantemos um fallback via fetch(), que funciona tanto para
 * `content://` quanto para `file://` em praticamente todos os casos.
 */
async function lerConteudoArquivo(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    return await file.text();
  } catch (erroApiNova) {
    // Fallback: fetch() consegue ler tanto content:// quanto file://
    // através do bridge nativo do React Native, sem depender da mesma
    // camada de acesso a arquivo que falhou acima.
    try {
      const resposta = await fetch(uri);
      return await resposta.text();
    } catch (erroFetch) {
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
        setEstado({
          fase: "banco_nao_identificado",
          conteudoCsv,
          nomeArquivo: arquivo.name,
        });
        return;
      }

      setEstado({ fase: "preview", resultado: resultadoParse, nomeArquivo: arquivo.name });
    } catch (e) {
      setEstado({
        fase: "erro",
        mensagem: e instanceof Error ? e.message : "Erro inesperado ao ler o arquivo.",
      });
    }
  }, []);

  const selecionarBancoManualmente = useCallback((idBanco: string, conteudoCsv: string, nomeArquivo: string) => {
    const parser = obterParserPorId(idBanco);
    if (!parser) {
      setEstado({ fase: "erro", mensagem: "Banco selecionado não é suportado." });
      return;
    }

    const resultadoParse = parser.parse(conteudoCsv);
    setEstado({ fase: "preview", resultado: resultadoParse, nomeArquivo });
  }, []);

  const confirmarImportacao = useCallback(async () => {
    if (estado.fase !== "preview") return;

    setEstado({ fase: "salvando" });

    const bancoId = estado.resultado.bancoDetectado;
    const parser = bancoId ? obterParserPorId(bancoId) : null;

    if (!bancoId || !parser) {
      setEstado({ fase: "erro", mensagem: "Banco de destino inválido para salvar as transações." });
      return;
    }

    try {
      for (const transacao of estado.resultado.transacoes) {
        const { categoria, icone } = categorizarPorPalavraChave(transacao.descricao);

        await adicionarTransacao({
          nome: transacao.descricao,
          subtitulo: transacao.extra?.categoria ?? categoria,
          valor: transacao.valor,
          tipo: transacao.tipo,
          data: formatarDataParaExibicao(transacao.data),
          banco: { sigla: siglaPorBanco(bancoId), cor: corPorBanco(bancoId) },
          bancoId,
          status: "concluida",
          categoriaIcone: icone,
        });
      }

      setEstado({ fase: "concluido", totalImportado: estado.resultado.transacoes.length });
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
    confirmarImportacao,
    reiniciar,
  };
}

function formatarDataParaExibicao(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function siglaPorBanco(idBanco: string): string {
  const siglas: Record<string, string> = { nubank: "nu", inter: "in", bb: "BB" };
  return siglas[idBanco] ?? "??";
}

function corPorBanco(idBanco: string): string {
  const cores: Record<string, string> = { nubank: "#8D11DA", inter: "#FF7A01", bb: "#FDFC30" };
  return cores[idBanco] ?? "#6B778C";
}