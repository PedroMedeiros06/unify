import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale } from "@/utils/scale";
import { useThemeColors } from "@/theme/useThemeColors";
import { ModalCentralizado } from "@/components/common/ModalCentralizado";
import { useCategorias } from "@/context/CategoriasContext";
import { useTransacoes } from "@/context/TransacoesContext";
import { useDialogo } from "@/context/DialogoContext";
import { Categoria, CategoriaPersonalizadaId } from "@/database/categorias";
import { useChaveAbertura } from "@/hooks/useChaveAbertura";

// Ícones oferecidos para categorias personalizadas — temas comuns de
// gasto/receita que as categorias do sistema não cobrem.
const ICONES: Categoria["icone"][] = [
  "pricetag-outline", "cafe-outline", "beer-outline", "pizza-outline", "fast-food-outline", "ice-cream-outline",
  "basket-outline", "shirt-outline", "barbell-outline", "bicycle-outline", "bus-outline", "car-sport-outline",
  "airplane-outline", "bed-outline", "build-outline", "hammer-outline", "construct-outline", "flower-outline",
  "leaf-outline", "water-outline", "flame-outline", "tv-outline", "phone-portrait-outline", "laptop-outline",
  "headset-outline", "musical-notes-outline", "film-outline", "book-outline", "library-outline", "school-outline",
  "medical-outline", "fitness-outline", "heart-outline", "happy-outline", "people-outline", "person-outline",
  "paw-outline", "gift-outline", "diamond-outline", "card-outline", "cash-outline",
  "business-outline", "briefcase-outline", "storefront-outline", "trophy-outline", "ribbon-outline", "star-outline",
];

const CORES = [
  "#8D51E6", "#378ADD", "#3B9CBD", "#1D9E75", "#16A085", "#22C55E",
  "#E8C400", "#E8862E", "#EF9F27", "#E24B4A", "#C0392B", "#E67EA8",
  "#B06AB3", "#A0693F", "#7F8C8D", "#2E7DD1",
];

type Props = {
  visivel: boolean;
  onFechar: () => void;
  categoria?: Categoria | null; // ausente = criar
  onCriada?: (id: CategoriaPersonalizadaId) => void;
};

function CategoriaFormModalBase({ visivel, onFechar, categoria, onCriada }: Props) {
  const chave = useChaveAbertura(visivel);
  const [salvando, setSalvando] = useState(false);
  return (
    <ModalCentralizado visivel={visivel} onFechar={onFechar} bloquearFechamentoExterno={salvando} overlayOpacidade={0.6}>
      <Conteudo
        key={chave}
        onFechar={onFechar}
        categoria={categoria}
        onCriada={onCriada}
        salvando={salvando}
        setSalvando={setSalvando}
      />
    </ModalCentralizado>
  );
}

type PropsConteudo = Omit<Props, "visivel"> & { salvando: boolean; setSalvando: (v: boolean) => void };

function Conteudo({ onFechar, categoria, onCriada, salvando, setSalvando }: PropsConteudo) {
  const colors = useThemeColors();
  const { avisar } = useDialogo();
  const { criar, editar, categorias } = useCategorias();
  const { recarregar } = useTransacoes();
  const editando = !!categoria;

  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [icone, setIcone] = useState<Categoria["icone"]>(categoria?.icone ?? ICONES[0]);
  const [cor, setCor] = useState(categoria?.cor ?? CORES[0]);

  const nomeLimpo = nome.trim();
  const duplicada = categorias.some(
    (c) => c.id !== categoria?.id && c.nome.toLocaleLowerCase("pt-BR") === nomeLimpo.toLocaleLowerCase("pt-BR")
  );
  const valido = nomeLimpo.length > 0 && !duplicada;

  const salvar = useCallback(async () => {
    if (!valido || salvando) return;
    setSalvando(true);
    try {
      if (editando && categoria) {
        await editar(categoria.id, { nome: nomeLimpo, icone, cor });
        // O ícone copiado nas transações mudou — listas reconsultam.
        await recarregar();
      } else {
        const id = await criar({ nome: nomeLimpo, icone, cor });
        onCriada?.(id);
      }
      onFechar();
    } catch (e) {
      await avisar({ titulo: "Não foi possível salvar", mensagem: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setSalvando(false);
    }
  }, [valido, salvando, setSalvando, editando, categoria, editar, recarregar, nomeLimpo, icone, cor, criar, onCriada, onFechar, avisar]);

  return (
    <>
      <View className="flex-row justify-between items-center mb-4">
        <Text style={{ fontSize: moderateScale(17), color: colors["main-text"] }} className="font-Inter-SemiBold">
          {editando ? "Editar categoria" : "Nova categoria"}
        </Text>
        <Pressable onPress={onFechar} hitSlop={10} disabled={salvando} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" color={colors["second-text"]} size={22} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 mb-4">
        <View style={{ backgroundColor: `${cor}22` }} className="w-11 h-11 rounded-full items-center justify-center">
          <Ionicons name={icone} size={20} color={cor} />
        </View>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Nome da categoria"
          placeholderTextColor={colors["desactived-text"]}
          editable={!salvando}
          maxLength={30}
          style={{
            fontSize: moderateScale(14),
            color: colors["main-text"],
            backgroundColor: colors["input-background"],
            borderColor: colors["input-border"],
          }}
          className="flex-1 border rounded-xl px-3 py-3"
        />
      </View>
      {duplicada && (
        <Text style={{ fontSize: moderateScale(11), color: colors["error-color"] }} className="-mt-2 mb-3">
          Já existe uma categoria com esse nome.
        </Text>
      )}

      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-1.5">
        Ícone
      </Text>
      <ScrollView style={{ maxHeight: 150 }} className="mb-4" nestedScrollEnabled>
        <View className="flex-row flex-wrap gap-2">
          {ICONES.map((i) => {
            const marcado = i === icone;
            return (
              <Pressable
                key={i}
                onPress={() => setIcone(i)}
                style={{
                  borderColor: marcado ? cor : colors["input-border"],
                  backgroundColor: marcado ? `${cor}22` : colors["input-background"],
                }}
                className="w-10 h-10 rounded-lg border items-center justify-center"
                accessibilityRole="radio"
                accessibilityState={{ checked: marcado }}
                accessibilityLabel={i}
              >
                <Ionicons name={i} size={18} color={marcado ? cor : colors["second-text"]} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={{ fontSize: moderateScale(11), color: colors["second-text"] }} className="mb-1.5">
        Cor
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-5">
        {CORES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCor(c)}
            style={{ backgroundColor: c, borderColor: cor === c ? colors["main-text"] : "transparent" }}
            className="w-8 h-8 rounded-full border-2 items-center justify-center"
            accessibilityRole="radio"
            accessibilityState={{ checked: cor === c }}
            accessibilityLabel={`Cor ${c}`}
          >
            {cor === c && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={salvar}
        disabled={!valido || salvando}
        style={{ backgroundColor: valido && !salvando ? colors["active-icon"] : `${colors["active-icon"]}4D` }}
        className="w-full py-3.5 rounded-xl items-center justify-center active:opacity-80"
        accessibilityRole="button"
      >
        <Text style={{ fontSize: moderateScale(14) }} className="text-white font-Inter-SemiBold">
          {salvando ? "Salvando..." : editando ? "Salvar" : "Criar categoria"}
        </Text>
      </Pressable>
    </>
  );
}

export const CategoriaFormModal = memo(CategoriaFormModalBase);
