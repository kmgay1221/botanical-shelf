/**
 * species_master の zod スキーマ（seed投入・AI生成レスポンス共通）
 * テスト計画書 A-2 U13〜U18 / A-3 U19〜U21 に対応
 */

import { z } from "zod";

/** 月ごとの水やり間隔: null または 1〜120 の整数 */
const intervalValue = z
  .number()
  .int()
  .min(1)
  .max(120)
  .nullable();

/** 12ヶ月分のオブジェクト */
const monthlyIntervals = z.object({
  "1":  intervalValue,
  "2":  intervalValue,
  "3":  intervalValue,
  "4":  intervalValue,
  "5":  intervalValue,
  "6":  intervalValue,
  "7":  intervalValue,
  "8":  intervalValue,
  "9":  intervalValue,
  "10": intervalValue,
  "11": intervalValue,
  "12": intervalValue,
});

export const wateringIntervalsSchema = z.object({
  seedling: monthlyIntervals,
  small:    monthlyIntervals,
  medium:   monthlyIntervals,
  large:    monthlyIntervals,
});

export const speciesSchema = z.object({
  name_ja:                 z.string().min(1),
  name_scientific:         z.string().nullable().optional(),
  aliases:                 z.array(z.string()).default([]),
  category:                z.enum(["agave", "caudex_shrub", "euphorbia", "houseplant", "succulent_other"]),
  growth_type:             z.enum(["summer", "winter", "evergreen"]),
  watering_intervals:      wateringIntervalsSchema,
  dormancy_note:           z.string().nullable().optional(),
  fertilizer_interval_days: z.number().int().positive().nullable().optional(),
  fertilizer_months:       z.array(z.number().int().min(1).max(12)).nullable().optional(),
  min_temp_celsius:        z.number().nullable().optional(),
  care_notes:              z.string().nullable().optional(),
  confidence:              z.enum(["high", "medium", "low"]).default("high"),
  reference_note:          z.string().nullable().optional(),
});

export type SpeciesInput = z.infer<typeof speciesSchema>;

/** 論理チェック結果 */
export interface ValidationWarning {
  name_ja: string;
  message: string;
}

/**
 * 論理整合性の警告チェック（エラーではなく警告）
 * U16: growth_type=summer かつ 7月null → 警告
 * U17: smallがlargeより長い月 → 警告
 */
export function checkLogicWarnings(species: SpeciesInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const w = species.watering_intervals;

  // U16: 夏型なのに7月が断水
  if (species.growth_type === "summer") {
    for (const size of ["small", "medium", "large"] as const) {
      if (w[size]["7"] === null) {
        warnings.push({
          name_ja: species.name_ja,
          message: `growth_type=summer なのに ${size} の7月が null（断水）です`,
        });
      }
    }
  }

  // 冬型なのに1月が断水
  if (species.growth_type === "winter") {
    for (const size of ["small", "medium", "large"] as const) {
      if (w[size]["1"] === null) {
        warnings.push({
          name_ja: species.name_ja,
          message: `growth_type=winter なのに ${size} の1月が null（断水）です`,
        });
      }
    }
  }

  // U17: small の間隔が large より長い月
  for (let m = 1; m <= 12; m++) {
    const key = String(m) as keyof typeof w.small;
    const sv = w.small[key];
    const lv = w.large[key];
    if (sv !== null && lv !== null && sv > lv) {
      warnings.push({
        name_ja: species.name_ja,
        message: `${m}月: small(${sv}日) > large(${lv}日) — 通常は逆のはずです`,
      });
    }
  }

  return warnings;
}
