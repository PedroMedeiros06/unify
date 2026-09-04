import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { View, Text, Pressable } from "react-native";
import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";

/**
 * Diálogos in-app que substituem os Alert.alert nativos do sistema —
 * mesmo visual do resto do app (ModalCentralizado), textos em pt-BR e
 * botões no estilo do tema.
 *
 * Um único modal vive aqui, no topo da árvore; as telas só chamam
 * `confirmar(...)` / `avisar(...)` e recebem uma Promise:
 *
 *   if (await confirmar({ titulo, mensagem, destrutivo: true })) { ... }
 *   await avisar({ titulo: "Pronto", mensagem: "..." });
 *
 * As chamadas são enfileiradas: se um diálogo já estiver aberto, o
 * próximo espera ele fechar (evita dois modais brigando pela tela).
 */

type OpcoesConfirmar = {
  titulo: string;
  mensagem?: string;
  textoConfirmar?: string; // padrão "Confirmar"
  textoCancelar?: string; // padrão "Cancelar"
  destrutivo?: boolean; // botão de confirmar em vermelho
};

type OpcoesAvisar = {
  titulo: string;
  mensagem?: string;
  textoBotao?: string; // padrão "OK"
};

type DialogoContextValue = {
  confirmar: (opcoes: OpcoesConfirmar) => Promise<boolean>;
  avisar: (opcoes: OpcoesAvisar) => Promise<void>;
};

const DialogoContext = createContext<DialogoContextValue | null>(null);

// Estado interno do diálogo atualmente visível.
type DialogoAtivo =
  | {
      tipo: "confirmar";
      opcoes: OpcoesConfirmar;
      resolver: (v: boolean) => void;
    }
  | {
      tipo: "avisar";
      opcoes: OpcoesAvisar;
      resolver: () => void;
    };

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [ativo, setAtivo] = useState<DialogoAtivo | null>(null);

  // Fila de diálogos aguardando: cada item é uma função que, quando
  // chamada, define o próximo `ativo`.
  const fila = useRef<(() => void)[]>([]);

  const proximo = useCallback(() => {
    const seguinte = fila.current.shift();
    if (seguinte) seguinte();
  }, []);

  const enfileirar = useCallback(
    (definir: () => void) => {
      // Usa o setter funcional só para ler o estado atual sem depender
      // dele nas deps deste callback.
      setAtivo((atual) => {
        if (atual) {
          fila.current.push(definir);
        } else {
          // Adia para fora do setState.
          queueMicrotask(definir);
        }
        return atual;
      });
    },
    []
  );

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmar) =>
      new Promise<boolean>((resolve) => {
        enfileirar(() => setAtivo({ tipo: "confirmar", opcoes, resolver: resolve }));
      }),
    [enfileirar]
  );

  const avisar = useCallback(
    (opcoes: OpcoesAvisar) =>
      new Promise<void>((resolve) => {
        enfileirar(() => setAtivo({ tipo: "avisar", opcoes, resolver: resolve }));
      }),
    [enfileirar]
  );

  const fecharCom = useCallback(
    (valor: boolean) => {
      setAtivo((atual) => {
        if (!atual) return null;
        if (atual.tipo === "confirmar") atual.resolver(valor);
        else atual.resolver();
        return null;
      });
      // Deixa a animação de saída começar antes de montar o próximo.
      setTimeout(proximo, 180);
    },
    [proximo]
  );

  const value = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar]);

  const tituloSize = moderateScale(16);
  const mensagemSize = moderateScale(12.5);
  const botaoSize = moderateScale(14);

  const ehConfirmar = ativo?.tipo === "confirmar";
  const destrutivo = ehConfirmar && (ativo.opcoes as OpcoesConfirmar).destrutivo;

  return (
    <DialogoContext.Provider value={value}>
      {children}

      <ModalCentralizado
        visivel={ativo !== null}
        onFechar={() => fecharCom(false)}
        // Confirmação não fecha tocando fora — força uma escolha
        // explícita; aviso pode fechar tocando fora (equivale a OK).
        bloquearFechamentoExterno={ehConfirmar}
      >
        {ativo && (
          <>
            <Text style={{ fontSize: tituloSize }} className="text-main-text font-Inter-SemiBold mb-1">
              {ativo.opcoes.titulo}
            </Text>
            {ativo.opcoes.mensagem ? (
              <Text
                style={{ fontSize: mensagemSize, lineHeight: mensagemSize * 1.5 }}
                className="text-second-text mb-5"
              >
                {ativo.opcoes.mensagem}
              </Text>
            ) : (
              <View className="mb-4" />
            )}

            {ehConfirmar ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => fecharCom(false)}
                  className="flex-1 py-3 rounded-xl items-center justify-center border border-input-border active:opacity-70"
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: botaoSize }} className="text-second-text font-Inter-Medium">
                    {(ativo.opcoes as OpcoesConfirmar).textoCancelar ?? "Cancelar"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => fecharCom(true)}
                  className={`flex-1 py-3 rounded-xl items-center justify-center active:opacity-80 ${
                    destrutivo ? "bg-error-color" : "bg-active-icon"
                  }`}
                  accessibilityRole="button"
                >
                  <Text style={{ fontSize: botaoSize }} className="text-white font-Inter-SemiBold">
                    {(ativo.opcoes as OpcoesConfirmar).textoConfirmar ?? "Confirmar"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => fecharCom(true)}
                className="w-full py-3 rounded-xl items-center justify-center bg-active-icon active:opacity-80"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: botaoSize }} className="text-white font-Inter-SemiBold">
                  {(ativo.opcoes as OpcoesAvisar).textoBotao ?? "OK"}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ModalCentralizado>
    </DialogoContext.Provider>
  );
}

export function useDialogo() {
  const ctx = useContext(DialogoContext);
  if (!ctx) {
    throw new Error("useDialogo precisa ser usado dentro de um DialogoProvider");
  }
  return ctx;
}
