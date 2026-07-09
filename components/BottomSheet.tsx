"use client";

/**
 * BottomSheet — ボトムシートモーダル
 * backdrop + 上部ハンドル + 内容
 */

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // ESCキーで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(6,9,7,.6)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="w-full rounded-t-[24px] border-t px-[18px] pb-[26px] pt-[18px]"
        style={{
          background: "var(--surface2)",
          borderColor: "var(--line)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* ハンドル */}
        <div
          className="mx-auto mb-[14px]"
          style={{ width: "36px", height: "4px", borderRadius: "99px", background: "#3a463d" }}
        />
        {title && (
          <h3
            className="text-[15px] tracking-[.08em] mb-[12px]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
