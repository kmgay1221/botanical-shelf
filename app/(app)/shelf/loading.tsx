import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="px-[18px] pb-6">
      {/* ヘッダー */}
      <Skeleton className="w-[110px] h-[10px] mb-2 rounded-[3px]" />
      <Skeleton className="w-[160px] h-[22px] mb-3" />

      {/* フィルタチップ */}
      <div className="flex gap-[6px] mt-3 mb-3 overflow-hidden">
        {[64, 72, 84, 68, 60].map((w, i) => (
          <Skeleton key={i} className="h-[26px] rounded-full flex-none" style={{ width: w }} />
        ))}
      </div>

      {/* 2列グリッド */}
      <div className="grid grid-cols-2 gap-[10px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] p-[9px] border"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <Skeleton className="w-full aspect-square rounded-[14px] mb-[9px]" />
            <Skeleton className="w-[70%] h-[13px] mb-[6px]" />
            <Skeleton className="w-[45%] h-[9px] mb-[10px]" />
            <Skeleton className="w-full h-[16px] rounded-[4px] mb-[7px]" />
            <Skeleton className="w-[56px] h-[18px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
