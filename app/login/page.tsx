"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";

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

type Step = "email" | "code" | "sent";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // ── ステップ1: メールアドレスを送信 ─────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();

    // E15: 招待制チェック
    if (allowedEmails.length > 0 && !allowedEmails.includes(normalized)) {
      setError("このアプリは招待制です。");
      return;
    }

    setLoading(true);
    setError(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    // emailRedirectTo を指定しないことで6桁OTPコードをメール送信
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false },
    });

    setLoading(false);

    if (otpError) {
      setError("メールの送信に失敗しました。再試行してください。");
      return;
    }

    setStep("code");
    // フォーカスをコード入力欄に移動
    setTimeout(() => codeRef.current?.focus(), 100);
  }

  // ── ステップ2: コードを検証 ────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.trim().replace(/\s/g, "");
    if (token.length !== 6) {
      setError("6桁のコードを入力してください。");
      return;
    }

    setLoading(true);
    setError(null);

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });

    setLoading(false);

    if (verifyError) {
      if (verifyError.message.includes("expired") || verifyError.message.includes("invalid")) {
        setError("コードが無効または期限切れです。最初からやり直してください。");
        setStep("email");
        setCode("");
      } else {
        setError("認証に失敗しました。再試行してください。");
      }
      return;
    }

    router.push("/home");
    router.refresh();
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

      {/* ── ステップ1: メールアドレス入力 ── */}
      {step === "email" && (
        <form onSubmit={handleSendCode} className="w-full max-w-xs flex flex-col gap-0">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            required
            className="w-full px-[14px] py-[13px] text-[13px] rounded-[14px] border"
            style={{
              background: "var(--surface)",
              borderColor: error ? "#c97070" : "var(--line)",
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          {error && (
            <p className="text-[11px] mt-[8px] text-center" style={{ color: "#c97070" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full mt-[10px] py-[13px] text-[13px] font-bold rounded-[14px] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-[7px]"
            style={{
              background: "var(--glaucous)",
              color: "#10160f",
              fontFamily: "var(--font-sans)",
              border: "none",
            }}
          >
            {loading && <Spinner size={13} color="#10160f" />}
            {loading ? "送信中…" : "確認コードを送る"}
          </button>
          <p
            className="text-[10px] text-center mt-[14px]"
            style={{ color: "var(--ink3)", lineHeight: 1.7 }}
          >
            このアプリは招待制です。<br />
            登録済みのメールに6桁のコードを送信します。
          </p>
        </form>
      )}

      {/* ── ステップ2: コード入力 ── */}
      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="w-full max-w-xs flex flex-col items-center gap-0">
          <p className="text-[12px] text-center mb-[18px]" style={{ color: "var(--ink2)", lineHeight: 1.7 }}>
            <b style={{ color: "var(--ink)" }}>{email}</b> に<br />
            6桁のコードを送りました。<br />
            メールを確認して入力してください。
          </p>

          <input
            ref={codeRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
            className="w-full px-[14px] py-[16px] text-[28px] text-center tracking-[.3em] rounded-[14px] border mb-2"
            style={{
              background: "var(--surface)",
              borderColor: error ? "#c97070" : "var(--line)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              letterSpacing: "0.35em",
            }}
            autoComplete="one-time-code"
          />

          {error && (
            <p className="text-[11px] mb-[8px] text-center" style={{ color: "#c97070" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="btn-press w-full py-[13px] text-[13px] font-bold rounded-[14px] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-[7px]"
            style={{
              background: "var(--glaucous)",
              color: "#10160f",
              fontFamily: "var(--font-sans)",
              border: "none",
            }}
          >
            {loading && <Spinner size={13} color="#10160f" />}
            {loading ? "確認中…" : "ログイン"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => { setStep("email"); setCode(""); setError(null); }}
            className="btn-press mt-[14px] text-[11px] underline disabled:opacity-60"
            style={{ color: "var(--ink3)", background: "none", border: "none" }}
          >
            メールアドレスを変更 / コードを再送する
          </button>
        </form>
      )}
    </div>
  );
}
