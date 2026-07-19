"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/Spinner";
import type { Profile } from "@/types/database";

interface SettingsClientProps {
  profile: Profile;
  isIos: boolean;
}

export function SettingsClient({ profile, isIos }: SettingsClientProps) {
  const router = useRouter();
  const [notifyEnabled, setNotifyEnabled] = useState(profile.notify_enabled);
  const [notifyHour, setNotifyHour] = useState(profile.notify_hour);
  const [notifyDormancy, setNotifyDormancy] = useState(profile.notify_dormancy_wake ?? true);
  const [locationName, setLocationName] = useState(profile.location_name ?? "東京");
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "denied" | "unsupported" | "failed">("idle");
  const [notifyToggling, setNotifyToggling] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 地域検索
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<{ name: string; latitude: number; longitude: number }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSave(updates: Partial<Profile>) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update(updates).eq("id", profile.id);
    setSaving(false);
  }

  // ─── 通知トグル（Web Push 購読 ON/OFF） ─────────────────────────
  async function handleToggleNotify() {
    if (notifyToggling) return;
    const next = !notifyEnabled;
    setNotifyToggling(true);
    try {
      await doToggleNotify(next);
    } finally {
      setNotifyToggling(false);
    }
  }

  async function doToggleNotify(next: boolean) {
    if (next) {
      // 通知をONにする → ブラウザの許可を求めてから購読
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("unsupported");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }

      setPushStatus("requesting");
      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) throw new Error("VAPID key missing");

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });

        const subJson = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        const subscribeRes = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subJson),
        });
        if (!subscribeRes.ok) {
          // サーバー側の保存に失敗（DBエラー・認証切れ等）→ ここで検知しないと
          // ブラウザの購読だけ成立してトグルはONに見えるのに push_subscriptions には
          // 何も残らず、通知が一切届かない状態になる
          const body = await subscribeRes.json().catch(() => ({}));
          console.error("push subscribe API error:", body.error ?? subscribeRes.status);
          setPushStatus("failed");
          return;
        }
      } catch (e) {
        console.error("push subscribe error:", e);
        setPushStatus("denied");
        return;
      }
      setPushStatus("idle");
    } else {
      // 通知をOFFにする → 購読を削除
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      } catch (e) {
        console.error("push unsubscribe error:", e);
      }
    }

    setNotifyEnabled(next);
    await handleSave({ notify_enabled: next });
  }

  async function handleToggleDormancy() {
    const next = !notifyDormancy;
    setNotifyDormancy(next);
    await handleSave({ notify_dormancy_wake: next });
  }

  async function handleHourChange(h: number) {
    setNotifyHour(h);
    await handleSave({ notify_hour: h });
  }

  // ─── 地域検索 ──────────────────────────────────────────────────
  function handleLocationQueryChange(q: string) {
    setLocationQuery(q);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!q.trim()) { setLocationResults([]); return; }

    locationDebounceRef.current = setTimeout(async () => {
      setLocationSearching(true);
      try {
        const res = await fetch(`/api/geocoding?name=${encodeURIComponent(q)}`);
        const json = await res.json();
        setLocationResults(json.results ?? []);
      } catch {
        setLocationResults([]);
      } finally {
        setLocationSearching(false);
      }
    }, 400);
  }

  async function handleSelectLocation(loc: { name: string; latitude: number; longitude: number }) {
    setLocationName(loc.name);
    setLocationQuery("");
    setLocationResults([]);
    await handleSave({
      location_name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const showPushDenied = pushStatus === "denied";
  const showPushUnsupported = pushStatus === "unsupported";
  const showPushFailed = pushStatus === "failed";

  return (
    <div className="px-[18px] pb-8">
      <div className="eyebrow mb-1">SETTINGS</div>
      <h2 className="text-[22px] tracking-[.06em] mb-4" style={{ fontFamily: "var(--font-serif)" }}>
        設定
      </h2>

      <div className="mt-2">
        {/* プロフィール */}
        <SettingRow label={profile.display_name} sub={profile.id.slice(0, 8) + "…"}>
          <span className="text-[10px] px-[9px] py-[3px] rounded-full border"
            style={{ color: "var(--ink2)", borderColor: "var(--line)" }}>プロフィール</span>
        </SettingRow>

        {/* 水やり通知 */}
        <SettingRow label="水やり通知" sub="今日の対象株をまとめて1通で通知">
          <div className="flex items-center gap-[8px]">
            {notifyToggling && <Spinner size={12} color="var(--ink3)" />}
            <Toggle on={notifyEnabled} onToggle={handleToggleNotify} disabled={notifyToggling} />
          </div>
        </SettingRow>

        {/* E13: 通知拒否・未対応 */}
        {showPushDenied && (
          <div className="rounded-[12px] px-[13px] py-[10px] mb-1 text-[11px] leading-[1.7]"
            style={{ background: "#1e1a14", color: "var(--sun)" }}>
            通知は許可されていません。ブラウザの設定から「通知」を許可してください。
            {isIos && (
              <span> iPhoneはホーム画面に追加後に設定できます。</span>
            )}
          </div>
        )}
        {showPushUnsupported && (
          <div className="rounded-[12px] px-[13px] py-[10px] mb-1 text-[11px] leading-[1.7]"
            style={{ background: "#1a1a1a", color: "var(--ink2)" }}>
            このブラウザは通知に対応していません。アプリ内の「今日の水やり」リストをご確認ください。
          </div>
        )}
        {showPushFailed && (
          <div className="rounded-[12px] px-[13px] py-[10px] mb-1 text-[11px] leading-[1.7]"
            style={{ background: "#1e1a14", color: "var(--sun)" }}>
            通知の許可は得られましたが、購読の保存に失敗しました。もう一度トグルを操作してください。
          </div>
        )}

        {/* 通知時刻 */}
        {notifyEnabled && (
          <SettingRow label="通知時刻">
            <select
              value={notifyHour}
              onChange={(e) => handleHourChange(parseInt(e.target.value))}
              className="text-[11px] px-[9px] py-[3px] rounded-full border"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--line)",
                color: "var(--ink)",
              }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{`${h}:00`}</option>
              ))}
            </select>
          </SettingRow>
        )}

        {/* 地域 */}
        <SettingRow label="地域" sub="天気注記に使用（東京デフォルト）">
          <button
            onClick={() => setLocationQuery(locationName)}
            className="btn-press text-[10px] px-[9px] py-[3px] rounded-full border"
            style={{ color: "var(--ink2)", borderColor: "var(--line)", background: "transparent" }}
          >
            {locationName} ▾
          </button>
        </SettingRow>

        {/* 地域検索パネル */}
        {locationQuery !== "" && (
          <div className="mb-2">
            <input
              autoFocus
              type="text"
              value={locationQuery}
              onChange={(e) => handleLocationQueryChange(e.target.value)}
              placeholder="市区町村を入力…"
              className="w-full px-[13px] py-[10px] rounded-[12px] border text-[12px] mb-1"
              style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
            />
            {locationSearching && (
              <p className="text-[10px] text-center py-1" style={{ color: "var(--ink3)" }}>検索中…</p>
            )}
            {locationResults.map((loc) => (
              <button
                key={`${loc.latitude}-${loc.longitude}`}
                onClick={() => handleSelectLocation(loc)}
                className="btn-press w-full text-left px-[13px] py-[10px] rounded-[10px] border-b text-[12px]"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                {loc.name}
              </button>
            ))}
            <button
              onClick={() => { setLocationQuery(""); setLocationResults([]); }}
              className="btn-press w-full text-center py-[8px] text-[11px] mt-1"
              style={{ color: "var(--ink3)" }}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* 断水明け通知 */}
        <SettingRow label="断水明け通知" sub="休眠明けの月初に「目覚めました」をお知らせ">
          <Toggle on={notifyDormancy} onToggle={handleToggleDormancy} />
        </SettingRow>

        {/* マスタ管理（admin のみ） */}
        {profile.is_admin && (
          <SettingRow label="マスタデータ管理" sub="管理者のみ · Supabase Table Editor で編集">
            <span className="text-[10px] px-[9px] py-[3px] rounded-full border"
              style={{ color: "var(--sun)", borderColor: "#4a3f2c" }}>ADMIN</span>
          </SettingRow>
        )}
      </div>

      {/* iOS ホーム画面ガイド */}
      {isIos && (
        <div className="rounded-[16px] p-[13px] mt-4 text-[11px] leading-[1.8]"
          style={{
            background: "linear-gradient(120deg,#1b2420,#161e22)",
            border: "1px solid #2c4450",
            color: "#9cc3d6",
          }}>
          📱 <b>iPhoneをお使いの方へ</b><br />
          Safariの共有メニューから「ホーム画面に追加」すると、アプリとして起動でき、水やり通知を受け取れるようになります。
        </div>
      )}

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="btn-press w-full py-[13px] mt-4 rounded-[14px] border text-[13px] disabled:opacity-60 flex items-center justify-center gap-[7px]"
        style={{ background: "transparent", borderColor: "var(--line)", color: "var(--ink2)" }}
      >
        {loggingOut && <Spinner size={12} color="var(--ink2)" />}
        {loggingOut ? "ログアウト中…" : "ログアウト"}
      </button>

      {saving && (
        <p className="text-center text-[11px] mt-2" style={{ color: "var(--ink3)" }}>保存中…</p>
      )}
    </div>
  );
}

// ── ヘルパー ─────────────────────────────────────────────────────────

/** VAPID公開鍵（Base64URL）→ Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ── サブコンポーネント ─────────────────────────────────────────────

function SettingRow({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-[14px] border-b"
      style={{ borderColor: "var(--line)" }}>
      <div>
        <div className="text-[12.5px]" style={{ color: "var(--ink)" }}>{label}</div>
        {sub && <div className="text-[10px] mt-[3px] leading-[1.5]" style={{ color: "var(--ink3)" }}>{sub}</div>}
      </div>
      <div className="ml-3 flex-none">{children}</div>
    </div>
  );
}

function Toggle({ on, onToggle, disabled = false }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      className="btn-press relative flex-none"
      style={{
        width: "42px",
        height: "24px",
        borderRadius: "99px",
        background: on ? "var(--glaucous)" : "#2c382f",
        transition: "background .2s",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        className="absolute top-[3px] transition-all duration-200"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: on ? "#10160f" : "#5d6a61",
          right: on ? "3px" : "auto",
          left: on ? "auto" : "3px",
        }}
      />
    </div>
  );
}
