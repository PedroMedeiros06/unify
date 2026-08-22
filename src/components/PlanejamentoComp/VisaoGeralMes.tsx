import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { View, Text, ActivityIndicator } from "react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { calcularResumoReceitasDespesas } from "@/database/queries";
import { somarCompromissosNaoPagosNoPeriodo } from "@/database/compromissosQueries";
import { SeletorMesAno } from "@/components/common/SeletorMesAno";
import { dataHojeIso } from "@/utils/dateUtils";

// Abaixo desse limiar (em módulo), a variação de saldo é tratada como
// "estável" em vez de subiu/caiu — evita mostrar "+0,3%" como se fosse
// uma mudança relevante.
const LIMIAR_ESTAVEL_PERCENTUAL = 2;

type DadosVisaoGeral = {
  receitasPrevistas: number;
  receitasVariacao: number | null;
  despesasPrevistas: number;
  despesasVariacao: number | null;
  saldoProjetado: number;
  saldoRealAtual: number;
  saldoRealAnterior: number;
};

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
}

function paraIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function VisaoGeralMesBase() {
  const cardTitleSize = moderateScale(15);
  const labelSize = moderateScale(11);
  const valueSize = moderateScale(16);
  const variationSize = moderateScale(11);

  const hojeIso = useMemo(() => dataHojeIso(), []);
  const [anoHoje, mesHoje] = hojeIso.split("-").map(Number);

  // Mês/ano sendo exibido no card — começa no mês atual, mas é
  // navegável via SeletorMesAno (grid de 12 meses).
  const [anoExibido, setAnoExibido] = useState(anoHoje);
  const [mesExibido, setMesExibido] = useState(mesHoje - 1); // 0-11, para bater com SeletorMesAno

  const [dados, setDados] = useState<DadosVisaoGeral | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      try {
        const mesHumano = mesExibido + 1; // calcularResumoReceitasDespesas espera 1-12
        const inicioMes = paraIso(anoExibido, mesExibido, 1);
        const fimMesObj = new Date(anoExibido, mesExibido + 1, 0);
        const fimMes = paraIso(fimMesObj.getFullYear(), fimMesObj.getMonth(), fimMesObj.getDate());

        const [receitasDespesas, compromissosNaoPagos] = await Promise.all([
          calcularResumoReceitasDespesas(anoExibido, mesHumano),
          somarCompromissosNaoPagosNoPeriodo(inicioMes, fimMes),
        ]);

        // Saldo real: o que já de fato entrou/saiu no mês exibido
        // (transações lançadas). Saldo projetado: soma ainda os
        // compromissos com vencimento nesse mês que ainda não foram
        // marcados como pagos — representa "quanto ainda falta sair"
        // antes do mês fechar. Para meses passados, compromissos não
        // pagos tendem a ser 0 (já foram pagos ou quitados), então o
        // projetado converge para o saldo real nesse caso.
        const saldoRealAtual = receitasDespesas.receitasMesAtual - receitasDespesas.despesasMesAtual;
        const saldoRealAnterior = receitasDespesas.receitasMesAnterior - receitasDespesas.despesasMesAnterior;
        const saldoProjetado = saldoRealAtual - compromissosNaoPagos;

        if (!ativo) return;

        setDados({
          receitasPrevistas: receitasDespesas.receitasMesAtual,
          receitasVariacao: calcularVariacao(receitasDespesas.receitasMesAtual, receitasDespesas.receitasMesAnterior),
          despesasPrevistas: receitasDespesas.despesasMesAtual,
          despesasVariacao: calcularVariacao(receitasDespesas.despesasMesAtual, receitasDespesas.despesasMesAnterior),
          saldoProjetado,
          saldoRealAtual,
          saldoRealAnterior,
        });
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [anoExibido, mesExibido]);

  const handleSelecionarMesAno = useCallback((ano: number, mes: number) => {
    setAnoExibido(ano);
    setMesExibido(mes);
  }, []);

  const receitasPrevistas = dados?.receitasPrevistas ?? 0;
  const receitasVariacao = dados?.receitasVariacao ?? null;
  const despesasPrevistas = dados?.despesasPrevistas ?? 0;
  const despesasVariacao = dados?.despesasVariacao ?? null;
  const saldoProjetado = dados?.saldoProjetado ?? 0;

  // Comparação do saldo real (não o projetado) com o mês anterior ao
  // exibido — "mês anterior" já fechou, então não faz sentido projetar
  // compromissos não pagos dele; comparamos o que de fato aconteceu
  // nos dois meses.
  const variacaoSaldoPercentual =
    dados && dados.saldoRealAnterior !== 0
      ? ((dados.saldoRealAtual - dados.saldoRealAnterior) / Math.abs(dados.saldoRealAnterior)) * 100
      : null;

  const saldoEstavel = variacaoSaldoPercentual === null || Math.abs(variacaoSaldoPercentual) < LIMIAR_ESTAVEL_PERCENTUAL;
  const saldoSubiu = variacaoSaldoPercentual !== null && variacaoSaldoPercentual >= LIMIAR_ESTAVEL_PERCENTUAL;
  const saldoCaiu = variacaoSaldoPercentual !== null && variacaoSaldoPercentual <= -LIMIAR_ESTAVEL_PERCENTUAL;

  const textoComparacaoSaldo = saldoEstavel
    ? "＝ Estável vs mês anterior"
    : saldoSubiu
      ? `↑ +${Math.round(variacaoSaldoPercentual!)}% vs mês anterior`
      : `↓ ${Math.round(variacaoSaldoPercentual!)}% vs mês anterior`;

  const corComparacaoSaldo = saldoEstavel
    ? "text-desactived-text"
    : saldoSubiu
      ? "text-sucess-color"
      : "text-error-color";

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3.5">
        <Text style={{ fontSize: cardTitleSize }} className="text-main-text font-Inter-Medium">
          Visão geral do mês
        </Text>

        <SeletorMesAno ano={anoExibido} mes={mesExibido} onSelecionar={handleSelecionarMesAno} alinhamento="direita" />
      </View>

      {carregando ? (
        <View className="items-center py-6">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-y-3">
          {/* RECEITAS */}
          <View className="w-1/2 pr-2">
            <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
              Receitas do mês
            </Text>
            {/* numberOfLines simples em vez de adjustsFontSizeToFit (caro em performance):
                trunca com "..." se o valor for grande demais, sem custo de remedição */}
            <Text
              style={{ fontSize: valueSize }}
              className="text-sucess-color font-Inter-Medium mb-1"
              numberOfLines={1}
            >
              {FormatToCurrency(receitasPrevistas)}
            </Text>
            <View className="flex-row items-center gap-0.5">
              {receitasVariacao !== null ? (
                <>
                  <Ionicons
                    name={receitasVariacao >= 0 ? "arrow-up" : "arrow-down"}
                    color={receitasVariacao >= 0 ? colors["sucess-color"] : colors["error-color"]}
                    size={10}
                  />
                  <Text
                    style={{ fontSize: variationSize }}
                    className={receitasVariacao >= 0 ? "text-sucess-color" : "text-error-color"}
                    numberOfLines={1}
                  >
                    {Math.abs(receitasVariacao)}% vs mês anterior
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: variationSize }} className="text-desactived-text" numberOfLines={1}>
                  Sem dado do mês anterior
                </Text>
              )}
            </View>
          </View>

          {/* DESPESAS */}
          <View className="w-1/2 pl-2">
            <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
              Despesas do mês
            </Text>
            <Text
              style={{ fontSize: valueSize }}
              className="text-error-color font-Inter-Medium mb-1"
              numberOfLines={1}
            >
              {FormatToCurrency(despesasPrevistas)}
            </Text>
            <View className="flex-row items-center gap-0.5">
              {despesasVariacao !== null ? (
                <>
                  <Ionicons
                    name={despesasVariacao >= 0 ? "arrow-up" : "arrow-down"}
                    color={despesasVariacao >= 0 ? colors["error-color"] : colors["sucess-color"]}
                    size={10}
                  />
                  <Text
                    style={{ fontSize: variationSize }}
                    className={despesasVariacao >= 0 ? "text-error-color" : "text-sucess-color"}
                    numberOfLines={1}
                  >
                    {Math.abs(despesasVariacao)}% vs mês anterior
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: variationSize }} className="text-desactived-text" numberOfLines={1}>
                  Sem dado do mês anterior
                </Text>
              )}
            </View>
          </View>

          {/* SALDO PROJETADO */}
          <View className="w-full pt-3 border-t border-lines-divisions">
            <Text style={{ fontSize: labelSize }} className="text-second-text mb-1">
              Saldo projetado
            </Text>
            <Text
              style={{ fontSize: valueSize }}
              className="text-main-text font-Inter-Medium mb-1"
              numberOfLines={1}
            >
              {FormatToCurrency(saldoProjetado)}
            </Text>
            <Text style={{ fontSize: variationSize }} className={corComparacaoSaldo}>
              {textoComparacaoSaldo}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export const VisaoGeralMes = memo(VisaoGeralMesBase);