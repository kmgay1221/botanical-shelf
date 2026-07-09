/**
 * lib/watering.ts
 * 水やり日計算ロジック（コアロジック）
 *
 * ルール（要件書 §3.4 / 詳細設計 §2 / 第9章凍結仕様）:
 * - 日付処理はすべて Asia/Tokyo に固定（UTC直接比較禁止）
 * - 次回水やり日 = 最新水やり記録の日（JST）+ マスタ間隔[サイズ][記録月]
 * - 月をまたぐ場合は「水やりした月」の間隔を使用
 * - 当月の間隔が null = 断水期間（リマインダー停止）
 * - 水やり記録が0件の株 = 登録日 + 登録月の間隔
 * - 期日超過は当日と同じ「今日やる」扱い（過去分を積み上げない）
 */

import type { Plant, CareLog, WateringIntervals, PlantSize } from "@/types/database";

const JST = "Asia/Tokyo";

/** UTC日時文字列 → JST の YYYY-MM-DD 文字列 */
export function toJSTDateString(utcDateInput: string | Date): string {
  const d = typeof utcDateInput === "string" ? new Date(utcDateInput) : utcDateInput;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: JST }).format(d);
}

/** 今日の JST 日付文字列（YYYY-MM-DD） */
export function todayJST(): string {
  return toJSTDateString(new Date());
}

/** YYYY-MM-DD 文字列 → Date（JST 0:00:00 として扱う） */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** dateStr（YYYY-MM-DD）に days を加算して YYYY-MM-DD を返す */
function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → 月（1〜12） */
function monthOf(dateStr: string): number {
  return parseInt(dateStr.split("-")[1], 10);
}

// ────────────────────────────────────────────────────────────────
// 断水明け判定ヘルパー
// ────────────────────────────────────────────────────────────────

/**
 * 断水明けの月を返す（null→値あり境界）
 * 翌月がnullでない最初の「翌月1日」を dormancy_wake 対象とする
 */
export function getDormancyWakeMonths(
  intervals: WateringIntervals,
  size: PlantSize
): number[] {
  const sizeIntervals = intervals[size];
  const wakeMonths: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const current = sizeIntervals[String(m)];
    const prev = sizeIntervals[String(m === 1 ? 12 : m - 1)];
    if (prev === null && current !== null) {
      wakeMonths.push(m);
    }
  }
  return wakeMonths;
}

// ────────────────────────────────────────────────────────────────
// 次回水やり日の計算
// ────────────────────────────────────────────────────────────────

export type NextWateringResult =
  | { kind: "scheduled"; date: string }
  | { kind: "dormant"; wakeMonth: number | null };

/**
 * 次回水やり日を計算する
 * @param lastWateringDate 最新の水やり記録日（JST YYYY-MM-DD）。なければ null
 * @param registeredAt 株の登録日（YYYY-MM-DD）
 * @param size 株サイズ
 * @param intervals watering_intervals
 */
export function calcNextWateringDate(
  lastWateringDate: string | null,
  registeredAt: string,
  size: PlantSize,
  intervals: WateringIntervals
): NextWateringResult {
  const baseDate = lastWateringDate ?? registeredAt;
  const baseMonth = monthOf(baseDate);
  const sizeIntervals = intervals[size];
  const interval = sizeIntervals[String(baseMonth)];

  if (interval === null) {
    // 断水期間: 明ける月を探す
    const wakeMonths = getDormancyWakeMonths(intervals, size);
    const wakeMonth = wakeMonths.length > 0 ? wakeMonths[0] : null;
    return { kind: "dormant", wakeMonth };
  }

  return { kind: "scheduled", date: addDays(baseDate, interval) };
}

// ────────────────────────────────────────────────────────────────
// 「今日やる」対象の判定
// ────────────────────────────────────────────────────────────────

export interface PlantWithLogs extends Plant {
  care_logs?: CareLog[];
}

export interface TodayTarget {
  plant: PlantWithLogs;
  nextDate: string;
  isOverdue: boolean;
}

/**
 * 今日やる水やり対象を返す
 * - アーカイブ済みは除外
 * - 断水中（当月 null）は除外
 * - 次回水やり日 ≦ 今日(JST) の株
 */
export function getTodayTargets(
  plants: PlantWithLogs[],
  today = todayJST()
): TodayTarget[] {
  const results: TodayTarget[] = [];

  for (const plant of plants) {
    if (plant.archived) continue;
    if (!plant.species) continue;

    const lastWatering = getLastWateringDate(plant.care_logs ?? []);
    const result = calcNextWateringDate(
      lastWatering,
      plant.registered_at,
      plant.size,
      plant.species.watering_intervals
    );

    if (result.kind === "dormant") continue;

    if (result.date <= today) {
      results.push({
        plant,
        nextDate: result.date,
        isOverdue: result.date < today,
      });
    }
  }

  return results;
}

/** care_logs から最新の watering 記録の JST 日付を返す */
export function getLastWateringDate(logs: CareLog[]): string | null {
  const wateringLogs = logs
    .filter((l) => l.action === "watering")
    .sort((a, b) => (b.logged_at > a.logged_at ? 1 : -1));

  if (wateringLogs.length === 0) return null;
  return toJSTDateString(wateringLogs[0].logged_at);
}

// ────────────────────────────────────────────────────────────────
// 断水中かどうかの判定（現在の当月に基づく）
// ────────────────────────────────────────────────────────────────

export function isDormant(
  plant: Plant & { species?: { watering_intervals: WateringIntervals } },
  today = todayJST()
): boolean {
  if (!plant.species) return false;
  const currentMonth = monthOf(today);
  const interval = plant.species.watering_intervals[plant.size][String(currentMonth)];
  return interval === null;
}

// ────────────────────────────────────────────────────────────────
// 断水明け通知対象の判定
// ────────────────────────────────────────────────────────────────

export interface DormancyWakeTarget {
  plant: Plant;
  wakeMonth: number;
}

/**
 * 今日（JST）が断水明け月の1日に該当する株を返す
 */
export function getDormancyWakeTargets(
  plants: (Plant & { species?: { watering_intervals: WateringIntervals } })[],
  today = todayJST()
): DormancyWakeTarget[] {
  const [, monthStr, dayStr] = today.split("-");
  const currentMonth = parseInt(monthStr, 10);
  const currentDay = parseInt(dayStr, 10);

  if (currentDay !== 1) return [];

  return plants
    .filter((p) => !p.archived && p.species)
    .flatMap((plant) => {
      const wakeMonths = getDormancyWakeMonths(plant.species!.watering_intervals, plant.size);
      return wakeMonths.includes(currentMonth)
        ? [{ plant, wakeMonth: currentMonth }]
        : [];
    });
}

// ────────────────────────────────────────────────────────────────
// ストリーク計算
// ────────────────────────────────────────────────────────────────

/**
 * 前日終了時点で期日超過の株が1つもなかった場合に streak を継続
 * （詳細設計 §2.3: cron 実行時に日次判定）
 */
export function calcStreakIncrement(
  plants: PlantWithLogs[],
  yesterday: string
): boolean {
  for (const plant of plants) {
    if (plant.archived) continue;
    if (!plant.species) continue;

    const lastWatering = getLastWateringDate(plant.care_logs ?? []);
    const result = calcNextWateringDate(
      lastWatering,
      plant.registered_at,
      plant.size,
      plant.species.watering_intervals
    );

    if (result.kind === "dormant") continue;
    if (result.date <= yesterday) return false; // 期日超過あり
  }
  return true; // 全株OK
}

// ────────────────────────────────────────────────────────────────
// 肥料対象の判定
// ────────────────────────────────────────────────────────────────

export interface FertilizerTarget {
  plant: Plant;
  dueDate: string;
}

/**
 * 肥料対象かどうかを判定
 * - fertilizer_months に当月が含まれ
 * - 最新 fertilizer 記録から fertilizer_interval_days 経過している
 */
export function isFertilizerDue(
  plant: Plant & { species?: { fertilizer_months: number[] | null; fertilizer_interval_days: number | null } },
  logs: CareLog[],
  today = todayJST()
): boolean {
  if (!plant.species) return false;
  const { fertilizer_months, fertilizer_interval_days } = plant.species;

  if (!fertilizer_months || fertilizer_months.length === 0) return false;
  if (!fertilizer_interval_days) return false;

  const currentMonth = monthOf(today);
  if (!fertilizer_months.includes(currentMonth)) return false;

  const lastFertilizer = logs
    .filter((l) => l.action === "fertilizer")
    .sort((a, b) => (b.logged_at > a.logged_at ? 1 : -1))[0];

  if (!lastFertilizer) return true; // 記録なし → 対象

  const lastDate = toJSTDateString(lastFertilizer.logged_at);
  const dueDate = addDays(lastDate, fertilizer_interval_days);
  return dueDate <= today;
}

// ────────────────────────────────────────────────────────────────
// リズムバー用正規化
// ────────────────────────────────────────────────────────────────

/**
 * 月ごとのバー高さ（0〜100%）を返す
 * height% = minInterval / interval * 100
 * null（断水）は固定 5（低い紫バー）
 */
export function calcRhythmBarHeights(
  intervals: WateringIntervals,
  size: PlantSize
): Array<{ month: number; height: number; isDormant: boolean }> {
  const sizeIntervals = intervals[size];
  const values = Object.values(sizeIntervals).filter((v): v is number => v !== null);
  const minInterval = values.length > 0 ? Math.min(...values) : 1;

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const interval = sizeIntervals[String(month)];
    if (interval === null) {
      return { month, height: 5, isDormant: true };
    }
    const height = Math.round((minInterval / interval) * 100);
    return { month, height, isDormant: false };
  });
}

// ────────────────────────────────────────────────────────────────
// DAY 表示（登録日からの経過日数）
// ────────────────────────────────────────────────────────────────

export function calcDaysSinceRegistration(
  registeredAt: string,
  today = todayJST()
): number {
  const reg = parseDate(registeredAt);
  const tod = parseDate(today);
  return Math.floor((tod.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24));
}
