import { listarCompromissos, Compromisso } from "@/database/compromissosQueries";
import { listarMetasComPrazoNoPeriodo, Meta } from "@/database/metasQueries";
import { gerarOcorrenciasDoMes, OcorrenciaDoMes } from "@/database/gerarOcorrenciasPrevistas";
import { obterCategoriaPorId } from "@/database/categorias";
import { colors } from "@/theme/colors";

/**
 * Tipo de evento unificado para a Agenda — junta Compromissos
 * (que cobrem "contas e boletos") e Metas com prazo definido
 * (data_alvo) em um formato comum, para o calendário e as listas de
 * eventos não precisarem saber a origem de cada item.
 *
 * "investimento" e "lembrete" ficam no tipo por já preverem o desenho
 * (ver imagem de referência da Agenda), mas nenhuma fonte de dados
 * ainda produz esses tipos — não há tabela própria para eles nesta
 * versão. Adicionar suporte depois é só criar a tabela/query e incluir
 * aqui, sem quebrar o restante da Agenda.
 */
export type TipoEventoAgenda = "compromisso" | "meta" | "investimento" | "lembrete" | "recorrencia";

export type EventoAgenda = {
  id: string;
  tipo: TipoEventoAgenda;
  titulo: string;
  subtitulo: string;
  data: string; // ISO "aaaa-mm-dd"
  valor: number | null;
  positivo: boolean; // true = entrada/depósito (verde), false = saída/despesa (vermelho)
  icone: string;
  cor: string;
  concluido: boolean; // compromisso pago, ou meta já atingida
  // Só para recorrências: identifica a REGRA (não a ocorrência). Ocorrências
  // de meses diferentes da mesma recorrência compartilham o mesmo serieId,
  // o que permite a "Próximos eventos" agrupar (ex: mostrar 1 "Salário" em
  // vez de 3). `id` continua único por ocorrência.
  serieId?: string;
};

function compromissoParaEvento(c: Compromisso): EventoAgenda {
  return {
    id: `compromisso-${c.id}`,
    tipo: "compromisso",
    titulo: c.nome,
    subtitulo: c.pago ? "Pago" : "Vencimento",
    data: c.dataVencimento,
    valor: c.valor,
    positivo: false,
    icone: c.icone,
    cor: c.cor,
    concluido: c.pago,
  };
}

function ocorrenciaParaEvento(o: OcorrenciaDoMes): EventoAgenda {
  const categoria = obterCategoriaPorId(o.categoriaId);
  const entrada = o.tipo === "entrada";
  // Snapshot órfão (recorrência já excluída) cai no id da própria linha.
  const serie = o.recorrenciaId ?? o.id ?? `${o.nome}`;
  return {
    // id único por ocorrência (regra + mês); serieId agrupa as ocorrências
    // da mesma regra em meses diferentes.
    id: `recorrencia-${serie}-${o.mesAno}`,
    serieId: `recorrencia-${serie}`,
    tipo: "recorrencia",
    titulo: o.nome,
    subtitulo: entrada ? "Receita prevista" : "Despesa prevista",
    data: o.dataPrevista,
    valor: o.valorPrevisto,
    positivo: entrada,
    icone: categoria?.icone ?? "repeat-outline",
    cor: categoria?.cor ?? colors["desactived-text"],
    concluido: false,
  };
}

/** Todos os meses ("aaaa-mm") tocados pelo intervalo [inicioIso, fimIso]. */
function mesesNoIntervalo(inicioIso: string, fimIso: string): string[] {
  const meses: string[] = [];
  let [ano, mes] = inicioIso.slice(0, 7).split("-").map(Number); // mes 1-12
  const fimMesAno = fimIso.slice(0, 7);

  let atual = `${ano}-${String(mes).padStart(2, "0")}`;
  while (atual <= fimMesAno) {
    meses.push(atual);
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
    atual = `${ano}-${String(mes).padStart(2, "0")}`;
  }
  return meses;
}

function metaParaEvento(m: Meta): EventoAgenda {
  const atingida = m.valorMeta > 0 && m.progressoAtual >= m.valorMeta;
  return {
    id: `meta-${m.id}`,
    tipo: "meta",
    titulo: `Meta: ${m.nome}`,
    subtitulo: "Prazo final",
    data: m.dataAlvo!, // só chega aqui quando dataAlvo existe (ver listarMetasComPrazoNoPeriodo)
    valor: m.valorMeta - m.progressoAtual,
    positivo: true,
    icone: m.icone,
    cor: m.cor,
    concluido: atingida,
  };
}

/**
 * Lista todos os eventos (compromissos + metas com prazo) dentro de um
 * intervalo de datas [inicioIso, fimIso], já normalizados no formato
 * comum EventoAgenda. Usado para popular o calendário mensal inteiro
 * de uma vez (marca quais dias têm evento) e para "eventos do dia"
 * quando o intervalo é um único dia.
 *
 * Compromissos não têm uma query por período ainda — como a lista total
 * tende a ser pequena (poucas dezenas), filtramos em memória em vez de
 * criar uma nova query só para isso; se o volume crescer muito, vale
 * revisar para filtrar direto no SQL como já é feito em metasQueries.
 */
export async function listarEventosAgenda(
  inicioIso: string,
  fimIso: string
): Promise<EventoAgenda[]> {
  const [todosCompromissos, metasComPrazo, ocorrenciasPorMes] = await Promise.all([
    listarCompromissos(),
    listarMetasComPrazoNoPeriodo(inicioIso, fimIso),
    Promise.all(mesesNoIntervalo(inicioIso, fimIso).map(gerarOcorrenciasDoMes)),
  ]);

  const compromissosNoPeriodo = todosCompromissos.filter(
    (c) => c.dataVencimento >= inicioIso && c.dataVencimento <= fimIso
  );

  // Ocorrências puladas não vão para a Agenda; filtra também pela data
  // exata (o mês pode extrapolar o intervalo pedido nas pontas).
  const ocorrenciasNoPeriodo = ocorrenciasPorMes
    .flat()
    .filter((o) => !o.pulado && o.dataPrevista >= inicioIso && o.dataPrevista <= fimIso);

  const eventos = [
    ...compromissosNoPeriodo.map(compromissoParaEvento),
    ...metasComPrazo.map(metaParaEvento),
    ...ocorrenciasNoPeriodo.map(ocorrenciaParaEvento),
  ];

  eventos.sort((a, b) => a.data.localeCompare(b.data));

  return eventos;
}

/** Agrupa uma lista de eventos por data ISO — usado para marcar os dias com pontinhos no calendário mensal. */
export function agruparEventosPorDia(eventos: EventoAgenda[]): Map<string, EventoAgenda[]> {
  const mapa = new Map<string, EventoAgenda[]>();
  for (const evento of eventos) {
    const lista = mapa.get(evento.data) ?? [];
    lista.push(evento);
    mapa.set(evento.data, lista);
  }
  return mapa;
}