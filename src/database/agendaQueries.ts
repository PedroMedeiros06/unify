import { listarCompromissos, Compromisso } from "@/database/compromissosQueries";
import { listarMetasComPrazoNoPeriodo, Meta } from "@/database/metasQueries";

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
export type TipoEventoAgenda = "compromisso" | "meta" | "investimento" | "lembrete";

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
  const [todosCompromissos, metasComPrazo] = await Promise.all([
    listarCompromissos(),
    listarMetasComPrazoNoPeriodo(inicioIso, fimIso),
  ]);

  const compromissosNoPeriodo = todosCompromissos.filter(
    (c) => c.dataVencimento >= inicioIso && c.dataVencimento <= fimIso
  );

  const eventos = [
    ...compromissosNoPeriodo.map(compromissoParaEvento),
    ...metasComPrazo.map(metaParaEvento),
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