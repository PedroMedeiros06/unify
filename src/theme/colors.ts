// Este arquivo é um espelho tipado das variáveis definidas em `src/global.css`.
// Sempre que alterar uma cor, altere primeiro em `global.css` e replique aqui.
// Usado apenas onde precisamos do valor de cor em JS (ex: prop `color` de ícones),
// já que classes Tailwind (`bg-main-background`, `text-second-text` etc.) leem
// diretamente do CSS e não precisam deste objeto.
 
export const colors = {
  "main-background": "#0B0F14",
  "card-background": "#121821",
  "lines-divisions": "#232C3B",
  "strong-border": "#2F3A4D",
 
  "main-text": "#E6EDF3",
  "second-text": "#AAB4C3",
  "desactived-text": "#6B778C",
 
  "green-money": "#22C55E",
  "warn-color": "#F59E0B",
  "error-color": "#EF4444",
  "sucess-color": "#10B981",
 
  "input-background": "#0F141B",
  "input-border": "#2F3A4D",
 
  "active-icon": "#8D51E6",
 
  "inter-bank": "#FF7A01",
  "nubank": "#8D11DA",
  "bancoDoBrasil": "#FDFC30",
} as const;