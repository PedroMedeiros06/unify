import { View } from "react-native";
import { Skeleton } from "@/components/common/Skeleton";

function ItemCompromissoSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-2.5 ${isLast ? "" : "border-b border-lines-divisions"}`}>
      <Skeleton width={20} height={20} borderRadius={10} style={{ marginRight: 10 }} />
      <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 10 }} />
      <View className="flex-1">
        <Skeleton width="50%" height={13} style={{ marginBottom: 6 }} />
        <Skeleton width="65%" height={10} />
      </View>
      <View className="items-end gap-1.5">
        <Skeleton width={60} height={13} />
        <Skeleton width={50} height={16} borderRadius={10} />
      </View>
    </View>
  );
}

export function CompromissosSkeleton() {
  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-2">
        <Skeleton width={160} height={15} />
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
      <ItemCompromissoSkeleton isLast={false} />
      <ItemCompromissoSkeleton isLast={false} />
      <ItemCompromissoSkeleton isLast={true} />
    </View>
  );
}
