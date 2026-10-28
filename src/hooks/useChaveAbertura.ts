import { useState } from "react";

/**
 * Número que sobe toda vez que `visivel` passa de false para true.
 *
 * Uso: `<Formulario key={chave} ... />` dentro de um modal — cada
 * abertura remonta o formulário com o estado inicial vindo dos
 * `useState(() => ...)`, em vez de um useEffect que "reseta" vários
 * campos com setState (padrão que o React Compiler sinaliza como render
 * em cascata). O ajuste de estado durante o render abaixo é o padrão
 * documentado pelo React para derivar estado de uma prop que mudou.
 */
export function useChaveAbertura(visivel: boolean): number {
  const [chave, setChave] = useState(0);
  const [visivelAnterior, setVisivelAnterior] = useState(visivel);
  if (visivel !== visivelAnterior) {
    setVisivelAnterior(visivel);
    if (visivel) setChave((k) => k + 1);
  }
  return chave;
}
