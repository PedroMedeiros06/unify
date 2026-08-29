import { listarRecorrencias, Recorrencia, TipoRecorrencia } from "./recorrenciasQueries";
import { CategoriaId } from "./categorias";
import { resolverDataNoMes, recorrenciaAtivaNoMes } from "./datasRecorrencia";
import {
  listarOcorrenciasPersistidasDoMes,
  mesEstaCongelado,
  materializarOcorrencia,
  obterAncoraOrcamento,
  OcorrenciaPrevista,
} from "./ocorrenciasPrevistasQueries";

/**
 * Geração de ocorrências previstas de um mês.
 *
 * REGRAS (todas garantidas aqui):
 *  - Uma recorrência gera NO MÁXIMO uma ocorrência por mês.
 *  - Respeita dataInicio/dataFim e o flag `ativa` (via
 *    recorrenciaAtivaNoMes) — recorrência inativa ou fora de vigência
 *    NÃO gera ocorrência dinâmica nova.
 *  - A data prevista sai de resolverDataNoMes() — cobre os três tipos
 *    de vencimento (dia_fixo, dia_util, ultimo_dia_util).
 *  - Idempotente: `gerarOcorrenciasDoMes` é LEITURA PURA (não grava
 *    nada); rodar de novo devolve o mesmo resultado. A materialização
 *    (`materializarOcorrenciasDoMes`) usa INSERT ON CONFLICT DO NOTHING,
 *    então também não duplica nem sobrescreve linha existente.
 *  - NÃO cria transações. Ocorrência prevista é planejamento.
 *  - Snapshot: se já existe linha materializada para a recorrência
 *    naquele mês, ela é usada COMO ESTÁ — mudanças posteriores na
 *    recorrência não afetam ocorrências já materializadas.
 */

export type OrigemOcorrencia = "persistida" | "dinamica";

export type OcorrenciaDoMes = {
  /** id da linha em `ocorrencia_prevista`; null quando ainda é só dinâmica. */
  id: string | null;
  recorrenciaId: string | null;
  mesAno: string;
  nome: string;
  valorPrevisto: number;
  tipo: TipoRecorrencia;
  dataPrevista: string; // ISO
  categoriaId: CategoriaId | null;
  pulado: boolean;
  origem: OrigemOcorrencia;
};

function mesAnoParaAnoMes0(mesAno: string): { ano: number; mes0a11: number } {
  const [ano, mes1a12] = mesAno.split("-").map(Number);
  return { ano, mes0a11: (mes1a12 ?? 1) - 1 };
}

function daPersistida(o: OcorrenciaPrevista): OcorrenciaDoMes {
  return {
    id: o.id,
    recorrenciaId: o.recorrenciaId,
    mesAno: o.mesAno,
    nome: o.nome,
    valorPrevisto: o.valorPrevisto,
    tipo: o.tipo,
    dataPrevista: o.dataPrevista,
    categoriaId: o.categoriaId,
    pulado: o.pulado,
    origem: "persistida",
  };
}

function daRecorrencia(rec: Recorrencia, mesAno: string): OcorrenciaDoMes {
  const { ano, mes0a11 } = mesAnoParaAnoMes0(mesAno);
  return {
    id: null,
    recorrenciaId: rec.id,
    mesAno,
    nome: rec.nome,
    valorPrevisto: rec.valor,
    tipo: rec.tipo,
    dataPrevista: resolverDataNoMes(rec, ano, mes0a11),
    categoriaId: rec.categoriaId,
    pulado: false,
    origem: "dinamica",
  };
}

function ordenar(lista: OcorrenciaDoMes[]): OcorrenciaDoMes[] {
  return [...lista].sort(
    (a, b) => a.dataPrevista.localeCompare(b.dataPrevista) || a.nome.localeCompare(b.nome)
  );
}

/**
 * Ocorrências previstas do mês `mesAno` ("aaaa-mm").
 *
 * Mês CONGELADO  -> devolve SÓ as linhas já materializadas (snapshot
 *                   puro; não recalcula nada a partir das recorrências
 *                   atuais).
 * Mês VIVO       -> combina:
 *                     - toda linha já materializada (ajuste do usuário);
 *                     - + uma ocorrência dinâmica para cada recorrência
 *                       ativa/vigente que ainda NÃO tem linha no mês.
 */
export async function gerarOcorrenciasDoMes(mesAno: string): Promise<OcorrenciaDoMes[]> {
  const [persistidas, congelado, ancora] = await Promise.all([
    listarOcorrenciasPersistidasDoMes(mesAno),
    mesEstaCongelado(mesAno),
    obterAncoraOrcamento(),
  ]);

  // Mês congelado OU anterior à âncora de início de uso: leitura SÓ dos
  // snapshots. Nunca gera dinâmica — meses pré-âncora são períodos que o
  // usuário nunca acompanhou, então uma recorrência criada depois não
  // pode aparecer neles retroativamente.
  if (congelado || (ancora != null && mesAno < ancora)) {
    return ordenar(persistidas.map(daPersistida));
  }

  const recorrencias = await listarRecorrencias();

  // Recorrências que já têm linha no mês não geram dinâmica (garante
  // "no máximo uma por mês" e preserva o snapshot/ajuste).
  const idsComLinha = new Set(
    persistidas.map((o) => o.recorrenciaId).filter((id): id is string => id != null)
  );

  const dinamicas = recorrencias
    .filter((rec) => !idsComLinha.has(rec.id))
    .filter((rec) => recorrenciaAtivaNoMes(rec, mesAno))
    .map((rec) => daRecorrencia(rec, mesAno));

  return ordenar([...persistidas.map(daPersistida), ...dinamicas]);
}

/**
 * Materializa (grava) as ocorrências dinâmicas do mês em
 * `ocorrencia_prevista`. Usado pelo congelamento de meses encerrados
 * (etapa 5) — NÃO deve ser chamado casualmente para um mês vivo.
 *
 * Idempotente: cada INSERT é ON CONFLICT DO NOTHING; linhas já
 * existentes (ajustes/snapshots) são preservadas intactas. Rodar duas
 * vezes seguidas produz exatamente o mesmo estado.
 *
 * Retorna quantas linhas novas foram de fato criadas.
 */
export async function materializarOcorrenciasDoMes(mesAno: string): Promise<number> {
  if (await mesEstaCongelado(mesAno)) {
    // Mês já congelado: snapshot fechado, nada a materializar.
    return 0;
  }

  const ocorrencias = await gerarOcorrenciasDoMes(mesAno);
  const aMaterializar = ocorrencias.filter((o) => o.origem === "dinamica");

  let criadas = 0;
  for (const o of aMaterializar) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    criadas += await materializarOcorrencia(id, {
      recorrenciaId: o.recorrenciaId,
      mesAno: o.mesAno,
      nome: o.nome,
      valorPrevisto: o.valorPrevisto,
      tipo: o.tipo,
      dataPrevista: o.dataPrevista,
      categoriaId: o.categoriaId,
      pulado: o.pulado,
    });
  }
  return criadas;
}
