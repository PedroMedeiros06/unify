/**
 * Formato interno padronizado de uma transação vinda de importação.
 *
 * TODO parser de banco (NubankParser, InterParser, BBParser, etc.) deve
 * converter o CSV bruto para este formato. Isso é o "encaixe" central:
 * o resto do app (SQLite, telas) nunca precisa saber de qual banco veio
 * o dado — só lida com este tipo.
 *
 * Campos são propositalmente mínimos e genéricos, porque é o menor
 * denominador comum entre extratos de bancos diferentes. Campos que só
 * alguns bancos oferecem (ex: categoria já vem pronta em alguns CSVs)
 * ficam em `extra`, sem forçar todo parser a preenchê-los.
 */
export type TransacaoImportada = {
  data: string; // formato ISO "AAAA-MM-DD", já normalizado — cada parser converte do formato original do banco
  descricao: string; // texto bruto da movimentação, como veio no extrato (ex: "UBER *TRIP", "PIX RECEBIDO JOAO")
  valor: number; // sempre positivo — o sinal é definido pelo campo `tipo`, não pelo valor
  tipo: "entrada" | "saida";

  // Metadados opcionais que alguns bancos fornecem e outros não.
  // Nunca assumir que existem — sempre checar antes de usar.
  extra?: {
    categoria?: string; // se o próprio banco já vier com uma categoria sugerida
    identificadorExterno?: string; // ID da transação no banco de origem, útil para deduplicação futura
  };
};

/**
 * Resultado de rodar um parser sobre um arquivo CSV.
 * Separar sucesso/erro por linha (em vez de falhar o arquivo inteiro)
 * é importante porque extratos reais quase sempre têm 1-2 linhas
 * malformadas (cabeçalho extra, linha de saldo final, etc.) — não
 * queremos que isso derrube a importação inteira.
 */
export type ResultadoParse = {
  transacoes: TransacaoImportada[];
  linhasComErro: {
    numeroLinha: number;
    conteudoOriginal: string;
    motivo: string;
  }[];
  bancoDetectado: string | null; // null se não foi possível identificar automaticamente
};

/**
 * Contrato que todo parser de banco precisa implementar.
 * `identificar` decide SE este parser sabe ler aquele arquivo
 * (baseado no cabeçalho, por exemplo) — usado na detecção automática.
 * `parse` faz a conversão de fato.
 */
export type ParserBanco = {
  idBanco: string; // ex: "nubank", "inter", "bb" — deve bater com a tabela `bancos` do SQLite
  nomeBanco: string;

  /**
   * Analisa as primeiras linhas do CSV (geralmente o cabeçalho) e
   * retorna true se este parser reconhece o formato. Usado para
   * detecção automática — o app testa cada parser cadastrado até
   * um retornar true.
   */
  identificar: (primeirasLinhas: string[]) => boolean;

  /**
   * Converte o conteúdo bruto do CSV para o formato interno.
   * Não deve lançar exceção para linhas individuais malformadas —
   * essas vão para `linhasComErro`, e o parse continua.
   */
  parse: (conteudoCsv: string) => ResultadoParse;
};
