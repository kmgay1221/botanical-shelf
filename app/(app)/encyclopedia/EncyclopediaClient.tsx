"use client";

import { useState } from "react";
import { PlantThumb } from "@/components/PlantThumb";
import { RhythmBar } from "@/components/RhythmBar";
import { FilterChip } from "@/components/Chip";
import { BottomSheet } from "@/components/BottomSheet";
import type { SpeciesMaster, SpeciesCategory } from "@/types/database";

const CATEGORY_FILTERS: { key: SpeciesCategory | "all"; label: string }[] = [
  { key: "all",          label: "すべて" },
  { key: "agave",        label: "アガベ" },
  { key: "caudex_shrub", label: "灌木・塊根" },
  { key: "euphorbia",    label: "ユーフォルビア" },
  { key: "houseplant",   label: "観葉" },
];

const CATEGORY_LABEL: Record<SpeciesCategory, string> = {
  agave: "アガベ",
  caudex_shrub: "灌木・塊根",
  euphorbia: "ユーフォルビア",
  houseplant: "観葉植物",
  succulent_other: "その他多肉",
};

interface EncyclopediaClientProps {
  allSpecies: SpeciesMaster[];
  ownedSpeciesIds: Set<string>;
  currentMonth: number;
}

export function EncyclopediaClient({
  allSpecies,
  ownedSpeciesIds,
  currentMonth,
}: EncyclopediaClientProps) {
  const [activeCategory, setActiveCategory] = useState<SpeciesCategory | "all">("all");
  const [sheetSpecies, setSheetSpecies] = useState<SpeciesMaster | null>(null);

  const filtered = allSpecies.filter((s) =>
    activeCategory === "all" ? true : s.category === activeCategory
  );

  // 収集率（フィルタ後）
  const filteredOwned = filtered.filter((s) => ownedSpeciesIds.has(s.id)).length;
  const collectionPct = filtered.length > 0 ? (filteredOwned / filtered.length) * 100 : 0;

  // カテゴリ別収集数
  const categoryCount = (cat: SpeciesCategory) => {
    const catSpecies = allSpecies.filter((s) => s.category === cat);
    const catOwned = catSpecies.filter((s) => ownedSpeciesIds.has(s.id)).length;
    return `${catOwned}/${catSpecies.length}`;
  };

  return (
    <div className="px-[18px] pb-6 pt-3">
      {/* ヘッダー */}
      <div className="eyebrow mb-1">ENCYCLOPEDIA</div>
      <h2 className="text-[22px] tracking-[.06em]" style={{ fontFamily: "var(--font-serif)" }}>
        図鑑
      </h2>

      {/* カテゴリチップ */}
      <div className="flex gap-[6px] mt-3 mb-3 overflow-x-auto pb-1 -mx-[18px] px-[18px]">
        {CATEGORY_FILTERS.map(({ key, label }) => (
          <FilterChip
            key={key}
            label={key === "all" ? label : `${label} ${key === activeCategory ? "" : categoryCount(key as SpeciesCategory)}`}
            active={activeCategory === key}
            onClick={() => setActiveCategory(key)}
          />
        ))}
      </div>

      {/* 収集率バー */}
      <div className="rounded-[14px] px-[13px] py-[10px] border mb-3"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="flex justify-between text-[11px] mb-[6px]" style={{ color: "var(--ink2)" }}>
          <span>{activeCategory === "all" ? "全図鑑" : CATEGORY_LABEL[activeCategory as SpeciesCategory]} 収集率</span>
          <span>{filteredOwned} / {filtered.length}種</span>
        </div>
        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "#26302a" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${collectionPct}%`,
              background: "linear-gradient(90deg, var(--glaucous), #7ba98d)",
              transition: "width .4s ease",
            }}
          />
        </div>
      </div>

      {/* 3列グリッド */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-[12px]" style={{ color: "var(--ink3)" }}>
          まだ登録されている種がありません
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((species) => {
            const isOwned = ownedSpeciesIds.has(species.id);
            return (
              <div
                key={species.id}
                onClick={() => setSheetSpecies(species)}
                className="rounded-[14px] px-[6px] py-[8px] text-center relative border cursor-pointer"
                style={{ background: "var(--surface)", borderColor: "var(--line)" }}
              >
                {isOwned && (
                  <span className="absolute top-[5px] right-[6px] text-[8.5px] tracking-[.08em]"
                    style={{ color: "var(--glaucous)" }}>
                    ✓ 収集
                  </span>
                )}
                <div
                  className="w-full aspect-square rounded-[10px] mb-[6px] overflow-hidden"
                  style={{
                    filter: isOwned ? "none" : "brightness(.28) grayscale(1)",
                  }}
                >
                  <PlantThumb
                    photoUrl={null}
                    category={species.category}
                    speciesId={species.id}
                    className="w-full h-full"
                  />
                </div>
                <div
                  className="text-[10.5px] leading-tight"
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: isOwned ? "var(--ink)" : "var(--ink3)",
                  }}
                >
                  {species.name_ja.length > 8
                    ? species.name_ja.slice(0, 7) + "…"
                    : species.name_ja}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 種情報ボトムシート */}
      <BottomSheet
        open={!!sheetSpecies}
        onClose={() => setSheetSpecies(null)}
        title={sheetSpecies?.name_ja ?? ""}
      >
        {sheetSpecies && (
          <div>
            {sheetSpecies.name_scientific && (
              <p className="text-[11px] italic mb-3" style={{ color: "var(--ink2)" }}>
                {sheetSpecies.name_scientific}
              </p>
            )}
            <div className="flex gap-2 mb-4">
              <span className="text-[10px] px-[9px] py-[3px] rounded-full border"
                style={{ color: "var(--ink2)", borderColor: "var(--line)" }}>
                {CATEGORY_LABEL[sheetSpecies.category]}
              </span>
              <span className="text-[10px] px-[9px] py-[3px] rounded-full border"
                style={{ color: "var(--ink2)", borderColor: "var(--line)" }}>
                {sheetSpecies.growth_type === "summer" ? "夏型" : sheetSpecies.growth_type === "winter" ? "冬型" : "通年型"}
              </span>
            </div>
            <h4 className="text-[11px] tracking-[.1em] mb-[10px]" style={{ color: "var(--ink2)" }}>
              年間水やりリズム（中株）
            </h4>
            <RhythmBar
              intervals={sheetSpecies.watering_intervals}
              size="medium"
              currentMonth={currentMonth}
              variant="detail"
              note={sheetSpecies.care_notes}
            />
            {sheetSpecies.dormancy_note && (
              <p className="text-[11px] mt-3" style={{ color: "var(--ink2)", lineHeight: 1.6 }}>
                {sheetSpecies.dormancy_note}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
