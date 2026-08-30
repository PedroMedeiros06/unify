# Unify

Aplicativo de **organização e visualização da vida financeira** — pessoal, local e em português.

O Unify **não é um banco** e **não movimenta dinheiro**. Ele não cria transações
por conta própria: tudo o que aparece como "realizado" vem exclusivamente de
transações reais que o usuário registrou ou importou. O papel do app é reunir,
categorizar, planejar e comparar — não executar operações financeiras.

## O que o app faz

- **Transações** — registro manual e importação de extratos (CSV de Nubank, Inter,
  Banco do Brasil), com categorização automática que aprende com as correções do
  usuário.
- **Planejamento** — visão geral do mês (receitas, despesas e saldo projetado).
- **Metas** — objetivos financeiros cujo progresso é derivado de transações reais
  vinculadas manualmente pelo usuário (nunca por heurística). Tela separada de
  metas já concluídas (progresso ≥ valor objetivo).
- **Compromissos** — contas e prazos futuros. Um compromisso só fica "pago"
  quando existe uma transação real vinculada a ele; marcar como pago é
  **selecionar uma transação existente**, não criar uma nova.
- **Agenda** — calendário mensal com compromissos, boletos, prazos de metas e as
  ocorrências previstas das recorrências. A lista "Próximos eventos" parte do dia
  selecionado no calendário e agrupa ocorrências repetidas da mesma recorrência
  (ex.: um "Salário" em vez de três).
- **Orçamento** — camada de previsão e reconciliação, com limites de gasto por
  categoria e por mês (ver abaixo).
- **Perfil** — o app não tem login nem conta; a ação equivalente a "sair" é
  **apagar os dados do app**, que zera o banco local e volta ao estado de
  primeiro uso.

## Módulo de Orçamento

O Orçamento é uma camada de **previsão × realizado**, não um limite de gastos.

- **Recorrência** — regra de planejamento (uma receita ou despesa que costuma
  acontecer todo mês). Não é uma transação.
- **Ocorrência prevista** — a instância de uma recorrência num mês específico.
  Continua sendo planejamento; guarda um *snapshot* para que meses encerrados
  não sejam afetados por mudanças posteriores na recorrência.
- **Congelamento** — a partir da âncora de início de uso, todo mês já encerrado
  tem suas ocorrências materializadas e é marcado como congelado. Depois disso a
  leitura usa exclusivamente os snapshots.
- **Realizado** — vem apenas das transações reais do mês.
- **Limites por categoria** — teto de gasto que o usuário define **por categoria
  e por mês** (histórico: alterar o limite de um mês não afeta os outros). É só
  acompanhamento — nunca bloqueia uma transação. O card mostra apenas as
  categorias para as quais o usuário definiu um limite.
- **Análise** — sempre referente ao **mês anterior** (mês fechado): receita
  prevista × realizada e despesa prevista × realizada, cada uma com a variação
  percentual, mais a categoria de maior gasto do mês.
- **Dicas** — conteúdo fixo de educação financeira (regra 50/30/20, orçamento
  base zero, pagar-se primeiro, reserva de emergência, etc.), não derivado dos
  dados do usuário.

Correspondência automática previsão × transação e as dicas personalizadas (com
base nos gastos reais do usuário) são de fases seguintes.

## Stack

- [Expo](https://expo.dev) (~57) / React Native 0.86 / React 19
- `expo-router` (usado só como `<Slot />` — a navegação entre telas é própria,
  em `src/context/NavigationContext.tsx`)
- NativeWind v5 + Tailwind v4 (tema escuro; tokens em `src/global.css` /
  `src/theme/colors.ts`)
- `expo-sqlite` com sistema de *migrations* versionadas
  (`src/database/migrations.ts`, `PRAGMA user_version`, append-only)
- `react-native-svg` para gráficos

### Organização do código

- `src/pages/` — telas
- `src/components/<Dominio>Comp/` — componentes por domínio
- `src/context/` — um Provider por domínio (transações, metas, compromissos,
  recorrências, perfil, navegação), com CRUD + `recarregar`
- `src/database/` — uma camada de *queries* por domínio; toda operação de banco
  passa por `executarNaFila()` (fila serializada, evita chamadas concorrentes ao
  SQLite nativo)
- `src/utils/` — datas (ISO `aaaa-mm-dd` internamente), formatação de moeda,
  escala de fontes

Categorias são uma lista fixa de 11 slugs em `src/database/categorias.ts` —
único lugar a editar para adicionar/renomear/reordenar.

## Rodando

```bash
npm install
npx expo start
```

No output do Expo, escolha Android emulator, iOS simulator ou Expo Go.

Lint:

```bash
npm run lint
```

## Versionamento

SemVer `vX.Y.Z`. App ainda não lançado, então segue a série `0.y.z`:

- `Y` (minor) — marco de funcionalidade / etapa concluída
- `Z` (patch) — correções dentro de uma etapa

Cada versão é um commit com prefixo `vX.Y.Z:` no assunto, uma tag anotada e
`package.json`, `package-lock.json` e `app.json` (`expo.version`) acompanhando —
os três sempre iguais entre si e à tag. A tela "Sobre a Unify" lê essa versão de
`app.json` em tempo de execução, sem string fixa.
