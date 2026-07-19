"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Placard } from "@/components/Placard";
import { Chip } from "@/components/Chip";
import { RhythmBar } from "@/components/RhythmBar";
import { PlantThumb } from "@/components/PlantThumb";
import { RecordSheet } from "./RecordSheet";
import { Toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import {
  calcNextWateringDate,
  getLastWateringDate,
  isDormant,
  calcDaysSinceRegistration,
  todayJST,
} from "@/lib/watering";
import type { PlantWithData } from "@/lib/data";
import type { CareAction } from "@/types/database";

const SIZE_LABEL: Record<string, string> = {
  seedling: "実生苗", small: "子株", medium: "中株", large: "大株",
};
const PLACEMENT_LABEL: Record<string, string> = {
  indoor: "室内", balcony: "ベランダ・軒下", outdoor: "屋外",
};
const ACTION_ICON: Record<CareAction, string> = {
  watering: "💧", fertilizer: "🌱", light: "💡",
};
const ACTION_LABEL: Record<CareAction, string> = {
  watering: "水やり", fertilizer: "肥料", light: "照射",
};

interface PlantDetailClientProps {
  plant: PlantWithData;
  currentMonth: number;
  userId: string;
}

export function PlantDetailClient({ plant, currentMonth, userId }: PlantDetailClientProps) {
  const router = useRouter();
  const [recordSheetOpen, setRecordSheetOpen] = useState(false);
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [logs, setLogs] = useState(plant.care_logs);
  const [archiving, setArchiving] = useState(false);
  const [hardDeleting, setHardDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const { species } = plant;
  const today = todayJST();
  const dormant = isDormant(plant, today);
  const dayCount = calcDaysSinceRegistration(plant.registered_at, today);
  const lastWatering = getLastWateringDate(logs);
  const nextResult = calcNextWateringDate(
    lastWatering,
    plant.registered_at,
    plant.size,
    species.watering_intervals
  );

  const showToast = (msg: string) => setToast({ msg, visible: true });

  // 記録保存後にローカル更新
  const handleSaved = useCallback(
    (action: CareAction) => {
      const newLog = {
        id: crypto.randomUUID(),
        plant_id: plant.id,
        action,
        logged_at: new Date().toISOString(),
        photo_url: null,
        memo: null,
        created_at: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      showToast(`${ACTION_LABEL[action]}を記録しました`);
      router.refresh();
    },
    [plant.id, router]
  );

  // 記録削除（E5）
  const handleDeleteLog = useCallback(async (logId: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    const removed = logs.find((l) => l.id === logId);

    // 楽観的更新: 先にリストから消す
    setLogs((prev) => prev.filter((l) => l.id !== logId));

    const supabase = createClient();
    const { error } = await supabase.from("care_logs").delete().eq("id", logId);

    if (error) {
      // ロールバック
      if (removed) setLogs((prev) => [removed, ...prev]);
      showToast("削除に失敗しました");
      return;
    }
    showToast("記録を削除しました");
    router.refresh();
  }, [logs, router]);

  // アーカイブ
  const handleArchive = useCallback(async () => {
    if (!confirm(`「${plant.nickname}」をアーカイブしますか？`)) return;
    setArchiving(true);
    const supabase = createClient();
    const { error } = await supabase.from("plants").update({ archived: true }).eq("id", plant.id);
    if (error) {
      setArchiving(false);
      showToast("アーカイブに失敗しました");
      return;
    }
    router.push("/shelf");
  }, [plant.id, plant.nickname, router]);

  // 完全削除（E6）
  const handleHardDelete = useCallback(async () => {
    const input = deleteInputRef.current?.value ?? "";
    if (input !== plant.nickname) {
      alert(`株名「${plant.nickname}」を正確に入力してください`);
      return;
    }
    if (!confirm("すべての記録と写真が完全に削除されます。復元できません。続けますか？")) return;

    setHardDeleting(true);
    const supabase = createClient();

    // Storage 写真削除
    const photoLogs = logs.filter((l) => l.photo_url);
    for (const log of photoLogs) {
      if (log.photo_url) {
        const path = log.photo_url.split("/plant-photos/")[1];
        if (path) await supabase.storage.from("plant-photos").remove([path]);
      }
    }
    if (plant.photo_url) {
      const path = plant.photo_url.split("/plant-photos/")[1];
      if (path) await supabase.storage.from("plant-photos").remove([path]);
    }

    const { error } = await supabase.from("plants").delete().eq("id", plant.id);
    if (error) {
      setHardDeleting(false);
      showToast("削除に失敗しました");
      return;
    }
    router.push("/shelf");
  }, [plant.id, plant.nickname, plant.photo_url, logs, router]);

  // 次回日の表示
  let nextLabel = "";
  if (dormant) {
    nextLabel = "断水中";
  } else if (nextResult.kind === "scheduled") {
    const diff = Math.round(
      (new Date(nextResult.date).getTime() - new Date(today).getTime()) / 86400000
    );
    nextLabel = diff <= 0 ? "今日" : diff === 1 ? "明日" : `あと${diff}日`;
  }

  // 成長ギャラリー（写真付き記録から最古と最新）
  const photoPairs = getGalleryPhotos(plant);

  return (
    <div className="pb-6">
      {/* ← 戻る */}
      <div className="px-[18px] pb-1">
        <Link href="/shelf" className="text-[11px] tracking-[.1em]" style={{ color: "var(--ink3)" }}>
          ← 植物棚
        </Link>
      </div>

      {/* ヒーロー写真 */}
      <div className="relative mx-[18px] rounded-[20px] overflow-hidden h-[230px] mb-[14px]"
        style={{ background: "radial-gradient(circle at 50% 20%, #243129, #151c17 70%)" }}>
        {plant.photo_url ? (
          <Image src={plant.photo_url} alt={plant.nickname} fill sizes="(max-width: 480px) 100vw, 480px" className="object-cover"
            style={dormant ? { filter: "grayscale(.5) brightness(.55)" } : undefined}
          />
        ) : (
          <PlantThumb
            photoUrl={null}
            category={species.category}
            speciesId={species.id}
            isDormant={dormant}
            className="w-full h-full"
            sizes="(max-width: 480px) 100vw, 480px"
          />
        )}
        <div className="absolute top-[12px] left-[12px] text-[10px] tracking-[.16em] px-[9px] py-[3px] rounded-full z-10"
          style={{ color: "#d7e0d9", background: "rgba(15,20,17,.5)" }}>
          DAY {dayCount} · {plant.registered_at} お迎え
        </div>
      </div>

      {/* プレート + タグ */}
      <div className="px-[18px]">
        <Placard nameJa={plant.nickname} nameScientific={species.name_scientific} large isDormant={dormant}>
          <div className="flex gap-[6px] flex-wrap mt-2">
            <Chip>{SIZE_LABEL[plant.size]}</Chip>
            <Chip>{PLACEMENT_LABEL[plant.placement]}</Chip>
            {!dormant && nextLabel && (
              <Chip variant="water">次回 {nextLabel}</Chip>
            )}
            {dormant && <Chip variant="moon">🌙 断水中</Chip>}
            {species.source === "ai_generated" && (
              <Chip variant="sun">AI生成データ</Chip>
            )}
          </div>
        </Placard>
      </div>

      {/* 年間リズムパネル */}
      <div className="mx-[18px] mt-3 rounded-[16px] p-[13px] border"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <h4 className="text-[11px] tracking-[.14px] mb-[10px]" style={{ color: "var(--ink2)" }}>
          年間の水やりリズム（マスタ準拠 / {SIZE_LABEL[plant.size]}）
        </h4>
        <RhythmBar
          intervals={species.watering_intervals}
          size={plant.size}
          currentMonth={currentMonth}
          variant="detail"
          note={buildRhythmNote(species.watering_intervals[plant.size], currentMonth, species.care_notes)}
        />
      </div>

      {/* 3アクションボタン */}
      <div className="flex gap-2 px-[18px] mt-[14px]">
        <button
          onClick={() => setRecordSheetOpen(true)}
          className="btn-press flex-1 py-[10px] rounded-[14px] flex flex-col items-center justify-center gap-[3px] border"
          style={{ background: "var(--water)", color: "#0d1418", borderColor: "var(--water)" }}
        >
          <span className="text-[30px] leading-none">💧</span>
          <span className="text-[12px] font-bold">水やり</span>
        </button>
        <button
          onClick={() => setRecordSheetOpen(true)}
          className="btn-press flex-1 py-[10px] rounded-[14px] flex flex-col items-center justify-center gap-[3px] border"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
        >
          <span className="text-[30px] leading-none">🌱</span>
          <span className="text-[12px]">肥料</span>
        </button>
        <button
          onClick={() => setRecordSheetOpen(true)}
          className="btn-press flex-1 py-[10px] rounded-[14px] flex flex-col items-center justify-center gap-[3px] border"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}
        >
          <span className="text-[30px] leading-none">💡</span>
          <span className="text-[12px]">照射</span>
        </button>
      </div>

      {/* 成長ギャラリー */}
      {photoPairs && (
        <div className="px-[18px] mt-[18px]">
          <div className="flex justify-between items-baseline mb-[9px]">
            <b className="text-[12.5px] tracking-[.08em]">成長ギャラリー</b>
            <span className="text-[10px]" style={{ color: "var(--ink3)" }}>比較</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 aspect-square rounded-[14px] overflow-hidden relative"
              style={{ background: "#151c17" }}>
              <Image src={photoPairs.oldest} alt="最初の写真" fill sizes="(max-width: 480px) 50vw, 240px" className="object-cover" />
              <div className="absolute bottom-1 left-2 text-[9px]" style={{ color: "var(--ink3)" }}>最初</div>
            </div>
            <div className="flex-1 aspect-square rounded-[14px] overflow-hidden relative"
              style={{ background: "#151c17" }}>
              <Image src={photoPairs.newest} alt="最新の写真" fill sizes="(max-width: 480px) 50vw, 240px" className="object-cover" />
              <div className="absolute bottom-1 left-2 text-[9px]" style={{ color: "var(--ink3)" }}>最新</div>
            </div>
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div className="px-[18px] mt-[18px]">
        <div className="flex justify-between items-baseline mb-[9px]">
          <b className="text-[12.5px] tracking-[.08em]">記録タイムライン</b>
          <span className="text-[10px]" style={{ color: "var(--ink3)" }}>直近</span>
        </div>
        {logs.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: "var(--ink3)" }}>
            まだ記録がありません
          </p>
        ) : (
          <div>
            {logs.slice(0, 20).map((log) => (
              <div key={log.id}
                className="flex gap-[10px] py-[9px] border-b items-start"
                style={{ borderColor: "var(--line)" }}>
                <div className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center flex-none text-[12px]"
                  style={{ background: "var(--surface2)" }}>
                  {ACTION_ICON[log.action as CareAction]}
                </div>
                <div className="flex-1 text-[11px]" style={{ color: "var(--ink2)" }}>
                  <b style={{ color: "var(--ink)" }}>{ACTION_LABEL[log.action as CareAction]}</b>
                  {" · "}
                  {new Intl.DateTimeFormat("ja-JP", {
                    timeZone: "Asia/Tokyo", month: "short", day: "numeric",
                  }).format(new Date(log.logged_at))}
                  {log.memo && ` · ${log.memo}`}
                </div>
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  className="btn-press text-[10px] px-2 py-1 rounded-[8px]"
                  style={{ color: "var(--ink3)" }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 株の操作 */}
      <div className="px-[18px] mt-6 flex flex-col gap-2">
        <Link href={`/add?edit=${plant.id}`}
          className="btn-press w-full py-[11px] rounded-[14px] text-center text-[12.5px] border"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }}>
          株の情報を編集
        </Link>
        <button onClick={handleArchive} disabled={archiving}
          className="btn-press w-full py-[11px] rounded-[14px] text-[12.5px] border disabled:opacity-60 flex items-center justify-center gap-[7px]"
          style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink2)" }}>
          {archiving && <Spinner size={12} color="var(--ink2)" />}
          {archiving ? "アーカイブ中…" : "アーカイブ（推奨）"}
        </button>
        {/* 完全削除セクション */}
        <div className="rounded-[14px] p-[13px] border mt-2"
          style={{ background: "var(--surface)", borderColor: "#3a2020" }}>
          <p className="text-[11px] mb-2" style={{ color: "var(--ink3)" }}>
            完全削除: 復元できません。株名を入力して確認してください
          </p>
          <input
            ref={deleteInputRef}
            type="text"
            placeholder={plant.nickname}
            disabled={hardDeleting}
            className="w-full px-[12px] py-[9px] rounded-[12px] border text-[12px] mb-2 disabled:opacity-60"
            style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
          />
          <button onClick={handleHardDelete} disabled={hardDeleting}
            className="btn-press w-full py-[10px] rounded-[12px] text-[12px] disabled:opacity-60 flex items-center justify-center gap-[7px]"
            style={{ background: "#2a1010", color: "#c97070", border: "1px solid #3a2020" }}>
            {hardDeleting && <Spinner size={12} color="#c97070" />}
            {hardDeleting ? "削除中…" : "完全に削除"}
          </button>
        </div>
      </div>

      {/* 記録ボトムシート */}
      <RecordSheet
        plantId={plant.id}
        plantNickname={plant.nickname}
        open={recordSheetOpen}
        onClose={() => setRecordSheetOpen(false)}
        onSaved={handleSaved}
        photoCount={logs.filter((l) => l.photo_url).length}
        userId={userId}
      />

      <Toast message={toast.msg} visible={toast.visible} onHide={() => setToast({ msg: "", visible: false })} />
    </div>
  );
}

// ── ヘルパー関数 ──────────────────────────────────────────────────

function buildRhythmNote(
  intervals: Record<string, number | null>,
  month: number,
  careNotes: string | null
): string {
  const interval = intervals[String(month)];
  const monthStr = `${month}月`;
  const intervalStr = interval !== null ? `${interval}日間隔` : "断水";
  return `${monthStr}は ${intervalStr}。${careNotes ?? ""}`;
}

function getGalleryPhotos(plant: PlantWithData) {
  const photos = [
    ...(plant.photo_url ? [{ url: plant.photo_url, date: plant.registered_at }] : []),
    ...plant.care_logs
      .filter((l) => l.photo_url)
      .map((l) => ({ url: l.photo_url!, date: l.logged_at })),
  ].sort((a, b) => (a.date > b.date ? 1 : -1));

  if (photos.length < 2) return null;
  return { oldest: photos[0].url, newest: photos[photos.length - 1].url };
}
