import { View } from "react-native";
import { Skeleton } from "@/components/common/Skeleton";

export function ResumoSkeleton() {
  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Skeleton width={140} height={12} />
      </View>

      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 pr-2">
          <Skeleton width="70%" height={28} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={12} />
        </View>
        <Skeleton width={110} height={50} borderRadius={8} />
      </View>

      <View className="flex-row gap-2">
        <Skeleton width={90} height={30} borderRadius={20} />
        <Skeleton width={90} height={30} borderRadius={20} />
        <Skeleton width={110} height={30} borderRadius={20} />
      </View>
    </View>
  );
}
