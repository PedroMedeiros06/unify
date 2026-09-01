import { getDatabase, executarNaFila } from "./database";
import {
  ParametrosFinanciamento,
  ResultadoFinanciamento,
  ParametrosEmprestimo,
  ResultadoEmprestimo,
  ParametrosInvestimento,
  ResultadoInvestimento,
  ParametrosCambio,
  ResultadoCambio,
} from "@/utils/simulacoes";

export type TipoSimulacao = "financiamento" | "emprestimo" | "investimento" | "cambio";

/**
 * União discriminada por `tipo` — cada simulação salva carrega os
 * parâmetros e o resultado no formato do seu simulador (ver
 * src/utils/simulacoes.ts). No banco, `parametros` e `resultado` são
 * JSON serializado; a (de)serialização acontece só nesta camada.
 */
export type SimulacaoSalva =
  | {
      id: string;
      tipo: "financiamento";
      titulo: string;
      parametros: ParametrosFinanciamento;
      resultado: ResultadoFinanciamento;
      criadoEm: string;
    }
  | {
      id: string;
      tipo: "emprestimo";
      titulo: string;
      parametros: ParametrosEmprestimo;
      resultado: ResultadoEmprestimo;
      criadoEm: string;
    }
  | {
      id: string;
      tipo: "investimento";
      titulo: string;
      parametros: ParametrosInvestimento;
      resultado: ResultadoInvestimento;
      criadoEm: string;
    }
  | {
      id: string;
      tipo: "cambio";
      titulo: string;
      parametros: ParametrosCambio;
      resultado: ResultadoCambio;
      criadoEm: string;
    };

type LinhaBruta = {
  id: string;
  tipo: TipoSimulacao;
  titulo: string;
  parametros: string;
  resultado: string;
  criadoEm: string;
};

function mapearLinha(linha: LinhaBruta): SimulacaoSalva {
  return {
    id: linha.id,
    tipo: linha.tipo,
    titulo: linha.titulo,
    parametros: JSON.parse(linha.parametros),
    resultado: JSON.parse(linha.resultado),
    criadoEm: linha.criadoEm,
  } as SimulacaoSalva;
}

export async function listarSimulacoes(): Promise<SimulacaoSalva[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const linhas = await db.getAllAsync<LinhaBruta>(
      `SELECT id, tipo, titulo, parametros, resultado, criado_em as criadoEm
       FROM simulacoes
       ORDER BY criado_em DESC;`
    );
    return linhas.map(mapearLinha);
  });
}

export async function inserirSimulacao(
  id: string,
  tipo: TipoSimulacao,
  titulo: string,
  parametros: unknown,
  resultado: unknown
): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO simulacoes (id, tipo, titulo, parametros, resultado)
       VALUES (?, ?, ?, ?, ?);`,
      [id, tipo, titulo, JSON.stringify(parametros), JSON.stringify(resultado)]
    );
  });
}

export async function excluirSimulacao(id: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM simulacoes WHERE id = ?;`, [id]);
  });
}
