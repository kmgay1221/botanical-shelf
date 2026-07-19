import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="px-[18px] pb-6">
      {/* ヘッダー */}
      <Skeleton className="w-[140px] h-[11px] mb-2 rounded-[3px]" />
      <Skeleton className="w-[190px] h-[22px] mb-4" />

      {/* すべて完了ボタン */}
      <Skeleton className="w-full h-[42px] rounded-[14px] mb-4" />

      {/* タスクカード列 */}
      <div className="flex flex-col gap-[10px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[18px] p-3 flex gap-3 items-center border"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}
          >
            <Skeleton className="w-[58px] h-[58px] rounded-[14px] flex-none" />
            <div className="flex-1 min-w-0">
              <Skeleton className="w-[65%] h-[13px] mb-[6px]" />
              <Skeleton className="w-[40%] h-[9px]" />
            </div>
            <Skeleton className="w-[44px] h-[44px] rounded-full flex-none" />
          </div>
        ))}
      </div>

      {/* ストリーク */}
      <div className="flex gap-2 mt-4">
        <div className="flex-1 rounded-[14px] p-[10px] border" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <Skeleton className="w-[48px] h-[19px] mb-[6px]" />
          <Skeleton className="w-[80%] h-[9px]" />
        </div>
        <div className="flex-1 rounded-[14px] p-[10px] border" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <Skeleton className="w-[48px] h-[19px] mb-[6px]" />
          <Skeleton className="w-[80%] h-[9px]" />
        </div>
      </div>
    </div>
  );
}
