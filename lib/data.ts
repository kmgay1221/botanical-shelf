/**
 * Supabase データ取得ヘルパー（Server側）
 */

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { Plant, CareLog, Profile, SpeciesMaster } from "@/types/database";

export type PlantWithData = Plant & {
  species: SpeciesMaster;
  care_logs: CareLog[];
};

/**
 * 一覧（棚/今日/図鑑）で参照する care_logs は直近の水やり・肥料日の算出のみに使う。
 * 全履歴を毎回転送するとリスト画面が重くなるため直近分に絞る。
 * 詳細画面（getPlant）はタイムライン全体・成長ギャラリーで全履歴が必要なので絞らない。
 */
const RECENT_LOGS_LIMIT = 30;

/** 認証ユーザーの全株（アーカイブ除く）を種・記録付きで取得 */
export async function getMyPlants(): Promise<PlantWithData[]> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("plants")
    .select(`
      *,
      species:species_master(*),
      care_logs(*)
    `)
    .eq("owner_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .order("logged_at", { referencedTable: "care_logs", ascending: false })
    .limit(RECENT_LOGS_LIMIT, { referencedTable: "care_logs" });

  if (error) {
    console.error("getMyPlants:", error);
    return [];
  }

  return (data ?? []) as PlantWithData[];
}

/** 特定の株を取得 */
export async function getPlant(plantId: string): Promise<PlantWithData | null> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("plants")
    .select(`
      *,
      species:species_master(*),
      care_logs(*)
    `)
    .eq("id", plantId)
    .eq("owner_id", user.id)
    .single();

  if (error) return null;
  return data as PlantWithData;
}

/** 自分のプロフィール取得 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

/** 全 species_master を取得 */
export async function getAllSpecies(): Promise<SpeciesMaster[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("species_master")
    .select("*")
    .order("name_ja");
  return (data ?? []) as SpeciesMaster[];
}

/** 天気情報取得（Open-Meteo） */
export async function getWeatherNote(
  lat = 35.681,
  lon = 139.767
): Promise<{ highHumidity: boolean; hotDay: boolean } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=Asia%2FTokyo&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const maxTemp = json?.daily?.temperature_2m_max?.[0] ?? 0;
    const precip = json?.daily?.precipitation_sum?.[0] ?? 0;
    return {
      highHumidity: precip > 0,
      hotDay: maxTemp >= 33,
    };
  } catch {
    return null;
  }
}
