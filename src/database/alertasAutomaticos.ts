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
            }
          : {
              titulo: `${nome}: ${Math.round(pct)}% do limite`,
              corpo: `Já foram ${valor(g)} de ${valor(limite.valorLimite)}. Restam ${valor(limite.valorLimite - g)} no mês.`,
              origem: "orcamento",
              refId: limite.categoriaId,
            }
      );
      await marcarEnviado(nivel === 100 ? [`${base}:80`, `${base}:100`] : [`${base}:80`]);
    }
  } catch (e) {
    console.warn("[alertasAutomaticos] Falha ao verificar orçamento:", e);
  }
}

/** Avisa (uma vez) que a meta foi atingida. Chamado depois de mudar o progresso. */
export async function avisarMetaConcluida(metaId: string, nomeMeta: string, valorMeta: number): Promise<void> {
  try {
    const chave = `meta:${metaId}`;
    if (await jaEnviado(chave)) return;
    await enviarNotificacaoApp({
      titulo: "Meta atingida! 🎉",
      corpo: `Você chegou aos ${valorMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de "${nomeMeta}".`,
      origem: "meta",
      refId: metaId,
    });
    await marcarEnviado([chave]);
  } catch (e) {
    console.warn("[alertasAutomaticos] Falha ao avisar meta concluída:", e);
  }
}
