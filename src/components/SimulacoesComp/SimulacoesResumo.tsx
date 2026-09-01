import { View } from "react-native";
import { memo, useCallback, useState } from "react";
import { TipoSimulacao, SimulacaoSalva } from "@/database/simulacoesQueries";
import { SeletorTipoSimulacao } from "@/components/SimulacoesComp/SeletorTipoSimulacao";
import { SimuladorFinanciamento } from "@/components/SimulacoesComp/SimuladorFinanciamento";
import { SimuladorEmprestimo } from "@/components/SimulacoesComp/SimuladorEmprestimo";
import { SimuladorInvestimento } from "@/components/SimulacoesComp/SimuladorInvestimento";
import { SimuladorCambio } from "@/components/SimulacoesComp/SimuladorCambio";
import { SimulacoesRecentes } from "@/components/SimulacoesComp/SimulacoesRecentes";
import {
  ParametrosFinanciamento,
  ParametrosEmprestimo,
  ParametrosInvestimento,
  ParametrosCambio,
} from "@/utils/simulacoes";

/**
 * Painel da aba "Simulações" do Planejamento. Espelha o padrão de
 * OrcamentoResumo: entra inline na árvore do Planejamento (header e abas
 * seguem visíveis) e orquestra os três simuladores + a lista de
 * simulações salvas.
 *
 * `chaveReset` força a remontagem do simulador ativo quando o usuário
 * abre uma simulação salva — é o jeito mais simples de reinicializar
 * todos os `useState` internos do formulário com os novos parâmetros.
 */
function SimulacoesResumoBase() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoSimulacao>("financiamento");
  const [parametrosIniciais, setParametrosIniciais] = useState<
    | ParametrosFinanciamento
    | ParametrosEmprestimo
    | ParametrosInvestimento
    | ParametrosCambio
    | undefined
  >(undefined);
  const [chaveReset, setChaveReset] = useState(0);

  const handleSelecionarTipo = useCallback((tipo: TipoSimulacao) => {
    setTipoAtivo(tipo);
    setParametrosIniciais(undefined);
    setChaveReset((k) => k + 1);
  }, []);

  const handleAbrirSalva = useCallback((s: SimulacaoSalva) => {
    setTipoAtivo(s.tipo);
    setParametrosIniciais(s.parametros);
    setChaveReset((k) => k + 1);
  }, []);

  return (
    <View className="flex-col gap-4">
      <SeletorTipoSimulacao selecionado={tipoAtivo} onSelecionar={handleSelecionarTipo} />

      {tipoAtivo === "financiamento" && (
        <SimuladorFinanciamento
          key={`fin-${chaveReset}`}
          parametrosIniciais={parametrosIniciais as ParametrosFinanciamento | undefined}
        />
      )}
      {tipoAtivo === "emprestimo" && (
        <SimuladorEmprestimo
          key={`emp-${chaveReset}`}
          parametrosIniciais={parametrosIniciais as ParametrosEmprestimo | undefined}
        />
      )}
      {tipoAtivo === "investimento" && (
        <SimuladorInvestimento
          key={`inv-${chaveReset}`}
          parametrosIniciais={parametrosIniciais as ParametrosInvestimento | undefined}
        />
      )}
      {tipoAtivo === "cambio" && (
        <SimuladorCambio
          key={`cam-${chaveReset}`}
          parametrosIniciais={parametrosIniciais as ParametrosCambio | undefined}
        />
      )}

      <SimulacoesRecentes onAbrir={handleAbrirSalva} />
    </View>
  );
}

export const SimulacoesResumo = memo(SimulacoesResumoBase);
