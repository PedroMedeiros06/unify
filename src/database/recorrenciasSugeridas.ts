import { getDatabase, executarNaFila } from "./database";
import { CategoriaId } from "./categorias";
import { normalizarPadraoDescricao } from "./categorizacao";
import { dataHojeIso } from "@/utils/dateUtils";

/**
 * Sugere recorrências a partir do histórico: o mesmo gasto (ou receita)
 * aparecendo em 3+ meses SEGUIDOS, com valor parecido (±10% da
 * mediana), até o mês atual ou o anterior — e que ainda não virou
 * recorrência. Ex.: "Netflix R$ 39,90 todo mês".
 *
 * Só sugere: criar a recorrência é decisão do usuário (ou "dispensar",
 * que grava em alertas_enviados para a sugestão não voltar).
 */

export type SugestaoRecorrencia = {
  chave: string; // padrão normalizado + tipo — identifica a sugestão
  nome: string; // descrição mais recente, como veio do banco
  valor: number; // mediana
  tipo: "entrada" | "saida";
  categoriaId: CategoriaId | null;
  diaDoMes: number; // dia típico (mediana)
  meses: number; // tamanho da sequência de meses seguidos
};

/** Remove números/pontuação: "NETFLIX.COM 8392" e "NETFLIX.COM 1123" viram o mesmo padrão. */
function padrao(nome: string): string {
  return normalizarPadraoDescricao(nome)
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

function mesAnterior(mesAno: string): string {
  const [a, m] = mesAno.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function sugerirRecorrencias(limite = 5): Promise<SugestaoRecorrencia[]> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    const hoje = dataHojeIso();
    const linhas = await db.getAllAsync<{
      nome: string; tipo: "entrada" | "saida"; valor: number; data: string; categoria_id: CategoriaId | null;
    }>(
      `SELECT nome, tipo, valor, data, categoria_id FROM transacoes
       WHERE transferencia_id IS NULL AND data >= date(?, '-7 months')
       ORDER BY data ASC;`,
      [hoje]
    );
    const recorrencias = await db.getAllAsync<{ nome: string }>(`SELECT nome FROM recorrencias;`);
    const dispensadas = new Set(
      (await db.getAllAsync<{ chave: string }>(`SELECT chave FROM alertas_enviados WHERE chave LIKE 'sugrec:%';`)).map(
        (r) => r.chave.slice("sugrec:".length)
      )
    );
    const padroesExistentes = recorrencias.map((r) => padrao(r.nome)).filter((p) => p.length >= 3);

    // padrão+tipo -> mês -> transações daquele mês
    const grupos = new Map<string, Map<string, typeof linhas>>();
    for (const l of linhas) {
      const p = padrao(l.nome);
      if (p.length < 3) continue;
      const chave = `${p}|${l.tipo}`;
      const porMes = grupos.get(chave) ?? new Map();
      const mes = l.data.slice(0, 7);
      porMes.set(mes, [...(porMes.get(mes) ?? []), l]);
      grupos.set(chave, porMes);
    }

    const mesAtual = hoje.slice(0, 7);
    const sugestoes: SugestaoRecorrencia[] = [];

    for (const [chave, porMes] of grupos) {
      if (dispensadas.has(chave)) continue;
      const p = chave.split("|")[0];
      if (padroesExistentes.some((e) => e === p || e.includes(p) || p.includes(e))) continue;

      // Sequência de meses seguidos terminando no mês atual ou no anterior.
      let mes = porMes.has(mesAtual) ? mesAtual : mesAnterior(mesAtual);
      const sequencia: string[] = [];
      while (porMes.has(mes)) {
        sequencia.push(mes);
        mes = mesAnterior(mes);
      }
      if (sequencia.length < 3) continue;

      // Uma transação "representativa" por mês (a de maior valor) — evita
      // que várias compras no mesmo lugar no mês pareçam uma conta fixa.
      const representantes = sequencia.map((m) => porMes.get(m)!.reduce((a, b) => (b.valor > a.valor ? b : a)));
      const meses = sequencia.map((m) => porMes.get(m)!.length);
      if (meses.some((n) => n > 2)) continue; // compras frequentes, não uma conta mensal

      const valorMediano = mediana(representantes.map((r) => r.valor));
      if (representantes.some((r) => Math.abs(r.valor - valorMediano) > valorMediano * 0.1)) continue;

      const maisRecente = representantes[0];
      sugestoes.push({
        chave,
        nome: maisRecente.nome,
        valor: Math.round(valorMediano * 100) / 100,
        tipo: maisRecente.tipo,
        categoriaId: maisRecente.categoria_id,
        diaDoMes: Math.round(mediana(representantes.map((r) => Number(r.data.slice(8, 10))))),
        meses: sequencia.length,
      });
    }

    return sugestoes.sort((a, b) => b.valor - a.valor).slice(0, limite);
  });
}

/** "Agora não": a sugestão não volta a aparecer. */
export async function dispensarSugestaoRecorrencia(chave: string): Promise<void> {
  return executarNaFila(async () => {
    const db = await getDatabase();
    await db.runAsync(`INSERT OR IGNORE INTO alertas_enviados (chave) VALUES (?);`, [`sugrec:${chave}`]);
  });
}
