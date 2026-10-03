import { useCallback, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { CabecalhoTela } from "@/components/common/CabecalhoTela";
import { CategoriaFormModal } from "@/components/CategoriasComp/CategoriaFormModal";
import { useCategorias } from "@/context/CategoriasContext";
import { useTransacoes } from "@/context/TransacoesContext";
import { useDialogo } from "@/context/DialogoContext";
import { CATEGORIAS, Categoria } from "@/database/categorias";
import { contarUsoCategoria } from "@/database/categoriasQueries";

/**
 * Categorias: as do sistema (fixas, só leitura) e as personalizadas,
 * que o usuário cria, edita, arquiva ou exclui.
 */
export function Categorias() {
  const colors = useThemeColors();
  const { personalizadas, arquivar, excluir } = useCategorias();
  const { recarregar } = useTransacoes();
  const { confirmar } = useDialogo();

  const [form, setForm] = useState<{ aberto: boolean; categoria: Categoria | null }>({ aberto: false, categoria: null });
  const [verSistema, setVerSistema] = useState(false);

  const handleExcluir = useCallback(
    async (c: Categoria) => {
      const uso = await contarUsoCategoria(c.id);
      const partes = [
        uso.transacoes > 0 ? `${uso.transacoes} transaç${uso.transacoes === 1 ? "ão ficará" : "ões ficarão"} sem categoria` : null,
        uso.recorrencias > 0 ? `${uso.recorrencias} recorrência(s) ficarão sem categoria` : null,
        uso.limites > 0 ? `${uso.limites} limite(s) de orçamento serão removidos` : null,
      ].filter(Boolean);
      const ok = await confirmar({
        titulo: `Excluir "${c.nome}"?`,
        mensagem:
          (partes.length > 0 ? partes.join("; ") + ". " : "") +
          "Não é possível desfazer. Se quiser só tirar da lista, arquive.",
        textoConfirmar: "Excluir",
        destrutivo: true,
      });
      if (!ok) return;
      await excluir(c.id);
      // Transações mudaram de categoria — gráficos e listas reconsultam.
      await recarregar();
    },
    [confirmar, excluir, recarregar]
  );

  const linha = (c: Categoria, acoes: boolean) => (
    <View
      key={c.id}
      style={{ borderColor: colors["lines-divisions"], opacity: c.arquivada ? 0.55 : 1 }}
      className="flex-row items-center gap-3 py-3 border-b"
    >
      <View style={{ backgroundColor: `${c.cor}22` }} className="w-9 h-9 rounded-full items-center justify-center">
        <Ionicons name={c.icone} size={17} color={c.cor} />
      </View>
      <Text style={{ fontSize: moderateScale(14), color: colors["main-text"] }} className="flex-1" numberOfLines={1}>
        {c.nome}
        {c.arquivada ? "  (arquivada)" : ""}
      </Text>
      {acoes && (
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setForm({ aberto: true, categoria: c })} hitSlop={8} accessibilityLabel={`Editar ${c.nome}`}>
            <Ionicons name="pencil-outline" size={17} color={colors["second-text"]} />
          </Pressable>
          <Pressable
            onPress={() => arquivar(c.id, !c.arquivada)}
            hitSlop={8}
            accessibilityLabel={c.arquivada ? `Desarquivar ${c.nome}` : `Arquivar ${c.nome}`}
          >
            <Ionicons name={c.arquivada ? "arrow-undo-outline" : "archive-outline"} size={17} color={colors["second-text"]} />
          </Pressable>
          <Pressable onPress={() => handleExcluir(c)} hitSlop={8} accessibilityLabel={`Excluir ${c.nome}`}>
            <Ionicons name="trash-outline" size={17} color={colors["error-color"]} />
          </Pressable>
        </View>
      )}
    </View>
  );

  const cartao = (filhos: React.ReactNode) => (
    <View
      style={{ backgroundColor: colors["card-background"], borderColor: colors["lines-divisions"] }}
      className="border rounded-xl px-4 pb-1"
    >
      {filhos}
    </View>
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="flex-col gap-4">
        <CabecalhoTela titulo="Categorias" subtitulo="Crie categorias para organizar seus gastos do seu jeito." />

        <Pressable
          onPress={() => setForm({ aberto: true, categoria: null })}
          style={{ backgroundColor: colors["active-icon"] }}
          className="flex-row items-center justify-center gap-2 py-3 rounded-xl active:opacity-80"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
            Nova categoria
          </Text>
        </Pressable>

        <Text style={{ fontSize: moderateScale(13), color: colors["main-text"] }} className="font-Inter-Medium">
          Suas categorias
        </Text>
        {personalizadas.length === 0 ? (
          <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>
            Nenhuma ainda. Ex.: “Academia”, “Filhos”, “Freelas” — elas aparecem na hora de categorizar, no orçamento e nos
            gráficos.
          </Text>
        ) : (
          cartao(personalizadas.map((c) => linha(c, true)))
        )}

        <Pressable onPress={() => setVerSistema((v) => !v)} className="flex-row items-center gap-1.5" hitSlop={6}>
          <Ionicons name={verSistema ? "chevron-down" : "chevron-forward"} size={14} color={colors["second-text"]} />
          <Text style={{ fontSize: moderateScale(12), color: colors["second-text"] }}>
            Categorias do sistema ({CATEGORIAS.length})
          </Text>
        </Pressable>
        {verSistema && cartao(CATEGORIAS.map((c) => linha(c, false)))}
      </View>

      <CategoriaFormModal
        visivel={form.aberto}
        categoria={form.categoria}
        onFechar={() => setForm((f) => ({ ...f, aberto: false }))}
      />
    </ScrollView>
  );
}
