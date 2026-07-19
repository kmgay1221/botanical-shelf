import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="px-[18px] pb-6">
      {/* ヘッダー */}
      <Skeleton className="w-[110px] h-[10px] mb-2 rounded-[3px]" />
      <Skeleton className="w-[60px] h-[22px] mb-3" />

      {/* カテゴリチップ */}
      <div className="flex gap-[6px] mt-3 mb-3 overflow-hidden">
        {[56, 72, 92, 68, 64].map((w, i) => (
          <Skeleton key={i} className="h-[26px] rounded-full flex-none" style={{ width: w }} />
        ))}
      </div>

      {/* 収集率バー */}
      <div className="rounded-[14px] px-[13px] py-[10px] border mb-3" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="flex justify-between mb-[6px]">
          <Skeleton className="w-[70px] h-[11px]" />
          <Skeleton className="w-[40px] h-[11px]" />
        </div>
        <Skeleton className="h-[5px] w-full rounded-full" />
      </div>

      {/* 3列グリッド */}
      <div className="grid grid-cols-3 gap-[8px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="w-full aspect-square rounded-[10px] mb-[6px]" />
            <Skeleton className="w-[80%] h-[10px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
