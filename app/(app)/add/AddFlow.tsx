"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Placard } from "@/components/Placard";
import { RhythmBar } from "@/components/RhythmBar";
import { Chip } from "@/components/Chip";
import { Spinner } from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import type { SpeciesMaster, PlantSize, PlantPlacement } from "@/types/database";
import type { PlantWithData } from "@/lib/data";

type Step = 1 | 2 | 3;

const SIZE_OPTIONS: { key: PlantSize; label: string; desc: string }[] = [
  { key: "seedling", label: "実生苗", desc: "播種〜1年" },
  { key: "small",    label: "子株",   desc: "2.5号以下" },
  { key: "medium",   label: "中株",   desc: "3〜5号" },
  { key: "large",    label: "大株",   desc: "6号〜" },
];

const PLACEMENT_OPTIONS: { key: PlantPlacement; label: string }[] = [
  { key: "indoor",   label: "室内" },
  { key: "balcony",  label: "ベランダ・軒下" },
  { key: "outdoor",  label: "屋外" },
];

interface AddFlowProps {
  allSpecies: SpeciesMaster[];
  editPlant?: PlantWithData | null;
  currentMonth: number;
  userId: string;
}

export function AddFlow({ allSpecies, editPlant, currentMonth, userId }: AddFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = !!editPlant;

  // ステップ管理
  const [step, setStep] = useState<Step>(isEdit ? 3 : 1);

  // ステップ1: 種検索
  const [query, setQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesMaster | null>(
    editPlant?.species ?? null
  );

  // ステップ2: AI生成プレビュー
  const [aiSpecies, setAiSpecies] = useState<SpeciesMaster | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<PlantSize>("medium");

  // ステップ3: 株情報
  const [nickname, setNickname] = useState(editPlant?.nickname ?? "");
  const [size, setSize] = useState<PlantSize>(editPlant?.size ?? "medium");
  const [placement, setPlacement] = useState<PlantPlacement>(editPlant?.placement ?? "balcony");
  const [memo, setMemo] = useState(editPlant?.memo ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(editPlant?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 種検索フィルタ
  const q = query.toLowerCase();
  const filtered = q.length < 1 ? [] : allSpecies.filter((s) => {
    return (
      s.name_ja.toLowerCase().includes(q) ||
      (s.name_scientific ?? "").toLowerCase().includes(q) ||
      (s.aliases as string[]).some((a) => a.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  // 写真選択
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1080, initialQuality: 0.8, maxSizeMB: 0.3, fileType: "image/webp",
    });
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  }

  // AI生成
  async function handleAiGenerate() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/species/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setAiError(json.error ?? "生成に失敗しました。もう一度お試しください");
      } else {
        setAiSpecies(json.species);
        setStep(2);
      }
    } catch {
      setAiError("生成に失敗しました。もう一度お試しください");
    } finally {
      setAiLoading(false);
    }
  }

  // AI種を登録してステップ3へ
  async function handleRegisterAi() {
    if (!aiSpecies) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/species/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species: aiSpecies }),
      });
      const json = await res.json();

      // E10: 既存種との衝突 → 既存レコードを提示して確認
      if (json.conflict) {
        const useExisting = confirm(
          `「${json.species.name_ja}」はすでに登録済みです。この種を使いますか？`
        );
        if (!useExisting) {
          setAiLoading(false);
          return;
        }
      }

      setSelectedSpecies(json.species);
      setStep(3);
    } catch {
      setAiError("登録に失敗しました");
    } finally {
      setAiLoading(false);
    }
  }

  // 株を保存（追加 or 編集）
  async function handleSave() {
    if (!selectedSpecies) return;
    if (!nickname.trim()) { setSaveError("ニックネームを入力してください"); return; }
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    let photoUrl: string | null = editPlant?.photo_url ?? null;

    if (photoFile) {
      const path = `${userId}/${editPlant?.id ?? "tmp"}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("plant-photos").upload(path, photoFile, { contentType: "image/webp" });
      if (!error) {
        photoUrl = supabase.storage.from("plant-photos").getPublicUrl(path).data.publicUrl;
      }
    }

    if (isEdit && editPlant) {
      const { error } = await supabase.from("plants").update({
        nickname: nickname.trim(),
        size,
        placement,
        memo: memo.trim() || null,
        photo_url: photoUrl,
        species_id: selectedSpecies.id,
      }).eq("id", editPlant.id);
      if (error) { setSaveError("保存に失敗しました"); setSaving(false); return; }
      router.push(`/plants/${editPlant.id}`);
    } else {
      const { data, error } = await supabase.from("plants").insert({
        owner_id: userId,
        species_id: selectedSpecies.id,
        nickname: nickname.trim(),
        size,
        placement,
        memo: memo.trim() || null,
        photo_url: photoUrl,
        registered_at: new Date().toISOString().split("T")[0],
      }).select().single();
      if (error) { setSaveError("保存に失敗しました"); setSaving(false); return; }
      router.push(`/plants/${data.id}`);
    }
  }

  const displaySpecies = selectedSpecies ?? aiSpecies;

  return (
    <div className="px-[18px] pb-8">
      {/* ヘッダー */}
      <div className="eyebrow mb-1">ADD PLANT</div>
      <h2 className="text-[22px] tracking-[.06em] mb-4" style={{ fontFamily: "var(--font-serif)" }}>
        {isEdit ? "株の情報を編集" : "株を追加"}
      </h2>

      {/* ステッパー */}
      {!isEdit && (
        <div className="flex gap-[6px] mb-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex-1 text-[9.5px] tracking-[.06em]"
              style={{ color: step >= s ? "var(--glaucous)" : "var(--ink3)" }}>
              <div className="h-[3px] rounded-full mb-[5px]"
                style={{ background: step >= s ? "var(--glaucous)" : "var(--line)" }} />
              {s === 1 ? "1 種をえらぶ" : s === 2 ? "2 育て方を確認" : "3 株の情報"}
            </div>
          ))}
        </div>
      )}

      {/* ── ステップ1: 種検索 ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <input
            type="text"
            placeholder="種名で検索（例: チタノタ、パキプス）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-[14px] py-[13px] rounded-[14px] border text-[13px] mb-3"
            style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
          />

          {/* 検索結果 */}
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => { setSelectedSpecies(s); setStep(3); }}
              className="btn-press rounded-[14px] px-[13px] py-[11px] mb-2 border flex justify-between items-center cursor-pointer"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}
            >
              <Placard nameJa={s.name_ja} nameScientific={s.name_scientific} />
              <span className="text-[9px] tracking-[.1em]" style={{ color: "var(--ink3)" }}>
                {s.source === "curated" ? "マスタ収録" : "AI生成"}
              </span>
            </div>
          ))}

          {/* AIに調べてもらう */}
          {query.length > 0 && (
            <div className="rounded-[16px] p-[14px] text-center mt-[14px]"
              style={{ border: "1px dashed #3a4a3e" }}>
              <p className="text-[11px] mb-[10px]" style={{ color: "var(--ink2)", lineHeight: 1.7 }}>
                お探しの種が見つかりませんか？<br />
                AIが育て方を調査して、月別の水やりリズムを作成します。
              </p>
              {aiError && (
                <p className="text-[11px] mb-2" style={{ color: "var(--sun)" }}>{aiError}</p>
              )}
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="btn-press px-[22px] py-[10px] rounded-[14px] border text-[12px] disabled:opacity-60 inline-flex items-center gap-[7px]"
                style={{ background: "transparent", borderColor: "var(--line)", color: "var(--ink2)" }}
              >
                {aiLoading && <Spinner size={12} color="var(--ink2)" />}
                {aiLoading ? "調査中…" : "🔍 AIに調べてもらう"}
              </button>
            </div>
          )}

          {query.length === 0 && (
            <p className="text-center text-[12px] py-8" style={{ color: "var(--ink3)" }}>
              種名を入力して検索してください
            </p>
          )}
        </div>
      )}

      {/* ── ステップ2: AI生成プレビュー ──────────────────────────── */}
      {step === 2 && aiSpecies && (
        <div>
          <div className="rounded-[16px] p-[13px] border mb-3"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <div className="flex justify-between items-start mb-3">
              <Placard nameJa={aiSpecies.name_ja} nameScientific={aiSpecies.name_scientific} />
              <span className="inline-flex items-center gap-[5px] text-[10px] px-[9px] py-[3px] rounded-full border"
                style={{ color: "var(--sun)", borderColor: "#4a3f2c" }}>
                AI生成 · 確度 {aiSpecies.confidence === "high" ? "高" : aiSpecies.confidence === "medium" ? "中" : "低"}
              </span>
            </div>
            <RhythmBar
              intervals={aiSpecies.watering_intervals}
              size={previewSize}
              currentMonth={currentMonth}
              variant="detail"
              note={aiSpecies.care_notes}
            />
          </div>

          {/* サイズ切替 */}
          <div className="flex rounded-[12px] overflow-hidden border mb-2"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            {SIZE_OPTIONS.map((o) => (
              <button key={o.key} onClick={() => setPreviewSize(o.key)}
                className="btn-press flex-1 py-[10px] text-[11px] border-r last:border-r-0"
                style={{
                  borderColor: "var(--line)",
                  background: previewSize === o.key ? "var(--glaucous)" : "transparent",
                  color: previewSize === o.key ? "#10160f" : "var(--ink2)",
                  fontWeight: previewSize === o.key ? 700 : 400,
                }}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-center mb-4" style={{ color: "var(--ink3)" }}>
            サイズを切り替えるとリズムのプレビューが変わります
          </p>

          {aiError && <p className="text-[11px] mb-2 text-center" style={{ color: "var(--sun)" }}>{aiError}</p>}

          <button onClick={handleRegisterAi} disabled={aiLoading}
            className="btn-press w-full py-[13px] rounded-[14px] text-[13px] font-bold mb-2 disabled:opacity-60 flex items-center justify-center gap-[7px]"
            style={{ background: "var(--glaucous)", color: "#10160f", border: "none" }}>
            {aiLoading && <Spinner size={13} color="#10160f" />}
            {aiLoading ? "登録中…" : "この内容で登録する"}
          </button>
          <button onClick={() => { setStep(1); setAiSpecies(null); }} disabled={aiLoading}
            className="btn-press w-full py-[13px] rounded-[14px] border text-[13px] disabled:opacity-60"
            style={{ background: "transparent", borderColor: "var(--line)", color: "var(--ink2)" }}>
            条件を変えて再生成
          </button>
        </div>
      )}

      {/* ── ステップ3: 株情報入力 ────────────────────────────────── */}
      {step === 3 && (
        <div>
          {/* 選択された種の表示 */}
          {displaySpecies && (
            <div className="rounded-[14px] px-[13px] py-[10px] border mb-4 flex justify-between items-center"
              style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
              <Placard nameJa={displaySpecies.name_ja} nameScientific={displaySpecies.name_scientific} />
              {!isEdit && (
                <button onClick={() => { setStep(1); setSelectedSpecies(null); }}
                  className="btn-press text-[10px]" style={{ color: "var(--ink3)" }}>変更</button>
              )}
            </div>
          )}

          {/* 写真 */}
          <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>写真</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-[16px] flex flex-col items-center justify-center gap-[6px] mb-4 cursor-pointer overflow-hidden relative"
            style={{ border: "1.5px dashed #3a4a3e", aspectRatio: "2.6/1", color: "var(--ink3)", fontSize: "11px", textAlign: "center" }}
          >
            {photoPreview ? (
              <Image src={photoPreview} alt="preview" fill className="object-cover" />
            ) : (
              <>
                <b style={{ color: "var(--ink2)", fontSize: "12px" }}>＋ タップして写真を追加</b>
                <span>写真を入れるまでは種のイラストが表示されます</span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

          {/* ニックネーム */}
          <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>ニックネーム</label>
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
            placeholder="例: ハデス一号"
            className="w-full px-[14px] py-[13px] rounded-[14px] border text-[13px] mb-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
          />

          {/* 株サイズ */}
          <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>株サイズ</label>
          <div className="flex rounded-[12px] overflow-hidden border mb-2"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            {SIZE_OPTIONS.map((o) => (
              <button key={o.key} onClick={() => setSize(o.key)}
                className="btn-press flex-1 py-[10px] text-[11px] border-r last:border-r-0"
                style={{
                  borderColor: "var(--line)",
                  background: size === o.key ? "var(--glaucous)" : "transparent",
                  color: size === o.key ? "#10160f" : "var(--ink2)",
                  fontWeight: size === o.key ? 700 : 400,
                }}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] mb-4" style={{ color: "var(--ink3)" }}>
            実生苗: 播種〜1年 / 子株: 2.5号以下 / 中株: 3〜5号 / 大株: 6号〜
          </p>

          {/* 置き場所 */}
          <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>置き場所</label>
          <div className="flex rounded-[12px] overflow-hidden border mb-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            {PLACEMENT_OPTIONS.map((o) => (
              <button key={o.key} onClick={() => setPlacement(o.key)}
                className="btn-press flex-1 py-[10px] text-[11px] border-r last:border-r-0"
                style={{
                  borderColor: "var(--line)",
                  background: placement === o.key ? "var(--glaucous)" : "transparent",
                  color: placement === o.key ? "#10160f" : "var(--ink2)",
                  fontWeight: placement === o.key ? 700 : 400,
                }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* メモ */}
          <label className="block text-[11px] tracking-[.08em] mb-[6px]" style={{ color: "var(--ink2)" }}>メモ（任意）</label>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
            placeholder="用土、購入元など"
            className="w-full px-[14px] py-[13px] rounded-[14px] border text-[13px] mb-4"
            style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
          />

          {saveError && <p className="text-[11px] mb-2" style={{ color: "var(--sun)" }}>{saveError}</p>}

          <button onClick={handleSave} disabled={saving}
            className="btn-press w-full py-[13px] rounded-[14px] text-[13px] font-bold disabled:opacity-60 flex items-center justify-center gap-[7px]"
            style={{ background: "var(--glaucous)", color: "#10160f", border: "none" }}>
            {saving && <Spinner size={13} color="#10160f" />}
            {saving ? "保存中…" : isEdit ? "変更を保存" : "🪴 植物棚に迎える"}
          </button>
        </div>
      )}
    </div>
  );
}
