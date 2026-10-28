import { getDatabase, executarNaFila } from "./database";
import { listarResumoPorCategoria } from "./queries";
import { listarLimitesCategoria } from "./limitesCategoriaQueries";
import { obterCategoriaPorId } from "./categorias";
import { enviarNotificacaoApp } from "./notificacoes";
import { dataHojeIso } from "@/utils/dateUtils";

/**
 * Avisos automáticos que o app dispara sozinho, cada um UMA vez só
 * (registro em `alertas_enviados`, migration 24):
 *  - limite de categoria do orçamento chegando a 80% e estourando 100%
 *    (só no mês corrente — importar extrato antigo não gera aviso);
 *  - meta atingida (ver verificarMetaConcluida).
 *
 * Nunca lançam: são acessórios ao fluxo que os chama (salvar transação,
 * vincular à meta).
 */

async function jaEnviado(chave: string): Promise<boolean> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM alertas_enviados WHERE chave = ?;`, [chave]);
    return (r?.n ?? 0) > 0;
  });
}

async function marcarEnviado(chaves: string[]): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    for (const chave of chaves) {
      await db.runAsync(`INSERT OR IGNORE INTO alertas_enviados (chave) VALUES (?);`, [chave]);
    }
  });
}

/**
 * Confere os limites do mês corrente contra o gasto e avisa as
 * categorias que cruzaram 80% ou 100% desde o último aviso. Se pulou
 * direto para 100%, manda só o de 100% (e marca os dois).
 */
export async function verificarAlertasOrcamento(): Promise<void> {
  try {
    const hoje = dataHojeIso();
    const mesAno = hoje.slice(0, 7);
    const limites = await listarLimitesCategoria(mesAno);
    if (limites.length === 0) return;

    const [a, m] = mesAno.split("-").map(Number);
    const fim = `${mesAno}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
    const resumo = await listarResumoPorCategoria({ dataInicio: `${mesAno}-01`, dataFim: fim });
    const gasto = new Map(resumo.map((r) => [r.categoriaId, r.totalSaidas]));

    for (const limite of limites) {
      const g = gasto.get(limite.categoriaId) ?? 0;
      const pct = (g / limite.valorLimite) * 100;
      if (pct < 80) continue;

      const base = `orcamento:${limite.categoriaId}:${mesAno}`;
      const nivel = pct >= 100 ? 100 : 80;
      if (await jaEnviado(`${base}:${nivel}`)) continue;

      const nome = obterCategoriaPorId(limite.categoriaId)?.nome ?? "Categoria";
      const valor = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      await enviarNotificacaoApp(
        nivel === 100
          ? {
              titulo: `Limite de ${nome} estourado`,
              corpo: `Você gastou ${valor(g)} de ${valor(limite.valorLimite)} este mês.`,
              origem: "orcamento",
              refId: limite.categoriaId,
              destino: { tela: "planejamento", aba: "Orçamento" },
            }
          : {
              titulo: `${nome}: ${Math.round(pct)}% do limite`,
              corpo: `Já foram ${valor(g)} de ${valor(limite.valorLimite)}. Restam ${valor(limite.valorLimite - g)} no mês.`,
              origem: "orcamento",
              refId: limite.categoriaId,
              destino: { tela: "planejamento", aba: "Orçamento" },
            }
      );
      await marcarEnviado(nivel === 100 ? [`${base}:80`, `${base}:100`] : [`${base}:80`]);
    }
  } catch (e) {
    console.warn("[alertasAutomaticos] Falha ao verificar orçamento:", e);
  }
}

/**
 * Avisa (uma vez por meta) as metas que acabaram de ser atingidas.
 * Chamado pelo MetasContext a cada carga. Na PRIMEIRA execução depois
 * de atualizar o app, só registra as metas que já estavam concluídas,
 * sem notificar — senão quem já tinha metas batidas receberia uma
 * enxurrada de avisos de coisas antigas.
 */
export async function verificarMetasConcluidas(
  metas: { id: string; nome: string; valorMeta: number; progressoAtual: number }[]
): Promise<void> {
  try {
    const concluidas = metas.filter((m) => m.valorMeta > 0 && m.progressoAtual >= m.valorMeta);
    if (!(await jaEnviado("meta:linha-de-base"))) {
      await marcarEnviado(["meta:linha-de-base", ...concluidas.map((m) => `meta:${m.id}`)]);
      return;
    }
    for (const m of concluidas) {
      const chave = `meta:${m.id}`;
      if (await jaEnviado(chave)) continue;
      await enviarNotificacaoApp({
        titulo: "Meta atingida! 🎉",
        corpo: `Você chegou aos ${m.valorMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de “${m.nome}”.`,
        origem: "meta",
        refId: m.id,
        destino: { tela: "planejamento", aba: "Metas" },
      });
      await marcarEnviado([chave]);
    }
  } catch (e) {
    console.warn("[alertasAutomaticos] Falha ao verificar metas concluídas:", e);
  }
}

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Agenda (ou reagenda) o aviso "Seu resumo de <mês> está pronto" para o
 * dia 1 do próximo mês às 9h. Chamado a cada abertura do app: o
 * identificador fixo faz o novo agendamento substituir o anterior, então
 * nunca acumula. Tocar abre o Relatório do mês que fechou.
 */
export async function agendarAvisoRelatorioMensal(): Promise<void> {
  try {
    const agora = new Date();
    const quando = new Date(agora.getFullYear(), agora.getMonth() + 1, 1, 9, 0, 0);
    const mesAno = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    await enviarNotificacaoApp({
      titulo: `Seu resumo de ${NOMES_MES[agora.getMonth()]} está pronto`,
      corpo: "Veja quanto entrou, quanto saiu e onde você gastou mais que no mês anterior.",
      origem: "relatorio",
      quando,
      identificador: "relatorio-mensal",
      destino: { tela: "relatorio", mesAno },
    });
  } catch (e) {
    console.warn("[alertasAutomaticos] Falha ao agendar resumo mensal:", e);
  }
}
