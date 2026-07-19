import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="pb-8">
      {/* 戻る導線 */}
      <div className="px-[18px] pt-3 mb-2">
        <Skeleton className="w-[70px] h-[11px] rounded-[3px]" />
      </div>

      {/* ヒーロー写真 */}
      <Skeleton className="mx-[18px] rounded-[20px] h-[230px] mb-[14px]" />

      {/* プレート + タグ */}
      <div className="px-[18px]">
        <Skeleton className="w-[55%] h-[19px] mb-[8px]" />
        <Skeleton className="w-[38%] h-[11px] mb-[10px]" />
        <div className="flex gap-[6px]">
          <Skeleton className="w-[52px] h-[20px] rounded-full" />
          <Skeleton className="w-[68px] h-[20px] rounded-full" />
          <Skeleton className="w-[74px] h-[20px] rounded-full" />
        </div>
      </div>

      {/* 年間リズムパネル */}
      <div className="mx-[18px] mt-3 rounded-[16px] p-[13px] border" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <Skeleton className="w-[60%] h-[11px] mb-[10px]" />
        <Skeleton className="w-full h-[64px] rounded-[4px]" />
      </div>

      {/* 3アクションボタン */}
      <div className="flex gap-2 px-[18px] mt-[14px]">
        <Skeleton className="flex-1 h-[64px] rounded-[14px]" />
        <Skeleton className="flex-1 h-[64px] rounded-[14px]" />
        <Skeleton className="flex-1 h-[64px] rounded-[14px]" />
      </div>

      {/* 成長ギャラリー */}
      <div className="px-[18px] mt-[18px]">
        <Skeleton className="w-[110px] h-[12px] mb-[9px]" />
        <div className="flex gap-2">
          <Skeleton className="flex-1 aspect-square rounded-[14px]" />
          <Skeleton className="flex-1 aspect-square rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
