"use client";

/**
 * DoneButton — 水やり完了ボタン
 * 未完了: 44px円 --water アウトライン + 💧
 * 完了: --water 塗り + ✓ + リップル演出
 * prefers-reduced-motion でリップル無効
 */

import { useState, useCallback } from "react";

interface DoneButtonProps {
  plantId: string;
  alreadyDone?: boolean;
  onComplete?: (plantId: string) => void;
}

export function DoneButton({ plantId, alreadyDone = false, onComplete }: DoneButtonProps) {
  const [done, setDone] = useState(alreadyDone);
  const [showRipple, setShowRipple] = useState(false);

  const handleTap = useCallback(() => {
    if (done) return;
    setDone(true);
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 750);
    onComplete?.(plantId);
  }, [done, plantId, onComplete]);

  return (
    <button
      onClick={handleTap}
      aria-label={done ? "水やり完了" : "水やりする"}
      className="relative flex-none flex items-center justify-center rounded-full transition-colors duration-200"
      style={{
        width: "44px",
        height: "44px",
        border: `1.5px solid var(--water)`,
        background: done ? "var(--water)" : "transparent",
        color: done ? "#0d1418" : "var(--water)",
        fontSize: done ? "17px" : "17px",
        cursor: done ? "default" : "pointer",
      }}
    >
      {done ? "✓" : "💧"}
      {showRipple && (
        <span
          className="ripple-ring"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
