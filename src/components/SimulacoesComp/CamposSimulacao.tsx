import { colors } from "@/theme/colors";
import { moderateScale } from "@/utils/scale";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, TextInput, Pressable } from "react-native";
import { memo, useCallback, useState } from "react";
import { DropdownMenu } from "@/components/common/DropdownMenu";

/**
 * Conjunto de campos reutilizáveis pelos três formulários de simulação
 * (financiamento, investimento, câmbio). Todos seguem o mesmo visual:
 * label pequeno em cima, campo com fundo `input-background`.
 */

const labelSize = moderateScale(11);
const inputTextSize = moderateScale(14);

// ---------------------------------------------------------------------------
// CampoMoeda — entrada em centavos, exibe formatado em BRL
// ---------------------------------------------------------------------------

export const CampoMoeda = memo(function CampoMoeda({
  label,
  valor,
  onChange,
  destaque,
}: {
  label: string;
  valor: number;
  onChange: (valor: number) => void;
  // `destaque` deixa o texto na cor de destaque (roxo) — usado no campo
  // "valor a financiar", que no anexo aparece realçado.
  destaque?: boolean;
}) {
  const handleChange = useCallback(
    (texto: string) => {
      const digitos = texto.replace(/[^0-9]/g, "");
      onChange(digitos ? parseInt(digitos, 10) / 100 : 0);
    },
    [onChange]
  );

  const exibicao = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <View className="flex-1">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>
      <TextInput
        value={exibicao}
        onChangeText={handleChange}
        keyboardType="numeric"
        style={{ fontSize: inputTextSize, color: destaque ? colors["active-icon"] : colors["main-text"] }}
        className="bg-input-background border border-input-border rounded-xl px-3 py-3"
        accessibilityLabel={label}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// CampoMoedaSomenteLeitura — valor calculado, não editável
// ---------------------------------------------------------------------------

export const CampoMoedaSomenteLeitura = memo(function CampoMoedaSomenteLeitura({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  const exibicao = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <View className="flex-1">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>
      <View className="bg-input-background border border-input-border rounded-xl px-3 py-3">
        <Text
          style={{ fontSize: inputTextSize }}
          className={destaque ? "text-active-icon font-Inter-Medium" : "text-main-text"}
        >
          {exibicao}
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// CampoNumero — número simples (meses, cotação etc.)
// ---------------------------------------------------------------------------

export const CampoNumero = memo(function CampoNumero({
  label,
  valor,
  onChange,
  sufixo,
  decimais = 0,
}: {
  label: string;
  valor: number;
  onChange: (valor: number) => void;
  sufixo?: string;
  decimais?: number;
}) {
  const handleChange = useCallback(
    (texto: string) => {
      const limpo = texto.replace(",", ".").replace(/[^0-9.]/g, "");
      const n = parseFloat(limpo);
      onChange(Number.isFinite(n) ? n : 0);
    },
    [onChange]
  );

  return (
    <View className="flex-1">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>
      <View className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between">
        <TextInput
          value={decimais > 0 ? String(valor) : String(Math.round(valor))}
          onChangeText={handleChange}
          keyboardType="numeric"
          style={{ fontSize: inputTextSize, color: colors["main-text"], flex: 1, padding: 0 }}
          accessibilityLabel={label}
        />
        {sufixo && (
          <Text style={{ fontSize: labelSize }} className="text-desactived-text ml-2">
            {sufixo}
          </Text>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// CampoEntradaFinanciamento — entrada do financiamento, alternável
// entre valor (R$) e porcentagem do valor do bem. Para fora, SEMPRE
// reporta o valor em reais (é o que a simulação consome); a conversão
// %→R$ acontece aqui dentro.
// ---------------------------------------------------------------------------

type ModoEntrada = "valor" | "percentual";

export const CampoEntradaFinanciamento = memo(function CampoEntradaFinanciamento({
  label,
  valorBem,
  entrada,
  onChange,
}: {
  label: string;
  valorBem: number;
  entrada: number; // sempre em R$
  onChange: (entradaEmReais: number) => void;
}) {
  const [modo, setModo] = useState<ModoEntrada>("valor");

  // Rascunho só para o modo percentual — digitar "1", "12," etc. sem
  // arredondar no meio. No modo valor, CampoMoeda já lida bem com isso
  // pela máscara de centavos.
  const [rascunhoPct, setRascunhoPct] = useState<string | null>(null);

  const pctAtual = valorBem > 0 ? (entrada / valorBem) * 100 : 0;

  const handleValorChange = useCallback(
    (texto: string) => {
      const digitos = texto.replace(/[^0-9]/g, "");
      onChange(digitos ? parseInt(digitos, 10) / 100 : 0);
    },
    [onChange]
  );

  const handlePctChange = useCallback((texto: string) => {
    setRascunhoPct(texto.replace(/[^0-9.,]/g, ""));
  }, []);

  const consolidarPct = useCallback(() => {
    if (rascunhoPct === null) return;
    const n = parseFloat(rascunhoPct.replace(",", "."));
    if (Number.isFinite(n)) {
      const pctLimitado = Math.min(Math.max(n, 0), 100);
      onChange((pctLimitado / 100) * valorBem);
    }
    setRascunhoPct(null);
  }, [rascunhoPct, onChange, valorBem]);

  const exibicaoValor = entrada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const exibicaoPct =
    rascunhoPct !== null ? rascunhoPct : pctAtual.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <View className="flex-1">
      {/* A linha do label tem altura FIXA igual à do texto puro do label
          usado pelos outros campos (labelSize * 1.4 ≈ lineHeight). O
          toggle R$/% é mais alto que o texto; ele fica num overlay
          absoluto (top/bottom: 0 + center) pra ficar centralizado nessa
          linha sem aumentar a altura dela — senão o input abaixo descia
          e desalinhava do campo vizinho. */}
      <View className="justify-center mb-1.5" style={{ height: labelSize * 1.4 }}>
        <Text style={{ fontSize: labelSize }} className="text-second-text">
          {label}
        </Text>
        <View
          className="absolute right-0 top-0 bottom-0 justify-center"
          pointerEvents="box-none"
        >
          {/* Toggle R$ / % */}
          <View className="flex-row bg-input-background border border-input-border rounded-lg overflow-hidden">
            {(["valor", "percentual"] as ModoEntrada[]).map((m) => {
              const ativo = modo === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setRascunhoPct(null);
                    setModo(m);
                  }}
                  className={`px-2 py-0.5 ${ativo ? "bg-active-icon" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={m === "valor" ? "Entrada em reais" : "Entrada em porcentagem"}
                >
                  <Text
                    style={{ fontSize: labelSize }}
                    className={ativo ? "text-white font-Inter-Medium" : "text-second-text"}
                  >
                    {m === "valor" ? "R$" : "%"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {modo === "valor" ? (
        <TextInput
          value={exibicaoValor}
          onChangeText={handleValorChange}
          keyboardType="numeric"
          style={{ fontSize: inputTextSize, color: colors["main-text"] }}
          className="bg-input-background border border-input-border rounded-xl px-3 py-3"
          accessibilityLabel={`${label} em reais`}
        />
      ) : (
        <View className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between">
          <TextInput
            value={exibicaoPct}
            onChangeText={handlePctChange}
            onFocus={() => setRascunhoPct(pctAtual.toLocaleString("pt-BR", { maximumFractionDigits: 1 }).replace(".", ","))}
            onBlur={consolidarPct}
            onSubmitEditing={consolidarPct}
            keyboardType="numeric"
            style={{ fontSize: inputTextSize, color: colors["main-text"], flex: 1, padding: 0 }}
            accessibilityLabel={`${label} em porcentagem`}
          />
          <Text style={{ fontSize: labelSize }} className="text-desactived-text ml-2">
            % do bem
          </Text>
        </View>
      )}

      {/* Linha auxiliar: mostra o "outro" formato, para o usuário ver a
          equivalência sem trocar o modo. */}
      <Text style={{ fontSize: labelSize }} className="text-active-icon mt-1">
        {modo === "valor"
          ? `${pctAtual.toFixed(0)}% do valor`
          : `${entrada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
      </Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// CampoTaxa — entrada de taxa percentual (juros / rentabilidade). Campo
// grande igual aos de moeda: dá pra tocar em qualquer lugar da linha e
// digitar direto, sem alvo pequeno e sem slider. O sufixo ("% a.a.")
// fica fixo à direita. `maximo`/`minimo` só fazem clamp ao sair do
// campo — durante a digitação o texto é livre.
// ---------------------------------------------------------------------------

export const CampoTaxa = memo(function CampoTaxa({
  label,
  valor,
  onChange,
  sufixo = "% a.a.",
  minimo = 0,
  maximo,
}: {
  label: string;
  valor: number;
  onChange: (valor: number) => void;
  sufixo?: string;
  minimo?: number;
  maximo?: number;
}) {
  // Enquanto digita, o texto pode ter estados intermediários ("", "9,")
  // que não convertem pra número — o rascunho manda no que aparece.
  // `null` = não está editando: mostra o valor formatado.
  const [rascunho, setRascunho] = useState<string | null>(null);

  const handleTextChange = useCallback((texto: string) => {
    setRascunho(texto.replace(/[^0-9.,]/g, ""));
  }, []);

  const consolidar = useCallback(() => {
    if (rascunho === null) return;
    const n = parseFloat(rascunho.replace(",", "."));
    if (Number.isFinite(n)) {
      const limInf = Math.max(n, minimo);
      onChange(maximo !== undefined ? Math.min(limInf, maximo) : limInf);
    }
    setRascunho(null);
  }, [rascunho, onChange, minimo, maximo]);

  const textoExibido =
    rascunho !== null ? rascunho : valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <View className="flex-1">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>
      <View className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between">
        <TextInput
          value={textoExibido}
          onChangeText={handleTextChange}
          onFocus={() => setRascunho(String(valor).replace(".", ","))}
          onBlur={consolidar}
          onSubmitEditing={consolidar}
          keyboardType="numeric"
          style={{ fontSize: inputTextSize, color: colors["main-text"], flex: 1, padding: 0 }}
          accessibilityLabel={label}
        />
        <Text style={{ fontSize: labelSize }} className="text-desactived-text ml-2">
          {sufixo}
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// CampoDropdown — seleção de uma opção de uma lista fixa
// ---------------------------------------------------------------------------

export type OpcaoDropdown<T extends string | number> = { valor: T; rotulo: string };

function CampoDropdownInner<T extends string | number>({
  label,
  valor,
  opcoes,
  onChange,
}: {
  label: string;
  valor: T;
  opcoes: OpcaoDropdown<T>[];
  onChange: (valor: T) => void;
}) {
  const selecionada = opcoes.find((o) => o.valor === valor);

  return (
    <View className="flex-1">
      <Text style={{ fontSize: labelSize }} className="text-second-text mb-1.5">
        {label}
      </Text>
      <DropdownMenu
        larguraDoTrigger
        alinhamento="esquerda"
        trigger={({ abrir }) => (
          <Pressable
            onPress={abrir}
            className="bg-input-background border border-input-border rounded-xl px-3 py-3 flex-row items-center justify-between active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${selecionada?.rotulo ?? ""}`}
          >
            <Text
              style={{ fontSize: inputTextSize }}
              className="text-main-text flex-1 mr-2"
              numberOfLines={1}
            >
              {selecionada?.rotulo ?? "Selecionar"}
            </Text>
            <Ionicons name="chevron-down" color={colors["active-icon"]} size={16} style={{ flexShrink: 0 }} />
          </Pressable>
        )}
      >
        {({ fechar }) => (
          <View className="py-1">
            {opcoes.map((opcao) => {
              const ativa = opcao.valor === valor;
              return (
                <Pressable
                  key={String(opcao.valor)}
                  onPress={() => {
                    onChange(opcao.valor);
                    fechar();
                  }}
                  className="px-3 py-2.5 flex-row items-center justify-between active:bg-input-background"
                  accessibilityRole="button"
                >
                  <Text
                    style={{ fontSize: inputTextSize }}
                    className={ativa ? "text-active-icon font-Inter-Medium" : "text-main-text"}
                  >
                    {opcao.rotulo}
                  </Text>
                  {ativa && <Ionicons name="checkmark" color={colors["active-icon"]} size={16} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </DropdownMenu>
    </View>
  );
}

export const CampoDropdown = memo(CampoDropdownInner) as typeof CampoDropdownInner;
