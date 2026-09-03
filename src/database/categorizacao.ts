import { CategoriaId, ehCategoriaIdValido } from "./categorias";
import { buscarRegrasPorPadroes } from "./regrasAprendidasQueries";

/**
 * Motor de categorização automática de transações.
 *
 * Prioridade (obrigatória, nunca invertida):
 *   1. Regra aprendida pelo usuário (tabela regras_categorizacao, origem = 'usuario')
 *   2. Regra do sistema (fixa em código, abaixo, origem = 'sistema')
 *   3. Sem categoria (null) — nunca "chutamos" uma categoria por baixa confiança
 *
 * Regras do sistema ficam fixas em código nesta versão (sem seed em
 * tabela): são determinísticas, não usam IA/API externa, e funcionam
 * 100% offline. Regras aprendidas SEMPRE prevalecem sobre uma regra de
 * sistema para o mesmo padrão — isso é garantido porque o motor
 * consulta primeiro a tabela e só cai para o código se não achar nada
 * lá (ver categorizarLote). Uma correção manual do usuário sobre uma
 * transação que já tinha sido categorizada por regra de sistema
 * SUBSTITUI essa regra a partir de então (UPSERT em
 * salvarRegraCategorizacao, chamado por quem edita a transação).
 *
 * IMPORTANTE sobre a chave de regra: em todo o app, a chave usada para
 * gravar/consultar uma regra aprendida é sempre
 * `normalizarPadraoDescricao(descricao_ou_nome_da_transacao)` — nunca o
 * subtítulo, nunca a categoria anterior. Isso vale nos três pontos que
 * tocam em regras: categorizarLote (importação), definirCategoriaNoPreview
 * (correção ainda no preview) e aprenderComEdicaoManual (edição pós-
 * importação, em TransacoesContext.tsx). Se algum desses pontos usar uma
 * chave diferente, a regra aprendida deixa de "reconhecer" a mesma
 * transação nas próximas vezes — por isso não crie um novo ponto de
 * gravação sem reusar normalizarPadraoDescricao.
 */

export type ResultadoCategorizacao = {
  categoriaId: CategoriaId | null;
  origem: "usuario" | "sistema" | null;
};

/**
 * Normaliza uma descrição para servir de CHAVE de regra: lowercase,
 * sem acentos, sem espaços duplicados/extras.
 *
 * Importante: diferente de `descricoesSaoParecidas` (deduplicacao.ts),
 * aqui a comparação final é sempre por IGUALDADE EXATA da string
 * normalizada — nunca "contains"/match parcial. Match parcial em regra
 * aprendida seria perigoso (ex: aprender "uber" isolado passaria a
 * capturar qualquer descrição que contenha essas letras dentro de uma
 * palavra maior). A normalização aqui só remove ruído cosmético
 * (maiúsculas, acentos, espaçamento), não aproxima textos diferentes.
 */
export function normalizarPadraoDescricao(descricao: string): string {
  return descricao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Regras de sistema: fixas em código, avaliadas por palavra-chave
 * (match parcial "includes" — aceitável aqui porque são regras amplas
 * e curadas manualmente, diferente de uma regra aprendida individual).
 * A ordem importa: a primeira regra cujo padrão bater é usada.
 *
 * Esta lista substitui o REGRAS_CATEGORIA que antes vivia isolado em
 * useImportacaoCsv.ts — agora é a única fonte de regras de sistema.
 */
const REGRAS_SISTEMA: { palavras: string[]; categoriaId: CategoriaId }[] = [
  // Regras específicas primeiro; as genéricas ("compra", "loja", "pix")
  // ficam no fim porque casariam com quase tudo.
  { palavras: ["salario", "salário", "pagamento salario", "folha de pagamento", "provento", "rem folha", "adto salarial"], categoriaId: "salario" },
  { palavras: ["freela", "freelance", "reembolso", "restituicao", "restituição", "venda", "cashback", "comissao", "comissão"], categoriaId: "renda_extra" },
  { palavras: ["uber", "99app", "99 *", "cabify", "taxi", "táxi", "combustivel", "combustível", "posto", "ipiranga", "shell", "petrobras", "estacionamento", "pedagio", "pedágio", "sem parar", "conectcar", "bilhete unico", "bilhete único", "metro", "metrô", "brt"], categoriaId: "transporte" },
  { palavras: ["netflix", "spotify", "amazon prime", "prime video", "disney", "hbo", "max", "globoplay", "deezer", "youtube premium", "apple.com/bill", "google play", "icloud", "dropbox", "chatgpt", "openai", "gympass", "totalpass", "assinatura", "mensalidade digital"], categoriaId: "assinaturas" },
  { palavras: ["escola", "colegio", "colégio", "faculdade", "universidade", "curso", "matricula", "matrícula", "udemy", "alura", "coursera", "livraria", "material escolar", "apostila", "kumon", "wizard", "cna ", "cultura inglesa"], categoriaId: "educacao" },
  { palavras: ["luz", "energia", "enel", "cemig", "cpfl", "light", "equatorial", "copel", "agua", "água", "sabesp", "sanepar", "cedae", "gas", "gás", "comgas", "internet", "vivo", "claro", "tim", "oi ", "net ", "telefone", "banda larga", "conta de telefone"], categoriaId: "contas" },
  { palavras: ["iptu", "ipva", "licenciamento", "darf", "das ", "gps ", "tarifa", "iof", "juros", "anuidade", "taxa bancaria", "taxa bancária", "cartorio", "cartório", "multa"], categoriaId: "impostos" },
  { palavras: ["petshop", "pet shop", "pet ", "veterinario", "veterinário", "vet ", "racao", "ração", "cobasi", "petz", "banho e tosa"], categoriaId: "pets" },
  { palavras: ["salao", "salão", "cabeleireiro", "barbearia", "barber", "manicure", "estetica", "estética", "spa", "sobrancelha", "depilacao", "depilação", "boticario", "boticário", "sephora", "perfumaria"], categoriaId: "beleza" },
  { palavras: ["presente", "gift", "vaquinha", "doacao", "doação", "vakinha", "apae", "ong ", "dizimo", "dízimo", "oferta"], categoriaId: "presentes" },
  { palavras: ["passagem", "gol ", "latam", "azul ", "voo", "cvc", "booking", "airbnb", "hotel", "hospedagem", "pousada", "decolar", "hurb", "123milhas", "resort"], categoriaId: "viagem" },
  { palavras: ["ted", "doc", "transferencia", "transferência"], categoriaId: "transferencia" },
  { palavras: ["boleto"], categoriaId: "boleto" },
  { palavras: ["aplicação", "aplicacao", "rdb", "resgate", "cdb", "tesouro"], categoriaId: "investimentos" },
  { palavras: ["condominio", "condomínio", "aluguel", "imobiliaria", "imobiliária", "reforma", "material de construcao", "material de construção", "leroy", "telha norte"], categoriaId: "casa" },
  { palavras: ["farmacia", "farmácia", "drogaria", "drogasil", "pacheco", "raia", "consulta", "clinica", "clínica", "laboratorio", "laboratório", "exame", "dentista", "hospital", "plano de saude", "plano de saúde", "unimed", "hapvida", "amil"], categoriaId: "saude" },
  { palavras: ["cinema", "ingresso", "ingresso.com", "show", "teatro", "steam", "playstation", "xbox", "nintendo", "parque", "boliche"], categoriaId: "lazer" },
  { palavras: ["padaria", "restaurante", "lanchonete", "ifood", "rappi", "delivery", "pizzaria", "hamburgueria", "cafeteria", "starbucks", "mcdonald", "burger king", "bar "], categoriaId: "alimentacao" },
  { palavras: ["mercado", "supermercado", "supermarcon", "hortifruti", "sacolao", "sacolão", "atacadao", "atacadão", "assai", "assaí", "carrefour", "pao de acucar", "pão de açúcar", "acougue", "açougue"], categoriaId: "mercado" },
  { palavras: ["pix"], categoriaId: "transferencia" },
  { palavras: ["cartão", "cartao", "compra", "loja", "magazine", "americanas", "shopee", "aliexpress", "mercado livre", "mercadolivre"], categoriaId: "compras" },
];

/** Aplica só as regras de sistema (código fixo) a uma descrição já normalizada. */
function categorizarPorRegraDeSistema(padraoNormalizado: string): CategoriaId | null {
  for (const regra of REGRAS_SISTEMA) {
    if (regra.palavras.some((palavra) => padraoNormalizado.includes(palavra))) {
      return regra.categoriaId;
    }
  }
  return null;
}

/**
 * Categoriza um LOTE de descrições de uma vez — pensado para o fluxo
 * de importação de CSV, onde temos N transações e precisamos evitar
 * N queries sequenciais ao banco (uma busca de regra aprendida por
 * transação). Faz UMA busca em lote (`buscarRegrasPorPadroes`) para
 * todos os padrões únicos do arquivo, depois resolve cada descrição
 * em memória.
 *
 * Retorna um Map descrição original -> resultado. Se a mesma descrição
 * aparecer mais de uma vez na lista de entrada, o resultado é o mesmo
 * para todas as ocorrências (a chave do Map é a descrição, não o índice).
 */
export async function categorizarLote(
  descricoes: string[]
): Promise<Map<string, ResultadoCategorizacao>> {
  const padroesPorDescricao = new Map<string, string>();
  for (const descricao of descricoes) {
    padroesPorDescricao.set(descricao, normalizarPadraoDescricao(descricao));
  }

  const padroesUnicos = Array.from(new Set(padroesPorDescricao.values()));
  const regrasAprendidas = await buscarRegrasPorPadroes(padroesUnicos);

  const resultado = new Map<string, ResultadoCategorizacao>();

  for (const descricao of descricoes) {
    const padrao = padroesPorDescricao.get(descricao)!;

    // 1) Regra aprendida pelo usuário — prioridade máxima, sempre.
    // Consultada primeiro; regra de sistema só é avaliada se esta faltar.
    const regraAprendida = regrasAprendidas.get(padrao);
    if (regraAprendida && ehCategoriaIdValido(regraAprendida.categoriaId)) {
      resultado.set(descricao, { categoriaId: regraAprendida.categoriaId, origem: regraAprendida.origem });
      continue;
    }

    // 2) Regra de sistema (código fixo) — só avaliada se não houver regra aprendida.
    const categoriaSistema = categorizarPorRegraDeSistema(padrao);
    if (categoriaSistema) {
      resultado.set(descricao, { categoriaId: categoriaSistema, origem: "sistema" });
      continue;
    }

    // 3) Sem categoria — nunca inventamos por aproximação.
    resultado.set(descricao, { categoriaId: null, origem: null });
  }

  return resultado;
}

/**
 * Versão para uma única descrição (conveniência para fluxos que não
 * são em lote, ex: adicionar uma transação manual avulsa). Internamente
 * ainda faz apenas 1 consulta ao banco — use `categorizarLote` sempre
 * que houver mais de uma descrição para categorizar de uma vez.
 */
export async function categorizarTransacao(descricao: string): Promise<ResultadoCategorizacao> {
  const resultado = await categorizarLote([descricao]);
  return resultado.get(descricao) ?? { categoriaId: null, origem: null };
}