import { View } from "react-native";
import { Skeleton } from "@/components/common/Skeleton";

function LinhaTransacaoSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <View className={`py-3 flex-row justify-between items-center ${isLast ? "" : "border-b border-lines-divisions/30"}`}>
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="flex-1">
          <Skeleton width="60%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <View className="items-end gap-1.5">
        <Skeleton width={70} height={13} />
        <Skeleton width={60} height={11} />
      </View>
    </View>
  );
}

type Props = {
  linhas?: number;
  titulo?: boolean;
};

export function ListaTransacoesSkeleton({ linhas = 5, titulo = true }: Props) {
  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl px-4 py-4">
      {titulo && (
        <View className="flex-row justify-between items-center mb-4">
          <Skeleton width={160} height={18} />
          <Skeleton width={70} height={14} />
        </View>
      )}
      {Array.from({ length: linhas }).map((_, index) => (
        <LinhaTransacaoSkeleton key={index} isLast={index === linhas - 1} />
      ))}
    </View>
  );
}
