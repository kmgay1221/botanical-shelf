export const dynamic = "force-dynamic";

import { getAllSpecies, getMyPlants } from "@/lib/data";
import { todayJST } from "@/lib/watering";
import { EncyclopediaClient } from "./EncyclopediaClient";

export default async function EncyclopediaPage() {
  const [allSpecies, myPlants] = await Promise.all([getAllSpecies(), getMyPlants()]);
  const today = todayJST();
  const currentMonth = parseInt(today.split("-")[1], 10);

  // アーカイブ含む全所有種のID
  const ownedSpeciesIds = new Set(myPlants.map((p) => p.species_id));

  return (
    <EncyclopediaClient
      allSpecies={allSpecies}
      ownedSpeciesIds={ownedSpeciesIds}
      currentMonth={currentMonth}
    />
  );
}
