import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { FormatToCurrency } from "@/utils/formatNumber";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable, Switch, ActivityIndicator } from "react-native";
import { memo, useCallback, useMemo, useState } from "react";
import { useRecorrencias } from "@/context/RecorrenciasContext";
import { Recorrencia, CamposRecorrencia } from "@/database/recorrenciasQueries";
import { obterCategoriaPorId } from "@/database/categorias";
import { formatarRegraVencimento } from "@/database/datasRecorrencia";
import { EditarRecorrenciaModal } from "@/components/RecorrenciasComp/EditarRecorrenciaModal";

const RecorrenciaItem = memo(function RecorrenciaItem({
  recorrencia,
  onEditar,
  onAlternarAtiva,
}: {
  recorrencia: Recorrencia;
  onEditar: (r: Recorrencia) => void;
  onAlternarAtiva: (r: Recorrencia) => void;
}) {
  const tituloSize = moderateScale(13);
  const subtituloSize = moderateScale(10);
  const valorSize = moderateScale(13);

  const categoria = obterCategoriaPorId(recorrencia.categoriaId);
  const cor = categoria?.cor ?? colors["desactived-text"];
  const icone = categoria?.icone ?? "repeat-outline";
  const inativa = !recorrencia.ativa;

  return (
    <Pressable
      onPress={() => onEditar(recorrencia)}
      className="flex-row items-center py-2.5 border-b border-lines-divisions active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${recorrencia.nome}, ${FormatToCurrency(recorrencia.valor)}. Toque para editar.`}
    >
      <View
        style={{ backgroundColor: `${cor}22`, opacity: inativa ? 0.4 : 1 }}
        className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 mr-2.5"
      >
        <Ionicons name={icone} color={cor} size={15} />
      </View>

      <View className="flex-1 pr-2">
        <Text
          style={{ fontSize: tituloSize }}
          className={inativa ? "text-desactived-text font-Inter-Medium" : "text-main-text font-Inter-Medium"}
          numberOfLines={1}
        >
          {recorrencia.nome}
        </Text>
        <Text style={{ fontSize: subtituloSize }} className="text-desactived-text" numberOfLines={1}>
          {formatarRegraVencimento(recorrencia)}
          {categoria ? ` · ${categoria.nome}` : ""}
        </Text>
      </View>

      <View className="items-end flex-shrink-0 mr-2">
        <Text
          style={{ fontSize: valorSize }}
          className={inativa ? "text-desactived-text font-Inter-Medium" : "text-main-text font-Inter-Medium"}
          numberOfLines={1}
        >
          {FormatToCurrency(recorrencia.valor)}
        </Text>
      </View>

      <Switch
        value={recorrencia.ativa}
        onValueChange={() => onAlternarAtiva(recorrencia)}
        trackColor={{ false: colors["input-border"], true: colors["active-icon"] }}
        thumbColor="#fff"
        accessibilityLabel={recorrencia.ativa ? "Desativar recorrência" : "Ativar recorrência"}
      />
    </Pressable>
  );
});

function Secao({
  titulo,
  itens,
  total,
  onEditar,
  onAlternarAtiva,
}: {
  titulo: string;
  itens: Recorrencia[];
  total: number;
  onEditar: (r: Recorrencia) => void;
  onAlternarAtiva: (r: Recorrencia) => void;
}) {
  const tituloSize = moderateScale(12);
  const totalSize = moderateScale(12);

  if (itens.length === 0) return null;

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-1">
        <Text style={{ fontSize: tituloSize }} className="text-second-text font-Inter-Medium uppercase">
          {titulo}
        </Text>
        <Text style={{ fontSize: totalSize }} className="text-main-text font-Inter-SemiBold">
          {FormatToCurrency(total)}/mês
        </Text>
      </View>

      {itens.map((r) => (
        <RecorrenciaItem key={r.id} recorrencia={r} onEditar={onEditar} onAlternarAtiva={onAlternarAtiva} />
      ))}
    </View>
  );
}

function ListaRecorrenciasBase() {
  const textoSize = moderateScale(12);
  const {
    recorrencias,
    carregando,
    erro,
    adicionarRecorrencia,
    editarRecorrencia,
    alternarAtiva,
    removerRecorrencia,
  } = useRecorrencias();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [recorrenciaEditando, setRecorrenciaEditando] = useState<Recorrencia | null>(null);

  const { receitas, despesas, totalReceitas, totalDespesas } = useMemo(() => {
    const receitas = recorrencias.filter((r) => r.tipo === "entrada");
    const despesas = recorrencias.filter((r) => r.tipo === "saida");
    const soma = (lista: Recorrencia[]) =>
      lista.reduce((acc, r) => (r.ativa ? acc + r.valor : acc), 0);
    return {
      receitas,
      despesas,
      totalReceitas: soma(receitas),
      totalDespesas: soma(despesas),
    };
  }, [recorrencias]);

  const handleAbrirNova = useCallback(() => {
    setRecorrenciaEditando(null);
    setModalVisivel(true);
  }, []);

  const handleEditar = useCallback((r: Recorrencia) => {
    setRecorrenciaEditando(r);
    setModalVisivel(true);
  }, []);

  const handleFechar = useCallback(() => {
    setModalVisivel(false);
    setRecorrenciaEditando(null);
  }, []);

  const handleAlternarAtiva = useCallback(
    (r: Recorrencia) => {
      void alternarAtiva(r.id, !r.ativa);
    },
    [alternarAtiva]
  );

  const handleSalvar = useCallback(
    async (id: string | null, campos: CamposRecorrencia) => {
      if (id) {
        await editarRecorrencia(id, campos);
      } else {
        await adicionarRecorrencia(campos);
      }
    },
    [adicionarRecorrencia, editarRecorrencia]
  );

  return (
    <View className="flex-col gap-4">
      <View className="flex-row justify-between items-center">
        <Text style={{ fontSize: moderateScale(14) }} className="text-main-text font-Inter-SemiBold">
          Suas recorrências
        </Text>
        <Pressable
          onPress={handleAbrirNova}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Adicionar recorrência"
        >
          <Ionicons name="add-circle-outline" color={colors["active-icon"]} size={22} />
        </Pressable>
      </View>

      {erro && (
        <Text style={{ fontSize: textoSize }} className="text-error-color">
          {erro}
        </Text>
      )}

      {carregando ? (
        <View className="items-center py-10">
          <ActivityIndicator color={colors["active-icon"]} />
        </View>
      ) : recorrencias.length === 0 ? (
        <View className="items-center py-10">
          <Ionicons name="repeat-outline" color={colors["desactived-text"]} size={26} />
          <Text style={{ fontSize: textoSize }} className="text-desactived-text text-center mt-2 px-6">
            Nenhuma recorrência cadastrada. Toque no + para registrar uma receita ou despesa que se repete todo mês.
          </Text>
        </View>
      ) : (
        <>
          <Secao
            titulo="Receitas"
            itens={receitas}
            total={totalReceitas}
            onEditar={handleEditar}
            onAlternarAtiva={handleAlternarAtiva}
          />
          <Secao
            titulo="Despesas"
            itens={despesas}
            total={totalDespesas}
            onEditar={handleEditar}
            onAlternarAtiva={handleAlternarAtiva}
          />
        </>
      )}

      <EditarRecorrenciaModal
        visivel={modalVisivel}
        recorrenciaEditando={recorrenciaEditando}
        onFechar={handleFechar}
        onSalvar={handleSalvar}
        onExcluir={removerRecorrencia}
      />
    </View>
  );
}

export const ListaRecorrencias = memo(ListaRecorrenciasBase);
