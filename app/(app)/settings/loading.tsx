import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="px-[18px] pb-8">
      {/* ヘッダー */}
      <Skeleton className="w-[80px] h-[10px] mb-2 rounded-[3px]" />
      <Skeleton className="w-[60px] h-[22px] mb-4" />

      {/* 行リスト */}
      <div className="mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-[14px] border-b"
            style={{ borderColor: "var(--line)" }}
          >
            <div>
              <Skeleton className="w-[100px] h-[12px] mb-[6px]" />
              <Skeleton className="w-[150px] h-[9px]" />
            </div>
            <Skeleton className="w-[38px] h-[20px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
