import { getDatabase, executarNaFila } from "./database";

/**
 * Backup / restauração completos do banco local do Unify.
 *
 * O arquivo gerado é um JSON com uma cópia crua (linha a linha, colunas
 * exatas do schema) de cada tabela de dados do usuário. A restauração
 * apaga o que estiver no aparelho e regrava a partir do arquivo — é uma
 * substituição total, não um merge.
 *
 * NÃO entram no backup:
 *  - cotacoes_moeda / taxas_referencia: cache de dados online, o app
 *    rebusca sozinho na próxima abertura com internet.
 *  - o schema em si: a restauração assume que o app que está lendo já
 *    rodou as migrations até `schemaVersion` (ver checagem em
 *    `restaurarDados`). Restaurar um backup mais novo num app mais
 *    velho é bloqueado.
 */

const FORMATO = "unify-backup";
const FORMATO_VERSAO = 1;

// Ordem importa na RESTAURAÇÃO: uma tabela só é inserida depois das
// tabelas para as quais ela tem FOREIGN KEY. Ex.: transacoes depende de
// bancos; meta_transacoes depende de metas E transacoes; compromissos
// tem FK opcional para transacoes.
const TABELAS_EM_ORDEM_DE_INSERCAO = [
  "perfil_usuario",
  "bancos",
  "metas",
  "transacoes",
  "compromissos",
  "lembretes",
  "simulacoes",
  "recorrencias",
  "ocorrencia_prevista",
  "orcamento_mes",
  "limite_categoria",
  "meta_transacoes",
  "regras_categorizacao",
] as const;

type LinhaCrua = Record<string, unknown>;

export type ArquivoBackup = {
  formato: typeof FORMATO;
  formatoVersao: number;
  schemaVersion: number; // PRAGMA user_version na hora do export
  geradoEm: string; // ISO
  appVersion: string | null;
  tabelas: Record<string, LinhaCrua[]>;
};

async function lerUserVersion(): Promise<number> {
  const db = await getDatabase();
  const r = await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version;`);
  return r?.user_version ?? 0;
}

/**
 * Lê todas as tabelas de dados do usuário e devolve o objeto de backup
 * pronto para ser serializado em JSON.
 */
export async function exportarDados(appVersion: string | null): Promise<ArquivoBackup> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const schemaVersion = await lerUserVersion();

    const tabelas: Record<string, LinhaCrua[]> = {};
    for (const nome of TABELAS_EM_ORDEM_DE_INSERCAO) {
      // Cada tabela pode não existir se o schema for antigo — mas como o
      // app sempre roda migrations até a última versão antes disto, todas
      // existem. Ainda assim, um try/catch evita abortar o backup inteiro
      // por causa de uma tabela.
      try {
        tabelas[nome] = await db.getAllAsync<LinhaCrua>(`SELECT * FROM ${nome};`);
      } catch (e) {
        console.warn(`[backup] tabela ${nome} não pôde ser lida (ignorada):`, e);
        tabelas[nome] = [];
      }
    }

    return {
      formato: FORMATO,
      formatoVersao: FORMATO_VERSAO,
      schemaVersion,
      geradoEm: new Date().toISOString(),
      appVersion,
      tabelas,
    };
  });
}

export type ResultadoValidacao =
  | { ok: true; arquivo: ArquivoBackup; totalLinhas: number }
  | { ok: false; erro: string };

/**
 * Faz o parse do texto do arquivo e valida que é um backup do Unify
 * compatível com este app. NÃO escreve nada — quem chama decide se
 * segue para `restaurarDados`.
 */
export async function validarBackup(textoJson: string): Promise<ResultadoValidacao> {
  let dados: unknown;
  try {
    dados = JSON.parse(textoJson);
  } catch {
    return { ok: false, erro: "O arquivo não é um JSON válido." };
  }

  if (typeof dados !== "object" || dados === null) {
    return { ok: false, erro: "Formato de arquivo não reconhecido." };
  }

  const obj = dados as Partial<ArquivoBackup>;
  if (obj.formato !== FORMATO) {
    return { ok: false, erro: "Este arquivo não é um backup do Unify." };
  }
  if (typeof obj.formatoVersao !== "number" || obj.formatoVersao > FORMATO_VERSAO) {
    return {
      ok: false,
      erro: "O backup foi gerado por uma versão mais nova do app. Atualize o Unify e tente de novo.",
    };
  }
  if (typeof obj.tabelas !== "object" || obj.tabelas === null) {
    return { ok: false, erro: "O backup está corrompido (sem dados de tabelas)." };
  }

  const schemaAtual = await lerUserVersion();
  if (typeof obj.schemaVersion === "number" && obj.schemaVersion > schemaAtual) {
    return {
      ok: false,
      erro: "O backup usa uma estrutura de banco mais nova que a deste app. Atualize o Unify e tente de novo.",
    };
  }

  const totalLinhas = Object.values(obj.tabelas).reduce(
    (soma, linhas) => soma + (Array.isArray(linhas) ? linhas.length : 0),
    0
  );

  return { ok: true, arquivo: obj as ArquivoBackup, totalLinhas };
}

function montarInsert(tabela: string, linha: LinhaCrua): { sql: string; valores: unknown[] } {
  const colunas = Object.keys(linha);
  const placeholders = colunas.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tabela} (${colunas.join(", ")}) VALUES (${placeholders});`;
  const valores = colunas.map((c) => {
    const v = linha[c];
    // SQLite aceita string/number/null/boolean(->0/1)/Uint8Array. Um
    // objeto/array aninhado (não esperado no schema atual) vira string.
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
  return { sql, valores };
}

/**
 * SUBSTITUI todos os dados locais pelos do arquivo. Roda dentro de uma
 * transação: se qualquer INSERT falhar, faz rollback e o banco fica
 * como estava antes.
 *
 * Depois de `restaurarDados` retornar, quem chama DEVE forçar a
 * remontagem da árvore de contextos (ver ResetAppContext) para as telas
 * relerem o banco.
 */
export async function restaurarDados(arquivo: ArquivoBackup): Promise<void> {
  await executarNaFila(async () => {
    const db = await getDatabase();

    // Limpa e regrava numa transação só. `foreign_keys` fica OFF durante
    // a operação: a ordem de DELETE (inversa) e de INSERT já respeita as
    // dependências, e desligar evita que um estado intermediário viole
    // uma FK no meio do processo. É religado no finally.
    await db.execAsync(`PRAGMA foreign_keys = OFF;`);
    try {
      await db.withTransactionAsync(async () => {
        // DELETE na ordem inversa da inserção (filhas primeiro).
        for (const nome of [...TABELAS_EM_ORDEM_DE_INSERCAO].reverse()) {
          await db.execAsync(`DELETE FROM ${nome};`);
        }

        // INSERT na ordem direta (pais primeiro).
        for (const nome of TABELAS_EM_ORDEM_DE_INSERCAO) {
          const linhas = arquivo.tabelas[nome];
          if (!Array.isArray(linhas) || linhas.length === 0) continue;
          for (const linha of linhas) {
            const { sql, valores } = montarInsert(nome, linha);
            await db.runAsync(sql, valores as never[]);
          }
        }
      });
    } finally {
      await db.execAsync(`PRAGMA foreign_keys = ON;`);
    }
  });
}
