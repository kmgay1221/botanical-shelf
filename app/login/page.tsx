"use client";

import { useState } from "react";

// アガベロゼット SVG（モックの logo に対応）
function AgaveLogo() {
  return (
    <svg
      viewBox="0 0 92 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[92px] h-[92px] mb-[18px]"
      aria-hidden="true"
    >
      {/* ロゼット形状 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <ellipse
          key={i}
          cx="46" cy="46" rx="7" ry="26"
          fill={i % 2 === 0 ? "#a9c6b4" : "#7ba98d"}
          fillOpacity={0.85}
          transform={`rotate(${deg} 46 46)`}
        />
      ))}
      <circle cx="46" cy="46" r="8" fill="#a9c6b4" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "denied">("idle");
  const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();

    // 招待制チェック（サーバー側でも /api/auth/send-link で二重確認）
    if (allowedEmails.length > 0 && !allowedEmails.includes(normalized)) {
      setStatus("denied");
      return;
    }

    setStatus("loading");

    // クライアントを動的 import して build 時の評価を回避
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-[18px]">
      <AgaveLogo />

      <h2
        className="text-[26px] tracking-[.3em] mb-1 pl-[.3em]"
        style={{ fontFamily: "var(--font-serif)", fontWeight: 600, color: "var(--ink)" }}
      >
        植物棚
      </h2>
      <p
        className="text-[11px] tracking-[.2em] mb-[34px]"
        style={{ color: "var(--ink2)" }}
      >
        BOTANICAL SHELF
      </p>

      {status === "sent" ? (
        <div className="w-full max-w-xs text-center">
          <p className="text-[13px] mb-3" style={{ color: "var(--ink)" }}>
            ログインリンクを送りました。
          </p>
          <p className="text-[11px]" style={{ color: "var(--ink2)", lineHeight: 1.7 }}>
            メールをご確認ください。
            <br />
            届かない場合は迷惑メールフォルダをご確認ください。
          </p>
        </div>
      ) : status === "denied" ? (
        <div className="w-full max-w-xs text-center">
          <p className="text-[13px]" style={{ color: "var(--ink2)" }}>
            このアプリは招待制です。
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-4 text-[11px] underline"
            style={{ color: "var(--ink3)" }}
          >
            戻る
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-0">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-[14px] py-[13px] text-[13px] rounded-[14px] border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--line)",
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full mt-[10px] py-[13px] text-[13px] font-bold rounded-[14px] cursor-pointer disabled:opacity-60"
            style={{
              background: "var(--glaucous)",
              color: "#10160f",
              fontFamily: "var(--font-sans)",
              border: "none",
            }}
          >
            {status === "loading" ? "送信中…" : "ログインリンクを送る"}
          </button>
          <p
            className="text-[10px] text-center mt-[14px]"
            style={{ color: "var(--ink3)", lineHeight: 1.7 }}
          >
            このアプリは招待制です。
            <br />
            登録済みのメールアドレスにリンクを送信します。
          </p>
        </form>
      )}
    </div>
  );
}
