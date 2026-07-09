export const dynamic = "force-dynamic";

import { getMyPlants, getProfile, getWeatherNote, getAllSpecies } from "@/lib/data";
import {
  getTodayTargets,
  isDormant,
  todayJST,
  calcDaysSinceRegistration,
  calcNextWateringDate,
  getLastWateringDate,
} from "@/lib/watering";
import { HomeClient } from "./HomeClient";

export default async function HomePage() {
  const [plants, profile, allSpecies] = await Promise.all([
    getMyPlants(),
    getProfile(),
    getAllSpecies(),
  ]);

  const weather = await getWeatherNote(
    profile?.latitude ?? 35.681,
    profile?.longitude ?? 139.767
  ).catch(() => null);

  const today = todayJST();

  // 今日やる対象（seedling 除く）
  const nonSeedling = plants.filter((p) => p.size !== "seedling");
  const todayTargets = getTodayTargets(nonSeedling, today);

  // 実生トレイ
  const seedlingPlants = plants.filter((p) => p.size === "seedling");

  // 断水中（アーカイブ除く・seedling除く）
  const dormantPlants = nonSeedling.filter((p) => isDormant(p, today));

  // ストリーク
  const streakCount = profile?.streak_count ?? 0;

  // 図鑑収集数
  const ownedSpeciesIds = new Set(plants.map((p) => p.species_id));
  const encyclopediaTotal = allSpecies.length;

  // E2: todayTargets が 0 のとき、次の予定（最短の次回日を持つ株）を探す
  let nextScheduled: { nickname: string; date: string } | null = null;
  if (todayTargets.length === 0 && nonSeedling.length > 0) {
    let earliestDate: string | null = null;
    let earliestNickname = "";
    for (const p of nonSeedling) {
      if (isDormant(p, today)) continue;
      const lastW = getLastWateringDate(p.care_logs ?? []);
      const r = calcNextWateringDate(lastW, p.registered_at, p.size, p.species.watering_intervals);
      if (r.kind === "scheduled" && r.date > today) {
        if (!earliestDate || r.date < earliestDate) {
          earliestDate = r.date;
          earliestNickname = p.nickname;
        }
      }
    }
    if (earliestDate) nextScheduled = { nickname: earliestNickname, date: earliestDate };
  }

  // 日付ラベル (JST)
  const dateObj = new Date();
  const currentDateLabel = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(dateObj);

  // 最古の登録日から通算DAY
  const oldestRegisteredAt = plants.reduce<string | null>((acc, p) => {
    if (!acc || p.registered_at < acc) return p.registered_at;
    return acc;
  }, null);
  const dayCount = oldestRegisteredAt
    ? calcDaysSinceRegistration(oldestRegisteredAt, today)
    : 0;

  return (
    <HomeClient
      todayTargets={todayTargets}
      seedlingPlants={seedlingPlants}
      dormantPlants={dormantPlants}
      plantsCount={plants.length}
      nextScheduled={nextScheduled}
      streakCount={streakCount}
      encyclopediaOwned={ownedSpeciesIds.size}
      encyclopediaTotal={encyclopediaTotal}
      weather={weather}
      currentDateLabel={currentDateLabel}
      dayLabel={`DAY ${dayCount}`}
    />
  );
}
