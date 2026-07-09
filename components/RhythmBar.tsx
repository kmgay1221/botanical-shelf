/**
 * RhythmBar — 年間水やりリズムバー（署名要素）
 * card サイズ: height=16px（棚カード用）
 * detail サイズ: height=64px + 月ラベル（株詳細用）
 *
 * 高さ計算: minInterval / interval * 100%
 * 当月: --glaucous + glow
 * 他月: #33463a
 * 断水月: #2a2537 固定 3px（card）/ 6px（detail）
 */

import { calcRhythmBarHeights } from "@/lib/watering";
import type { WateringIntervals, PlantSize } from "@/types/database";

interface RhythmBarProps {
  intervals: WateringIntervals;
  size: PlantSize;
  currentMonth: number; // 1〜12
  variant?: "card" | "detail";
  note?: string | null; // 詳細画面用の説明文
}

export function RhythmBar({
  intervals,
  size,
  currentMonth,
  variant = "card",
  note,
}: RhythmBarProps) {
  const bars = calcRhythmBarHeights(intervals, size);
  const isDetail = variant === "detail";
  const containerHeight = isDetail ? 64 : 16;
  const dormantHeight = isDetail ? 6 : 3;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "2px",
          alignItems: "flex-end",
          height: `${containerHeight}px`,
        }}
      >
        {bars.map(({ month, height, isDormant }) => {
          const isCurrentMonth = month === currentMonth;
          const barHeight = isDormant ? dormantHeight : Math.max(4, (height / 100) * containerHeight);

          return (
            <div
              key={month}
              style={{
                flex: 1,
                height: `${barHeight}px`,
                borderRadius: "1px",
                background: isDormant
                  ? "#2a2537"
                  : isCurrentMonth
                  ? "var(--glaucous)"
                  : "#33463a",
                boxShadow:
                  isCurrentMonth && !isDormant
                    ? "0 0 10px rgba(169,198,180,.35)"
                    : undefined,
                transition: "height .3s ease",
              }}
            />
          );
        })}
      </div>

      {/* 月ラベル（detail のみ） */}
      {isDetail && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "3px",
            marginTop: "5px",
            fontSize: "8px",
            color: "var(--ink3)",
            textAlign: "center",
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
      )}

      {/* 説明文（detail のみ） */}
      {isDetail && note && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--ink2)",
            marginTop: "9px",
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{
            __html: note.replace(
              /(\d+日間隔|断水)/g,
              (m) => `<b style="color:var(--glaucous)">${m}</b>`
            ),
          }}
        />
      )}
    </div>
  );
}
