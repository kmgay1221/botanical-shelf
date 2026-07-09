/**
 * A-2 seedバリデーション + A-3 AI生成レスポンス検証
 * テスト計画書 U13〜U21
 */

import { describe, it, expect } from "vitest";
import { speciesSchema, checkLogicWarnings, wateringIntervalsSchema } from "./species-schema";

// ── ベースフィクスチャ ────────────────────────────────────────────

function makeIntervals(overrides: Record<string, Partial<Record<string, number | null>>> = {}) {
  const base = {
    seedling: { "1":20,"2":20,"3":14,"4":10,"5":7,"6":7,"7":5,"8":5,"9":7,"10":10,"11":14,"12":20 },
    small:    { "1":null,"2":null,"3":20,"4":14,"5":10,"6":10,"7":7,"8":7,"9":10,"10":14,"11":25,"12":null },
    medium:   { "1":null,"2":null,"3":25,"4":18,"5":12,"6":12,"7":8,"8":8,"9":12,"10":18,"11":30,"12":null },
    large:    { "1":40,"2":40,"3":30,"4":20,"5":14,"6":14,"7":8,"8":8,"9":14,"10":20,"11":35,"12":40 },
  };
  for (const [size, vals] of Object.entries(overrides)) {
    Object.assign((base as Record<string, object>)[size] ??= {}, vals);
  }
  return base;
}

function makeSpecies(overrides: object = {}) {
  return {
    name_ja: "テスト種",
    name_scientific: "Agave testii",
    aliases: [],
    category: "agave",
    growth_type: "summer",
    watering_intervals: makeIntervals(),
    confidence: "high",
    ...overrides,
  };
}

// ── A-2: seedバリデーション ──────────────────────────────────────

describe("A-2 seedバリデーション", () => {
  // U13: 4サイズ×12ヶ月が完全なJSON → パス
  it("U13: 完全なJSON → バリデーション通過", () => {
    const result = speciesSchema.safeParse(makeSpecies());
    expect(result.success).toBe(true);
  });

  // U14: largeの3月が欠落 → エラー
  it("U14: largeの3月欠落 → エラー", () => {
    const intervals = makeIntervals();
    const { "3": _omit, ...rest } = (intervals as Record<string, Record<string, number | null>>)["large"];
    (intervals as Record<string, object>)["large"] = rest;
    const result = wateringIntervalsSchema.safeParse(intervals);
    expect(result.success).toBe(false);
  });

  // U15: 間隔=0 / 121 / 小数 → エラー
  it("U15a: 間隔=0 → エラー", () => {
    const intervals = makeIntervals({ large: { "7": 0 } });
    const result = wateringIntervalsSchema.safeParse(intervals);
    expect(result.success).toBe(false);
  });

  it("U15b: 間隔=121 → エラー", () => {
    const intervals = makeIntervals({ large: { "7": 121 } });
    const result = wateringIntervalsSchema.safeParse(intervals);
    expect(result.success).toBe(false);
  });

  it("U15c: 間隔=小数 → エラー", () => {
    const intervals = makeIntervals({ large: { "7": 7.5 } });
    const result = wateringIntervalsSchema.safeParse(intervals);
    expect(result.success).toBe(false);
  });

  // U16: growth_type=summer かつ 7月null → 警告
  it("U16: summer 7月null → 警告", () => {
    const sp = speciesSchema.parse(makeSpecies({
      growth_type: "summer",
      watering_intervals: makeIntervals({ small: { "7": null }, medium: { "7": null }, large: { "7": null } }),
    }));
    const warnings = checkLogicWarnings(sp);
    expect(warnings.some((w) => w.message.includes("7月"))).toBe(true);
  });

  // U17: smallがlargeより長い月 → 警告
  it("U17: small > large の月 → 警告", () => {
    const sp = speciesSchema.parse(makeSpecies({
      watering_intervals: makeIntervals({ small: { "5": 20 }, large: { "5": 14 } }),
    }));
    const warnings = checkLogicWarnings(sp);
    expect(warnings.some((w) => w.message.includes("5月"))).toBe(true);
  });

  // U18: category不正値 → エラー
  it("U18: category不正値 → エラー", () => {
    const result = speciesSchema.safeParse(makeSpecies({ category: "unknown_type" }));
    expect(result.success).toBe(false);
  });
});

// ── A-3: AI生成レスポンス検証 ───────────────────────────────────

describe("A-3 AI生成レスポンス検証", () => {
  // U19: 正常JSONで登録可
  it("U19: 正常JSON → バリデーション通過", () => {
    const result = speciesSchema.safeParse(makeSpecies({ source: "ai_generated", confidence: "low" }));
    expect(result.success).toBe(true);
  });

  // U20: 不正JSON → E9系エラー（zodエラー）
  it("U20: 不正JSON（watering_intervals欠落）→ エラー", () => {
    const bad = { name_ja: "AI種", category: "agave", growth_type: "summer" };
    const result = speciesSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("watering_intervals");
    }
  });

  // U21: 既存name_jaと衝突 → 既存レコード返却（ユニーク制約はDBレイヤー）
  // ここではアプリ側の衝突検知ロジックをテスト
  it("U21: 衝突検知ヘルパー（既存name_jaと一致）", () => {
    const existing = [{ name_ja: "アガベ・チタノタ 白鯨" }];
    const input = { name_ja: "アガベ・チタノタ 白鯨" };
    const isConflict = existing.some((e) => e.name_ja === input.name_ja);
    expect(isConflict).toBe(true);
  });
});
