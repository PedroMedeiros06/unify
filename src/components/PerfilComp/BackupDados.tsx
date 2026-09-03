import { moderateScale } from "@/utils/scale";
import { View, Text, Alert } from "react-native";
import { memo, useCallback, useState } from "react";
import { MenuItem } from "./MenuItem";
import { useResetApp } from "@/context/ResetAppContext";
import {
  exportarBackupParaArquivo,
  escolherEValidarBackup,
  aplicarBackup,
} from "@/utils/backupArquivo";

function formatarDataArquivo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data desconhecida";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function BackupDadosBase() {
  const sectionTitleSize = moderateScale(15);
  const legendaSize = moderateScale(11);

  const { remontarDados } = useResetApp();

  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const ocupado = exportando || importando;

  const handleExportar = useCallback(async () => {
    if (ocupado) return;
    setExportando(true);
    try {
      const r = await exportarBackupParaArquivo();
      if (r.status === "indisponivel") {
        Alert.alert("Indisponível", "O compartilhamento de arquivos não está disponível neste aparelho.");
      } else if (r.status === "erro") {
        Alert.alert("Não foi possível exportar", r.mensagem);
      }
      // "ok" e "cancelado" não precisam de aviso — a própria folha de
      // compartilhamento já deu o retorno visual.
    } finally {
      setExportando(false);
    }
  }, [ocupado]);

  const handleImportar = useCallback(async () => {
    if (ocupado) return;
    setImportando(true);
    try {
      const escolha = await escolherEValidarBackup();

      if (escolha.status === "cancelado") return;
      if (escolha.status === "arquivo_invalido") {
        Alert.alert("Arquivo inválido", escolha.mensagem);
        return;
      }
      if (escolha.status === "erro") {
        Alert.alert("Não foi possível ler o arquivo", escolha.mensagem);
        return;
      }

      const { arquivo, totalLinhas } = escolha;

      Alert.alert(
        "Restaurar backup",
        `Este backup foi gerado em ${formatarDataArquivo(arquivo.geradoEm)} e contém ${totalLinhas} registro(s).\n\n` +
          "Restaurar vai APAGAR todos os dados atuais deste aparelho e substituí-los pelos do backup. Não é possível desfazer.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Restaurar",
            style: "destructive",
            onPress: () => {
              // A UI já saiu do Alert; recoloca o estado "importando"
              // para o item mostrar "Restaurando...".
              setImportando(true);
              aplicarBackup(arquivo)
                .then((r) => {
                  if (r.status === "ok") {
                    remontarDados();
                    Alert.alert("Backup restaurado", `${r.totalLinhas} registro(s) restaurados.`);
                  } else {
                    Alert.alert("Não foi possível restaurar", r.mensagem);
                  }
                })
                .finally(() => setImportando(false));
            },
          },
        ]
      );
    } finally {
      setImportando(false);
    }
  }, [ocupado, remontarDados]);

  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <Text style={{ fontSize: sectionTitleSize }} className="text-main-text font-Inter-Medium mb-1">
        Backup dos dados
      </Text>
      <Text style={{ fontSize: legendaSize }} className="text-desactived-text mb-1">
        O Unify guarda tudo só neste aparelho. Exporte um arquivo de vez em quando para não perder seus dados ao trocar de celular ou reinstalar o app.
      </Text>

      <MenuItem
        icone="download-outline"
        titulo="Exportar dados"
        subtitulo={exportando ? "Gerando arquivo..." : "Salva um arquivo com tudo que está no app"}
        onPress={handleExportar}
      />
      <MenuItem
        icone="cloud-upload-outline"
        titulo="Restaurar de um arquivo"
        subtitulo={importando ? "Restaurando..." : "Substitui os dados atuais pelos de um backup"}
        onPress={handleImportar}
        isLast
      />
    </View>
  );
}

export const BackupDados = memo(BackupDadosBase);
