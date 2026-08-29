import { memo, useCallback, useState } from "react";
import { View } from "react-native";

import { VisaoGeralOrcamento } from "@/components/OrcamentoComp/VisaoGeralOrcamento";
import { CategoriasOrcamento } from "@/components/OrcamentoComp/CategoriasOrcamento";
import { AnaliseOrcamento } from "@/components/OrcamentoComp/AnaliseOrcamento";
import { DicasOrcamento } from "@/components/OrcamentoComp/DicasOrcamento";
import { MES_EXIBIDO_MOCK } from "@/database/orcamentoMock";

/**
 * Painel da aba "Orçamento" do Planejamento.
 *
 * IMPORTANTE: NÃO é uma tela própria. É renderizado INLINE dentro de
 * Planejamento.tsx quando `activeTab === "Orçamento"`, exatamente no
 * mesmo padrão da aba "Metas" (que renderiza <MinhasMetas />). Por
 * isso aqui não tem header, não tem ScrollView e não tem botão de
 * voltar — tudo isso já vem do Planejamento (header "Planejamento" +
 * PlanejamentoTabs + footer continuam visíveis).
 *
 * TODOS OS DADOS SÃO MOCKADOS (ver src/database/orcamentoMock.ts). A
 * lógica real (queries no SQLite, tabela de limites por categoria,
 * cálculo de economia/maior gasto/redução vs mês anterior) ainda não
 * foi implementada — este painel existe só para validar o visual. Os
 * componentes filhos (OrcamentoComp/*) foram desenhados para receber
 * os mesmos formatos de dados quando a origem deixar de ser constante
 * e passar a ser resultado de query.
 */
function OrcamentoResumoBase() {
  // Mês/ano exibido no card de Visão geral — navegável via
  // SeletorMesAno, mas ainda não afeta os dados (todos mockados).
  const [anoExibido, setAnoExibido] = useState(MES_EXIBIDO_MOCK.ano);
  const [mesExibido, setMesExibido] = useState(MES_EXIBIDO_MOCK.mes);

  const handleSelecionarMesAno = useCallback((ano: number, mes: number) => {
    setAnoExibido(ano);
    setMesExibido(mes);
  }, []);

  return (
    <View className="flex-col gap-4">
      <VisaoGeralOrcamento
        anoExibido={anoExibido}
        mesExibido={mesExibido}
        onSelecionarMesAno={handleSelecionarMesAno}
      />

      <CategoriasOrcamento />

      <AnaliseOrcamento />

      <DicasOrcamento />
    </View>
  );
}

export const OrcamentoResumo = memo(OrcamentoResumoBase);
