// https://docs.expo.dev/guides/using-eslint/
// ESLint 9 (flat config). `expo lint` / `npm run lint` usam este arquivo.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "android/*", "ios/*", "src/generated/*"],
  },
  {
    rules: {
      // Permite marcar algo intencionalmente sem uso com o prefixo `_`
      // (ex.: o par [_valor, setValor] de um useState cujo valor só é
      // lido dentro dos updaters).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // Regras novas e agressivas do plugin react-hooks v6 (React 19).
      // No Unify os casos que elas apontam são padrões legítimos, não
      // bugs: (1) fetch de dados do SQLite dentro de useEffect —
      // sincronização com fonte externa; (2) reset de campos de um modal
      // quando ele abre (useEffect com [visivel]); (3) coordenar
      // montagem/animação com a prop `visivel`; (4) Animated.Value
      // guardado em useRef, idioma padrão do React Native.
      // Mantemos como aviso para não travar o lint e refatorar aos poucos.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      // Os 4 simuladores passam um objeto `parametros` recriado a cada
      // render para simular*(); as deps corretas são os primitivos que o
      // compõem, o que a regra não reconhece. Com o React Compiler ligado
      // a memoização manual é redundante de qualquer forma.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
