"use client";

/**
 * BottomNav — 5タブ固定ボトムナビ
 * 今日 / 植物棚 / 追加 / 図鑑 / 設定
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home",          label: "今日",    icon: "💧" },
  { href: "/shelf",         label: "植物棚",  icon: "🪴" },
  { href: "/add",           label: "追加",    icon: "＋" },
  { href: "/encyclopedia",  label: "図鑑",    icon: "📖" },
  { href: "/settings",      label: "設定",    icon: "⚙" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom flex-none flex justify-between px-[26px] pt-[12px] border-t"
      style={{
        background: "linear-gradient(#0f141100,#0f1411 30%)",
        borderColor: "#1c241e",
      }}
    >
      {TABS.map(({ href, label, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="btn-press flex flex-col items-center text-[9.5px] tracking-[.12em] pb-1 min-w-[44px]"
            style={{ color: isActive ? "var(--glaucous)" : "var(--ink3)" }}
          >
            <span className="text-[16px] mb-[3px] block not-italic">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
