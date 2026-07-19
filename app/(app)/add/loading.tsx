import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="px-[18px] pb-8">
      {/* ヘッダー */}
      <Skeleton className="w-[90px] h-[10px] mb-2 rounded-[3px]" />
      <Skeleton className="w-[150px] h-[22px] mb-4" />

      {/* ステッパー */}
      <div className="flex gap-[6px] mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-[3px] rounded-full" />
        ))}
      </div>

      {/* 検索欄 */}
      <Skeleton className="w-full h-[46px] rounded-[14px] mb-3" />

      {/* 検索結果行 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="w-full h-[52px] rounded-[14px] mb-2" />
      ))}
    </div>
  );
}
