/**
 * PlantThumb — 株サムネイル
 * 写真あり: <img>表示
 * 写真なし: カテゴリ別イラストSVG
 * 休眠時: grayscale(.5) brightness(.55) + 「休眠中」ラベル
 * DAYバッジ: 左上（backdrop-blur）
 */

import Image from "next/image";
import { CategorySvg } from "./PlantSvg";
import type { SpeciesCategory } from "@/types/database";

interface PlantThumbProps {
  photoUrl?: string | null;
  category: SpeciesCategory;
  speciesId?: string;
  isDormant?: boolean;
  dayCount?: number;
  /** カード/詳細などで使うサイズ（Tailwind class or style） */
  className?: string;
}

export function PlantThumb({
  photoUrl,
  category,
  speciesId = "",
  isDormant = false,
  dayCount,
  className = "",
}: PlantThumbProps) {
  return (
    <div
      className={`relative rounded-[14px] overflow-hidden flex items-center justify-center ${className}`}
      style={{
        background: "radial-gradient(circle at 50% 20%, #243129, #151c17 70%)",
      }}
    >
      {/* 植物写真 or カテゴリSVG */}
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt="植物写真"
          fill
          className="object-cover"
          style={
            isDormant
              ? { filter: "grayscale(.5) brightness(.55)" }
              : undefined
          }
        />
      ) : (
        <CategorySvg
          category={category}
          speciesId={speciesId}
          isDormant={isDormant}
        />
      )}

      {/* DAY バッジ */}
      {dayCount !== undefined && (
        <div
          className="absolute top-[6px] left-[6px] text-[9px] tracking-[.14em] z-10 px-[7px] py-[2px] rounded-full"
          style={{
            color: "#cfd8d1",
            background: "rgba(15,20,17,.55)",
            backdropFilter: "blur(3px)",
          }}
        >
          DAY {dayCount}
        </div>
      )}

      {/* 休眠中ラベル */}
      {isDormant && (
        <div
          className="absolute bottom-[6px] right-[8px] text-[9px] tracking-[.15em] z-10"
          style={{ color: "var(--moon)" }}
        >
          休眠中
        </div>
      )}
    </div>
  );
}
