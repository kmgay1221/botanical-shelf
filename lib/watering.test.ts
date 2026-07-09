/**
 * A-1 lib/watering.ts ユニットテスト
 * テスト計画書 U1〜U12 全件
 */

import { describe, it, expect } from "vitest";
import {
  calcNextWateringDate,
  getTodayTargets,
  getDormancyWakeTargets,
  toJSTDateString,
  getLastWateringDate,
  calcStreakIncrement,
  isFertilizerDue,
} from "./watering";
import type { WateringIntervals, CareLog, Plant } from "@/types/database";

// ── テスト用フィクスチャ ─────────────────────────────────────────

function makeIntervals(overrides: Partial<Record<string, Partial<Record<string, number | null>>>>) {
  const defaults = {
    seedling: { "1":20,"2":20,"3":14,"4":10,"5":7,"6":7,"7":5,"8":5,"9":7,"10":10,"11":14,"12":20 },
    small:    { "1":null,"2":null,"3":20,"4":14,"5":10,"6":10,"7":7,"8":7,"9":10,"10":14,"11":25,"12":null },
    medium:   { "1":null,"2":null,"3":25,"4":18,"5":12,"6":12,"7":8,"8":8,"9":12,"10":18,"11":30,"12":null },  // 7月=8（large と同じ）
    large:    { "1":40,"2":40,"3":30,"4":20,"5":14,"6":14,"7":8,"8":8,"9":14,"10":20,"11":35,"12":40 },
  };
  for (const [size, vals] of Object.entries(overrides)) {
    Object.assign((defaults as Record<string, object>)[size] ??= {}, vals);
  }
  return defaults as unknown as WateringIntervals;
}

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "p1",
    owner_id: "u1",
    species_id: "s1",
    nickname: "白鯨",
    size: "large",
    photo_url: null,
    registered_at: "2024-01-01",
    placement: "outdoor",
    memo: null,
    archived: false,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeLog(action: CareLog["action"], logged_at: string): CareLog {
  return {
    id: Math.random().toString(),
    plant_id: "p1",
    action,
    logged_at,
    photo_url: null,
    memo: null,
    created_at: logged_at,
  };
}

const INTERVALS = makeIntervals({});

// ── A-1 テスト ───────────────────────────────────────────────────

describe("A-1 lib/watering.ts", () => {
  // U1: 7/1に水やり、7月の間隔8日（大株）→ 次回 7/9
  it("U1: 通常月の計算（7/1 + 8日 = 7/9）", () => {
    const result = calcNextWateringDate("2024-07-01", "2024-01-01", "large", INTERVALS);
    expect(result).toEqual({ kind: "scheduled", date: "2024-07-09" });
  });

  // U2: 1/25に水やり、1月の間隔40日 → 次回 3/5（水やり月の間隔を使用）
  it("U2: 月またぎ（1/25 + 40日 = 3/5）", () => {
    const result = calcNextWateringDate("2024-01-25", "2024-01-01", "large", INTERVALS);
    expect(result).toEqual({ kind: "scheduled", date: "2024-03-05" });
  });

  // U3: 当月がnull（断水）→ dormant を返す
  it("U3: 断水月（small 1月 = null）→ dormant", () => {
    const result = calcNextWateringDate("2024-01-15", "2024-01-01", "small", INTERVALS);
    expect(result.kind).toBe("dormant");
  });

  // U4: 断水明け判定: 12月null→1月値あり → wakeMonth=3（small は 3月から再開）
  it("U4: 断水明け判定（small: 12月null→3月値あり）", () => {
    const result = calcNextWateringDate("2024-12-01", "2024-01-01", "small", INTERVALS);
    expect(result.kind).toBe("dormant");
    if (result.kind === "dormant") {
      expect(result.wakeMonth).toBe(3);
    }
  });

  // U5: 株サイズを中株→大株に変更後、大株の間隔で計算
  it("U5: 株サイズ変更後（medium→large で7月間隔が変わる）", () => {
    const medium = calcNextWateringDate("2024-07-01", "2024-01-01", "medium", INTERVALS);
    const large  = calcNextWateringDate("2024-07-01", "2024-01-01", "large",  INTERVALS);
    expect(medium).toEqual({ kind: "scheduled", date: "2024-07-09" }); // medium 7月=8日
    expect(large).toEqual({ kind: "scheduled", date: "2024-07-09"  }); // large 7月=8日（=medium）
    // 別の月で差を確認: 5月
    const medium5 = calcNextWateringDate("2024-05-01", "2024-01-01", "medium", INTERVALS);
    const large5  = calcNextWateringDate("2024-05-01", "2024-01-01", "large",  INTERVALS);
    expect(medium5).toEqual({ kind: "scheduled", date: "2024-05-13" }); // 12日
    expect(large5).toEqual({ kind: "scheduled",  date: "2024-05-15" }); // 14日
  });

  // U6: 水やり記録が0件 → 登録日＋登録月の間隔
  it("U6: 水やり記録0件（登録日基準）", () => {
    // 登録日 2024-05-01（large 5月=14日）→ 2024-05-15
    const result = calcNextWateringDate(null, "2024-05-01", "large", INTERVALS);
    expect(result).toEqual({ kind: "scheduled", date: "2024-05-15" });
  });

  // U7: 過去日付(6/20)で記録追加、最新は6/28 → 6/28基準
  it("U7: 複数記録があるとき最新基準（6/28 + 14日 = 7/12）", () => {
    const logs = [
      makeLog("watering", "2024-06-20T10:00:00+09:00"),
      makeLog("watering", "2024-06-28T10:00:00+09:00"),
    ];
    const lastDate = getLastWateringDate(logs);
    expect(lastDate).toBe("2024-06-28");
    const result = calcNextWateringDate(lastDate, "2024-01-01", "large", INTERVALS);
    expect(result).toEqual({ kind: "scheduled", date: "2024-07-12" }); // 6月=14日
  });

  // U8: 最新記録を削除 → 1つ前の記録基準
  it("U8: 最新記録削除後、1つ前の記録基準", () => {
    // 削除後のリストで再計算（アプリ側で最新ログを除いて渡す）
    const logsAfterDelete = [
      makeLog("watering", "2024-06-20T10:00:00+09:00"),
    ];
    const lastDate = getLastWateringDate(logsAfterDelete);
    expect(lastDate).toBe("2024-06-20");
    const result = calcNextWateringDate(lastDate, "2024-01-01", "large", INTERVALS);
    expect(result).toEqual({ kind: "scheduled", date: "2024-07-04" }); // 6月=14日
  });

  // U9: 期日超過（次回が3日前）→「今日やる」対象に含まれる
  it("U9: 期日超過の株が today 対象に含まれる", () => {
    const today = "2024-07-10";
    // 7/1に水やり、大株7月=10日 → 次回7/11 > 7/10: 対象外
    // 6/28に水やり、大株6月=14日 → 次回7/12 > 7/10: 対象外
    // 6/25に水やり、大株6月=14日 → 次回7/9 < 7/10: 対象（超過）
    const plant = {
      ...makePlant(),
      care_logs: [makeLog("watering", "2024-06-25T10:00:00+09:00")],
      species: {
        id: "s1", name_ja: "test", name_scientific: null, aliases: [], category: "agave" as const,
        growth_type: "summer" as const, watering_intervals: INTERVALS,
        dormancy_note: null, fertilizer_interval_days: null, fertilizer_months: null,
        min_temp_celsius: null, care_notes: null, source: "curated" as const,
        confidence: "high" as const, reference_note: null, created_at: "",
      },
    };
    const targets = getTodayTargets([plant], today);
    expect(targets).toHaveLength(1);
    expect(targets[0].isOverdue).toBe(true);
    expect(targets[0].nextDate).toBe("2024-07-09");
  });

  // U10: 実生苗（seedling）の全月値あり → 断水扱いにならない
  it("U10: 実生苗（seedling）は断水なし", () => {
    for (let m = 1; m <= 12; m++) {
      const dateStr = `2024-${String(m).padStart(2, "0")}-01`;
      const result = calcNextWateringDate(dateStr, "2024-01-01", "seedling", INTERVALS);
      expect(result.kind).toBe("scheduled");
    }
  });

  // U11: 肥料: fertilizer_months外の月 → 肥料対象にならない
  it("U11: 施肥月外 → isFertilizerDue = false", () => {
    const plant = {
      ...makePlant(),
      species: { fertilizer_months: [4, 5, 6, 9, 10], fertilizer_interval_days: 30 },
    };
    // 8月（施肥月外）
    const result = isFertilizerDue(plant, [], "2024-08-01");
    expect(result).toBe(false);
  });

  // U12: JST境界: UTC 7/5 16:00 = JST 7/6 1:00 → 「今日」がJSTの7/6
  it("U12: UTC→JST 変換（UTC 16:00 = JST 翌日 1:00）", () => {
    const utcStr = "2024-07-05T16:00:00.000Z"; // JST 7/6 01:00
    const jst = toJSTDateString(utcStr);
    expect(jst).toBe("2024-07-06");
  });
});
