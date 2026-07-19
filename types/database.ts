// Supabase テーブル型定義

export type PlantSize = "seedling" | "small" | "medium" | "large";
export type PlantPlacement = "indoor" | "balcony" | "outdoor";
export type CareAction = "watering" | "fertilizer" | "light";
export type SpeciesCategory = "agave" | "caudex_shrub" | "euphorbia" | "houseplant" | "succulent_other";
export type GrowthType = "summer" | "winter" | "evergreen";
export type SpeciesSource = "curated" | "ai_generated";
export type SpeciesConfidence = "high" | "medium" | "low";
export type NotificationKind = "daily" | "dormancy_wake";

// 月ごとの水やり間隔。null = 断水
export type MonthlyIntervals = {
  [month: string]: number | null; // "1" 〜 "12"
};

export type WateringIntervals = {
  seedling: MonthlyIntervals;
  small: MonthlyIntervals;
  medium: MonthlyIntervals;
  large: MonthlyIntervals;
};

export interface Profile {
  id: string;
  display_name: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  notify_enabled: boolean;
  notify_hour: number;
  notify_dormancy_wake: boolean;
  is_admin: boolean;
  streak_count: number;
  created_at: string;
}

export interface SpeciesMaster {
  id: string;
  name_ja: string;
  name_scientific: string | null;
  aliases: string[];
  category: SpeciesCategory;
  growth_type: GrowthType;
  watering_intervals: WateringIntervals;
  dormancy_note: string | null;
  fertilizer_interval_days: number | null;
  fertilizer_months: number[] | null;
  min_temp_celsius: number | null;
  care_notes: string | null;
  source: SpeciesSource;
  confidence: SpeciesConfidence;
  reference_note: string | null;
  created_at: string;
}

export interface Plant {
  id: string;
  owner_id: string;
  species_id: string;
  nickname: string;
  size: PlantSize;
  photo_url: string | null;
  /** 一覧(棚/ホーム)用の軽量サムネイル。未設定時は photo_url をリサイズ表示 */
  photo_thumb_url: string | null;
  registered_at: string;
  placement: PlantPlacement;
  memo: string | null;
  archived: boolean;
  created_at: string;
  // JOIN
  species?: SpeciesMaster;
}

export interface CareLog {
  id: string;
  plant_id: string;
  action: CareAction;
  logged_at: string;
  photo_url: string | null;
  memo: string | null;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  kind: NotificationKind;
  sent_on: string;
  created_at: string;
}
