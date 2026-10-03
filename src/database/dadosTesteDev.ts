import { getDatabase, executarNaFila } from "./database";
import { CATEGORIAS } from "./categorias";
import { garantirBancosSuportados } from "./queries";

/**
 * Gerador de massa de dados para MEDIR performance em desenvolvimento.
 *
 * ATENÇÃO — exceção consciente à regra "o Unify nunca cria transação
 * fictícia": este módulo só existe para o dev simular um usuário com
 * anos de histórico e medir boot, listas, gráficos e Agenda antes/depois
 * das otimizações. Ele é bloqueado fora de `__DEV__` (a função retorna
 * sem fazer nada) e o único ponto de entrada na UI também só é
 * renderizado em `__DEV__` (ver SuporteInformacoes.tsx). Nunca chamar
 * em fluxo de produção.
 *
 * As linhas geradas têm `identificador_externo` com o prefixo
 * `dev-teste-`, para poderem ser removidas sem tocar em dados reais
 * (ver `removerDadosDeTesteDev`).
 */

const PREFIXO_ID_EXTERNO = "dev-teste-";

const NOMES_SAIDA = [
  "Mercado Extra", "Uber *Trip", "iFood", "Posto Ipiranga", "Netflix",
  "Farmácia Drogasil", "Padaria Central", "Conta de luz Enel", "Aluguel",
  "Shopee", "Cinema", "Pet Shop", "Academia", "Restaurante", "Pix enviado",
];
const NOMES_ENTRADA = ["Salário", "Pix recebido", "Reembolso", "Venda OLX", "Cashback"];
const BANCOS = ["nubank", "inter", "bb"];

function sortear<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function isoDiasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Insere `quantidade` transações espalhadas pelos últimos `diasHistorico`
 * dias, numa única transação SQL. Retorna quanto tempo (ms) a inserção
 * levou — útil como referência de custo de escrita em lote.
 */
export async function popularDadosDeTesteDev(
  quantidade = 3000,
  diasHistorico = 730
): Promise<number> {
  if (!__DEV__) return 0;

  // Os bancos precisam existir por causa da FK de transacoes.banco_id.
  await garantirBancosSuportados();

  return executarNaFila(async () => {
    const db = await getDatabase();
    const inicio = Date.now();

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < quantidade; i++) {
        // ~15% entradas, o resto saídas — perfil parecido com extrato real.
        const entrada = Math.random() < 0.15;
        const categoria = sortear(CATEGORIAS);
        const valor = entrada
          ? Math.round((500 + Math.random() * 4500) * 100) / 100
          : Math.round((5 + Math.random() * 400) * 100) / 100;

        await db.runAsync(
          `INSERT INTO transacoes
             (id, nome, subtitulo, valor, tipo, data, hora, banco_id, status,
              categoria_icone, categoria_id, identificador_externo)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'concluida', ?, ?, ?);`,
          [
            `dev-${Date.now()}-${i}`,
            entrada ? sortear(NOMES_ENTRADA) : sortear(NOMES_SAIDA),
            categoria.nome,
            valor,
            entrada ? "entrada" : "saida",
            isoDiasAtras(Math.floor(Math.random() * diasHistorico)),
            sortear(BANCOS),
            categoria.icone,
            categoria.id,
            `${PREFIXO_ID_EXTERNO}${i}-${Math.random().toString(36).slice(2, 8)}`,
          ]
        );
      }
    });

    return Date.now() - inicio;
  });
}

/** Remove só as transações geradas por `popularDadosDeTesteDev`. */
export async function removerDadosDeTesteDev(): Promise<number> {
  if (!__DEV__) return 0;

  return executarNaFila(async () => {
    const db = await getDatabase();
    const r = await db.runAsync(
      `DELETE FROM transacoes WHERE identificador_externo LIKE ?;`,
      [`${PREFIXO_ID_EXTERNO}%`]
    );
    return r.changes;
  });
}
