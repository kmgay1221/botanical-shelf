"use client";

import { useState } from "react";
import Link from "next/link";
import { PlantThumb } from "@/components/PlantThumb";
import { Placard } from "@/components/Placard";
import { Chip, FilterChip } from "@/components/Chip";
import { RhythmBar } from "@/components/RhythmBar";
import {
  calcNextWateringDate,
  getLastWateringDate,
  isDormant,
  calcDaysSinceRegistration,
  todayJST,
} from "@/lib/watering";
import type { PlantWithData } from "@/lib/data";
import type { SpeciesCategory } from "@/types/database";

const FILTERS = [
  { key: "all",          label: "すべて" },
  { key: "agave",        label: "アガベ" },
  { key: "caudex_shrub", label: "灌木・塊根" },
  { key: "houseplant",   label: "観葉" },
  { key: "seedling",     label: "実生" },
  { key: "dormant",      label: "休眠中" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

interface ShelfClientProps {
  plants: PlantWithData[];
  currentMonth: number;
}

export function ShelfClient({ plants, currentMonth }: ShelfClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const today = todayJST();

  const filtered = plants.filter((plant) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "seedling") return plant.size === "seedling";
    if (activeFilter === "dormant") return isDormant(plant, today);
    return plant.species.category === (activeFilter as SpeciesCategory);
  });

  // E1: 株が0
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
        <p className="text-[14px] mb-2" style={{ color: "var(--ink)" }}>
          まだ株がいません。
        </p>
        <p className="text-[12px] mb-6" style={{ color: "var(--ink2)" }}>
          ＋から最初の一株を迎えましょう
        </p>
        <Link
          href="/add"
          className="btn-press px-6 py-3 rounded-[14px] text-[13px] font-bold"
          style={{ background: "var(--glaucous)", color: "#10160f" }}
        >
          🪴 植物棚に迎える
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] pb-6 pt-3">
      {/* ヘッダー */}
      <div className="eyebrow mb-1">MY COLLECTION</div>
      <h2 className="text-[22px] tracking-[.06em]" style={{ fontFamily: "var(--font-serif)" }}>
        植物棚 <span style={{ color: "var(--glaucous)" }}>{plants.length}株</span>
      </h2>

      {/* フィルタチップ */}
      <div className="flex gap-[6px] mt-3 mb-3 overflow-x-auto pb-1 -mx-[18px] px-[18px]">
        {FILTERS.map(({ key, label }) => (
          <FilterChip
            key={key}
            label={label}
            active={activeFilter === key}
            onClick={() => setActiveFilter(key)}
            variant={key === "dormant" ? "moon" : "default"}
          />
        ))}
      </div>

      {/* 2列グリッド */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-[12px]" style={{ color: "var(--ink3)" }}>
          該当する株はありません
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-[10px]">
          {filtered.map((plant) => (
            <PlantCard key={plant.id} plant={plant} currentMonth={currentMonth} today={today} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── グリッドカード ───────────────────────────────────────────────

function PlantCard({
  plant,
  currentMonth,
  today,
}: {
  plant: PlantWithData;
  currentMonth: number;
  today: string;
}) {
  const { species, care_logs } = plant;
  const dormant = isDormant(plant, today);
  const lastWatering = getLastWateringDate(care_logs);
  const nextResult = calcNextWateringDate(
    lastWatering,
    plant.registered_at,
    plant.size,
    species.watering_intervals
  );

  const dayCount = calcDaysSinceRegistration(plant.registered_at, today);

  // 期日チップ
  let chipContent: React.ReactNode = null;
  if (dormant) {
    chipContent = <Chip variant="moon">🌙 断水中</Chip>;
  } else if (nextResult.kind === "scheduled") {
    const diff = dateDiff(today, nextResult.date);
    if (diff <= 0) {
      chipContent = <Chip variant="water">💧 {diff === 0 ? "今日" : `${Math.abs(diff)}日超過`}</Chip>;
    } else if (diff === 1) {
      chipContent = <Chip variant="water">💧 明日</Chip>;
    } else {
      chipContent = <Chip>あと{diff}日</Chip>;
    }
  }

  return (
    <Link href={`/plants/${plant.id}`}>
      <div
        className="rounded-[18px] p-[9px] border cursor-pointer"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        {/* サムネイル */}
        <div className="relative w-full aspect-square mb-[9px]">
          <div className="absolute top-[6px] left-[6px] z-10 text-[9px] tracking-[.14em] px-[7px] py-[2px] rounded-full"
            style={{ color: "#cfd8d1", background: "rgba(15,20,17,.55)", backdropFilter: "blur(3px)" }}>
            DAY {dayCount}
          </div>
          <PlantThumb
            photoUrl={plant.photo_url}
            category={species.category}
            speciesId={species.id}
            isDormant={dormant}
            className="w-full h-full"
          />
        </div>

        {/* プレート */}
        <Placard
          nameJa={plant.nickname}
          nameScientific={species.name_scientific}
          isDormant={dormant}
        />

        {/* リズムバー */}
        <div className="mt-2">
          <RhythmBar
            intervals={species.watering_intervals}
            size={plant.size}
            currentMonth={currentMonth}
            variant="card"
          />
        </div>
        {dormant && (
          <div className="text-[9px] mt-1" style={{ color: "var(--ink3)" }}>
            {species.growth_type === "winter" ? "冬型 — 夏は断水" : "断水中"}
          </div>
        )}

        {/* 期日チップ */}
        <div className="mt-[7px]">{chipContent}</div>
      </div>
    </Link>
  );
}

function dateDiff(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
