"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlantThumb } from "@/components/PlantThumb";
import { Placard } from "@/components/Placard";
import { DoneButton } from "@/components/DoneButton";
import { Chip } from "@/components/Chip";
import { Toast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";
import { toJSTDateString, todayJST } from "@/lib/watering";
import type { TodayTarget } from "@/lib/watering";
import type { PlantWithData } from "@/lib/data";

interface HomeClientProps {
  todayTargets: TodayTarget[];
  seedlingPlants: PlantWithData[];
  dormantPlants: PlantWithData[];
  plantsCount: number;
  nextScheduled: { nickname: string; date: string } | null;
  streakCount: number;
  encyclopediaOwned: number;
  encyclopediaTotal: number;
  weather: { highHumidity: boolean; hotDay: boolean } | null;
  currentDateLabel: string;
  dayLabel: string;
}

export function HomeClient({
  todayTargets,
  seedlingPlants,
  dormantPlants,
  plantsCount,
  nextScheduled,
  streakCount,
  encyclopediaOwned,
  encyclopediaTotal,
  weather,
  currentDateLabel,
  dayLabel,
}: HomeClientProps) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: "", visible: false });
  const [isPending, startTransition] = useTransition();

  // E16: フォアグラウンド復帰時に再取得（月替わり跨ぎ対策）
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  // E14: オフライン検知
  useEffect(() => {
    const handleOffline = () => setToast({ msg: "オフラインです", visible: true });
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  const showToast = (msg: string) => setToast({ msg, visible: true });
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  const handleComplete = useCallback(
    async (plantId: string) => {
      // 楽観的更新: DB応答を待たずに先に完了表示・二重タップを防止
      setCompletedIds((prev) => new Set([...prev, plantId]));
      setPendingIds((prev) => new Set([...prev, plantId]));

      const supabase = createClient();
      const today = todayJST();

      const clearPending = () =>
        setPendingIds((prev) => {
          const n = new Set(prev);
          n.delete(plantId);
          return n;
        });
      const rollback = () =>
        setCompletedIds((prev) => {
          const n = new Set(prev);
          n.delete(plantId);
          return n;
        });

      // 同日2回目チェック
      const { data: existing } = await supabase
        .from("care_logs")
        .select("id")
        .eq("plant_id", plantId)
        .eq("action", "watering")
        .gte("logged_at", `${today}T00:00:00+09:00`)
        .lte("logged_at", `${today}T23:59:59+09:00`)
        .limit(1);

      if (existing && existing.length > 0) {
        // E3: 同日2回目の確認
        if (!confirm("今日は記録済みです。もう一度記録しますか？")) {
          clearPending();
          rollback();
          return;
        }
      }

      const { error } = await supabase.from("care_logs").insert({
        plant_id: plantId,
        action: "watering",
        logged_at: new Date().toISOString(),
      });

      clearPending();

      if (error) {
        showToast("記録に失敗しました。再試行してください");
        rollback();
      } else {
        showToast("水やりを記録しました 💧");
      }
    },
    []
  );

  const handleCompleteAll = useCallback(async () => {
    const pending = todayTargets.filter((t) => !completedIds.has(t.plant.id));
    if (pending.length === 0) return;

    if (!confirm(`${pending.length}株に水やりを記録します`)) return;

    const supabase = createClient();
    const now = new Date().toISOString();
    const pendingPlantIds = pending.map((t) => t.plant.id);
    const failed: string[] = [];

    // 楽観的更新: 対象をまとめて先に完了表示
    setCompletedIds((prev) => new Set([...prev, ...pendingPlantIds]));
    setPendingIds((prev) => new Set([...prev, ...pendingPlantIds]));

    startTransition(async () => {
      for (const target of pending) {
        const { error } = await supabase.from("care_logs").insert({
          plant_id: target.plant.id,
          action: "watering",
          logged_at: now,
        });
        if (error) {
          failed.push(target.plant.nickname);
          setCompletedIds((prev) => {
            const n = new Set(prev);
            n.delete(target.plant.id);
            return n;
          });
        }
        setPendingIds((prev) => {
          const n = new Set(prev);
          n.delete(target.plant.id);
          return n;
        });
      }

      if (failed.length > 0) {
        showToast(`失敗: ${failed.join("、")}`);
      } else {
        showToast(`${pending.length}株の水やりを記録しました 💧`);
      }
    });
  }, [todayTargets, completedIds]);

  const pendingCount = todayTargets.filter((t) => !completedIds.has(t.plant.id)).length;

  return (
    <div className="px-[18px] pb-6">
      {/* ヘッダー */}
      <div className="mb-2">
        <div className="text-[11px] tracking-[.15em]" style={{ color: "var(--ink2)" }}>
          {currentDateLabel} · {dayLabel}
        </div>
        <h2 className="text-[22px] tracking-[.06em] mt-1" style={{ fontFamily: "var(--font-serif)" }}>
          今日の水やり{" "}
          <span style={{ color: "var(--glaucous)" }}>{pendingCount}株</span>
        </h2>
      </div>

      {/* 天気注記バナー */}
      {weather?.highHumidity && (
        <div
          className="my-3 rounded-[14px] px-[13px] py-[11px] text-[11.5px]"
          style={{
            background: "linear-gradient(90deg,#16222b,#151d24)",
            border: "1px solid #23394a",
            color: "#9cc3d6",
            lineHeight: 1.5,
          }}
        >
          ☔ 今日は湿度が高め。用土の乾きを確認してから水やりを
        </div>
      )}
      {weather?.hotDay && !weather?.highHumidity && (
        <div
          className="my-3 rounded-[14px] px-[13px] py-[11px] text-[11.5px]"
          style={{
            background: "linear-gradient(90deg,#2b1616,#24151d)",
            border: "1px solid #4a2323",
            color: "#d69c9c",
            lineHeight: 1.5,
          }}
        >
          🌡️ 猛暑日 — 夕方の水やり推奨
        </div>
      )}

      {/* すべて完了ボタン */}
      {pendingCount > 0 && (
        <button
          onClick={handleCompleteAll}
          disabled={isPending}
          className="btn-press w-full py-[11px] rounded-[14px] text-[13px] font-bold mb-4 disabled:opacity-60 flex items-center justify-center gap-[7px]"
          style={{
            background: "var(--water)",
            color: "#0d1418",
            border: "none",
          }}
        >
          {isPending && <Spinner size={13} color="#0d1418" />}
          今日の分をすべて完了 ({pendingCount}株)
        </button>
      )}

      {/* 今日の水やり */}
      {todayTargets.length === 0 ? (
        plantsCount === 0 ? (
          // E1: 株が0
          <div className="text-center py-10">
            <p className="text-[14px] mb-2" style={{ color: "var(--ink2)" }}>まだ株がいません</p>
            <p className="text-[11px] mb-5" style={{ color: "var(--ink3)", lineHeight: 1.7 }}>
              ＋から最初の一株を迎えましょう
            </p>
            <Link href="/add"
              className="btn-press inline-block px-[22px] py-[10px] rounded-[14px] text-[12px] font-bold"
              style={{ background: "var(--glaucous)", color: "#10160f" }}>
              株を追加する
            </Link>
          </div>
        ) : (
          // E2: 今日の対象が0
          <div className="text-center py-8">
            <p className="text-[14px] mb-1" style={{ color: "var(--ink2)" }}>今日の水やりはありません 🌿</p>
            {nextScheduled && (
              <p className="text-[11px]" style={{ color: "var(--ink3)" }}>
                次の予定: {nextScheduled.nickname} · {nextScheduled.date}
              </p>
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-[10px]">
          {todayTargets.map((target) => {
            const plant = target.plant as PlantWithData;
            const isDone = completedIds.has(plant.id);
            const isRowPending = pendingIds.has(plant.id);
            return (
              <TaskCard
                key={plant.id}
                target={target}
                isDone={isDone}
                isPending={isRowPending}
                onComplete={handleComplete}
              />
            );
          })}
        </div>
      )}

      {/* 実生トレイ */}
      {seedlingPlants.length > 0 && (
        <>
          <div className="flex justify-between items-baseline mt-4 mb-[9px]">
            <b className="text-[12.5px] tracking-[.08em]">実生トレイ</b>
            <span className="text-[10px]" style={{ color: "var(--ink3)" }}>毎日チェック</span>
          </div>
          <div className="flex flex-col gap-[10px]">
            {seedlingPlants.map((plant) => (
              <SeedlingCard key={plant.id} plant={plant} />
            ))}
          </div>
        </>
      )}

      {/* 休眠・断水中 */}
      {dormantPlants.length > 0 && (
        <>
          <div className="flex justify-between items-baseline mt-4 mb-[9px]">
            <b className="text-[12.5px] tracking-[.08em]">休眠・断水中</b>
            <span className="text-[10px]" style={{ color: "var(--ink3)" }}>{dormantPlants.length}株</span>
          </div>
          <div className="flex flex-col gap-[10px]">
            {dormantPlants.map((plant) => (
              <DormantCard key={plant.id} plant={plant} />
            ))}
          </div>
        </>
      )}

      {/* ストリーク */}
      <div className="flex gap-2 mt-4">
        <div className="flex-1 rounded-[14px] p-[10px] border"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div className="text-[19px]" style={{ fontFamily: "var(--font-serif)", color: "var(--glaucous)" }}>
            {streakCount}日
          </div>
          <div className="text-[9.5px] tracking-[.1em] mt-0.5" style={{ color: "var(--ink2)" }}>
            水やり忘れゼロ継続
          </div>
        </div>
        <div className="flex-1 rounded-[14px] p-[10px] border"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div className="text-[19px]" style={{ fontFamily: "var(--font-serif)", color: "var(--glaucous)" }}>
            {encyclopediaOwned} / {encyclopediaTotal}
          </div>
          <div className="text-[9.5px] tracking-[.1em] mt-0.5" style={{ color: "var(--ink2)" }}>
            図鑑 収集
          </div>
        </div>
      </div>

      <Toast message={toast.msg} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}

// ── タスクカード ─────────────────────────────────────────────────

function TaskCard({
  target,
  isDone,
  isPending,
  onComplete,
}: {
  target: TodayTarget;
  isDone: boolean;
  isPending: boolean;
  onComplete: (id: string) => void;
}) {
  const plant = target.plant as PlantWithData;
  const species = plant.species;

  const sizeLabel: Record<string, string> = {
    seedling: "実生苗", small: "子株", medium: "中株", large: "大株"
  };

  return (
    <div
      className="rounded-[18px] p-3 flex gap-3 items-center border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
        opacity: isDone ? 0.5 : 1,
        transition: "opacity .3s",
      }}
    >
      <PlantThumb
        photoUrl={plant.photo_url}
        category={species.category}
        speciesId={species.id}
        className="w-[58px] h-[58px] flex-none"
        sizes="58px"
      />
      <div className="flex-1 min-w-0">
        <Placard nameJa={plant.nickname} nameScientific={species.name_scientific} />
        <div className="text-[10px] mt-[3px]" style={{ color: "var(--ink2)" }}>
          {sizeLabel[plant.size]}
          {target.isOverdue && (
            <span style={{ color: "var(--water)" }}> · 期日超過</span>
          )}
        </div>
      </div>
      <DoneButton
        plantId={plant.id}
        done={isDone}
        pending={isPending}
        onComplete={onComplete}
      />
    </div>
  );
}

// ── 実生トレイカード ──────────────────────────────────────────────

function SeedlingCard({ plant }: { plant: PlantWithData }) {
  return (
    <div
      className="rounded-[18px] p-3 flex gap-3 items-center border"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <PlantThumb
        photoUrl={plant.photo_url}
        category={plant.species.category}
        speciesId={plant.species.id}
        className="w-[58px] h-[58px] flex-none"
        sizes="58px"
      />
      <div className="flex-1 min-w-0">
        <Placard nameJa={plant.nickname} nameScientific="seedling" />
        <div className="text-[10px] mt-[3px]" style={{ color: "var(--ink2)" }}>
          実生苗 · メモを確認して管理
        </div>
      </div>
    </div>
  );
}

// ── 断水中カード ──────────────────────────────────────────────────

function DormantCard({ plant }: { plant: PlantWithData }) {
  return (
    <div
      className="rounded-[18px] p-3 flex gap-3 items-center border"
      style={{ background: "var(--surface)", borderColor: "var(--line)", opacity: .75 }}
    >
      <PlantThumb
        photoUrl={plant.photo_url}
        category={plant.species.category}
        speciesId={plant.species.id}
        isDormant
        className="w-[58px] h-[58px] flex-none"
        sizes="58px"
      />
      <div className="flex-1 min-w-0">
        <Placard nameJa={plant.nickname} nameScientific={plant.species.name_scientific} isDormant />
        <div className="text-[10px] mt-[3px]" style={{ color: "var(--ink2)" }}>
          {plant.species.dormancy_note ?? "断水中"}
        </div>
      </div>
      <Chip variant="moon">🌙 断水</Chip>
    </div>
  );
}
