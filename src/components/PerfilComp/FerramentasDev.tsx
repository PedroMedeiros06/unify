import { moderateScale } from "@/utils/scale";
import { View, Text } from "react-native";
import { memo, useCallback, useState } from "react";
import { MenuItem } from "./MenuItem";
import { useResetApp } from "@/context/ResetAppContext";
import { useDialogo } from "@/context/DialogoContext";
import { popularDadosDeTesteDev, removerDadosDeTesteDev } from "@/database/dadosTesteDev";

/**
 * Card de ferramentas de DESENVOLVIMENTO na tela de Perfil — só é
 * renderizado em `__DEV__` (ver Perfil.tsx). Serve para gerar massa de
 * dados e medir performance (boot, listas, gráficos, Agenda) antes e
 * depois das otimizações. Nunca aparece no build de produção.
 *
 * Depois de inserir/remover, força a remontagem dos providers
 * (mesmo mecanismo do "restaurar backup") para as telas relerem o banco.
 */
function FerramentasDevBase() {
  const { remontarDados } = useResetApp();
  const { avisar } = useDialogo();
  const [ocupado, setOcupado] = useState(false);

  const handlePopular = useCallback(async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const ms = await popularDadosDeTesteDev(3000);
      remontarDados();
      await avisar({ titulo: "Dados de teste", mensagem: `3000 transações inseridas em ${ms} ms.` });
    } catch (e) {
      await avisar({ titulo: "Falhou", mensagem: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado(false);
    }
  }, [ocupado, remontarDados, avisar]);

  const handleRemover = useCallback(async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const total = await removerDadosDeTesteDev();
      remontarDados();
      await avisar({ titulo: "Dados de teste", mensagem: `${total} transações de teste removidas.` });
    } catch (e) {
      await avisar({ titulo: "Falhou", mensagem: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado(false);
    }
  }, [ocupado, remontarDados, avisar]);

  return (
    <View className="bg-card-background border border-dashed border-warn-color rounded-xl p-4">
      <Text style={{ fontSize: moderateScale(15) }} className="text-warn-color font-Inter-Medium mb-1">
        Ferramentas de desenvolvimento
      </Text>
      <MenuItem
        icone="flask-outline"
        titulo="Gerar 3000 transações de teste"
        subtitulo={ocupado ? "Processando..." : "Para medir performance (só dev)"}
        onPress={handlePopular}
      />
      <MenuItem
        icone="close-circle-outline"
        titulo="Remover transações de teste"
        subtitulo="Apaga só as geradas acima"
        onPress={handleRemover}
        isLast
      />
    </View>
  );
}

export const FerramentasDev = memo(FerramentasDevBase);
