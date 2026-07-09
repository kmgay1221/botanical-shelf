"use client";

import { useState, useRef } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { createClient } from "@/lib/supabase/client";
import { toJSTDateString } from "@/lib/watering";
import imageCompression from "browser-image-compression";
import type { CareAction } from "@/types/database";

interface RecordSheetProps {
  plantId: string;
  plantNickname: string;
  open: boolean;
  onClose: () => void;
  onSaved: (action: CareAction) => void;
  photoCount: number;
  userId: string;
}

const ACTIONS: { key: CareAction; label: string; icon: string }[] = [
  { key: "watering",   label: "水やり", icon: "💧" },
  { key: "fertilizer", label: "肥料",   icon: "🌱" },
  { key: "light",      label: "照射",   icon: "💡" },
];

export function RecordSheet({
  plantId,
  plantNickname,
  open,
  onClose,
  onSaved,
  photoCount,
  userId,
}: RecordSheetProps) {
  const [action, setAction] = useState<CareAction>("watering");
  const [loggedAt, setLoggedAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [memo, setMemo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // E8: 50枚上限
    if (photoCount >= 50) {
      setError("この株の写真が上限（50枚）です。古い写真を削除してから追加してください");
      return;
    }

    // クライアント圧縮（長辺1080px、目標300KB）
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1080,
      initialQuality: 0.8,
      maxSizeMB: 0.3,
      fileType: "image/webp",
    });
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let photoUrl: string | null = null;

    // 写真アップロード
    if (photoFile) {
      const path = `${userId}/${plantId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("plant-photos")
        .upload(path, photoFile, { contentType: "image/webp" });

      if (uploadError) {
        // E7: 写真保存失敗 → 記録自体は保存を続行
        setError("写真の保存に失敗しました。詳細画面から追加できます");
      } else {
        const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
        photoUrl = data.publicUrl;
      }
    }

    // care_logs に挿入
    const { error: insertError } = await supabase.from("care_logs").insert({
      plant_id: plantId,
      action,
      logged_at: new Date(loggedAt).toISOString(),
      photo_url: photoUrl,
      memo: memo.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError("記録に失敗しました。再試行してください");
      return;
    }

    onSaved(action);
    onClose();
    // reset
    setMemo("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setAction("watering");
  }

  const actionInfo = ACTIONS.find((a) => a.key === action)!;

  return (
    <BottomSheet open={open} onClose={onClose} title={`記録する — ${plantNickname}`}>
      {/* アクション切替セグメント */}
      <div className="flex rounded-[12px] overflow-hidden mb-4 border"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => setAction(a.key)}
            className="flex-1 py-[10px] text-center text-[11px] border-r last:border-r-0"
            style={{
              borderColor: "var(--line)",
              background: action === a.key ? "var(--glaucous)" : "transparent",
              color: action === a.key ? "#10160f" : "var(--ink2)",
              fontWeight: action === a.key ? 700 : 400,
            }}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {/* 日時 */}
      <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>
        日時
      </label>
      <input
        type="datetime-local"
        value={loggedAt}
        onChange={(e) => setLoggedAt(e.target.value)}
        className="w-full px-[14px] py-[11px] rounded-[14px] border text-[13px] mb-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
      />

      {/* 写真 */}
      <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>
        写真（任意）
      </label>
      <div
        className="rounded-[16px] flex flex-col items-center justify-center gap-[6px] mb-4 cursor-pointer"
        style={{
          border: "1.5px dashed #3a4a3e",
          aspectRatio: "4/1",
          color: "var(--ink3)",
          fontSize: "11px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={() => fileRef.current?.click()}
      >
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPreview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <b style={{ color: "var(--ink2)", fontSize: "12px" }}>＋ 写真を追加</b>
            <span>JPEG / PNG · 自動圧縮</span>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* メモ */}
      <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>
        メモ（任意）
      </label>
      <input
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="例: 鉢底から流れるまでたっぷり"
        className="w-full px-[14px] py-[11px] rounded-[14px] border text-[13px] mb-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
      />

      {error && (
        <p className="text-[11px] mb-3" style={{ color: "var(--sun)" }}>{error}</p>
      )}

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-[13px] rounded-[14px] text-[13px] font-bold disabled:opacity-60"
        style={{
          background: action === "watering" ? "var(--water)" : "var(--glaucous)",
          color: "#0d1418",
          border: "none",
        }}
      >
        {saving ? "保存中…" : `${actionInfo.icon} ${actionInfo.label}を記録`}
      </button>
    </BottomSheet>
  );
}
