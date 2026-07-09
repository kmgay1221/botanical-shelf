"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, 2800);
    return () => clearTimeout(t);
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-[12px] text-[12px] whitespace-nowrap"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        color: "var(--ink)",
      }}
    >
      {message}
    </div>
  );
}
