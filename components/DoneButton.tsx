"use client";

/**
 * DoneButton — 水やり完了ボタン
 * 未完了: 44px円 --water アウトライン + 💧
 * 完了: --water 塗り + ✓ + リップル演出（親が楽観的更新でdoneを先行させ、DB失敗時はdoneを戻す）
 * pending中はタップ不可（二重送信防止）。視覚は即座に完了表示のまま変えない
 * prefers-reduced-motion でリップル・押下スケール無効
 */

import { useState, useCallback } from "react";

interface DoneButtonProps {
  plantId: string;
  done?: boolean;
  pending?: boolean;
  onComplete?: (plantId: string) => void;
}

export function DoneButton({ plantId, done = false, pending = false, onComplete }: DoneButtonProps) {
  const [showRipple, setShowRipple] = useState(false);

  const handleTap = useCallback(() => {
    if (done || pending) return;
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 750);
    onComplete?.(plantId);
  }, [done, pending, plantId, onComplete]);

  return (
    <button
      onClick={handleTap}
      disabled={done || pending}
      aria-label={done ? "水やり完了" : "水やりする"}
      aria-busy={pending}
      className="btn-press relative flex-none flex items-center justify-center rounded-full transition-colors duration-200"
      style={{
        width: "44px",
        height: "44px",
        border: `1.5px solid var(--water)`,
        background: done ? "var(--water)" : "transparent",
        color: done ? "#0d1418" : "var(--water)",
        fontSize: "17px",
        cursor: done || pending ? "default" : "pointer",
      }}
    >
      {done ? "✓" : "💧"}
      {showRipple && <span className="ripple-ring" aria-hidden="true" />}
    </button>
  );
}
