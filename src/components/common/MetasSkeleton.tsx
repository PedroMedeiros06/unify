import { View } from "react-native";
import { Skeleton } from "@/components/common/Skeleton";

function ItemMetaSkeleton() {
  return (
    <View className="bg-input-background border border-lines-divisions rounded-xl p-3">
      <View className="flex-row items-center gap-2.5 mb-2.5">
        <Skeleton width={34} height={34} borderRadius={17} />
        <View className="flex-1">
          <Skeleton width="55%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={10} />
        </View>
      </View>
      <Skeleton width="100%" height={6} borderRadius={10} style={{ marginBottom: 6 }} />
      <Skeleton width="50%" height={12} />
    </View>
  );
}

export function MetasSkeleton() {
  return (
    <View className="bg-card-background border border-lines-divisions rounded-xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Skeleton width={140} height={15} />
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
      <View className="gap-2.5">
        <ItemMetaSkeleton />
        <ItemMetaSkeleton />
      </View>
    </View>
  );
}
