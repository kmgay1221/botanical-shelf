export const dynamic = "force-dynamic";

import { getAllSpecies, getPlant } from "@/lib/data";
import { todayJST } from "@/lib/watering";
import { getAuthUser } from "@/lib/supabase/server";
import { AddFlow } from "./AddFlow";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [allSpecies, user, editPlant] = await Promise.all([
    getAllSpecies(),
    getAuthUser(),
    edit ? getPlant(edit) : Promise.resolve(null),
  ]);
  const today = todayJST();
  const currentMonth = parseInt(today.split("-")[1], 10);

  return (
    <AddFlow
      allSpecies={allSpecies}
      editPlant={editPlant}
      currentMonth={currentMonth}
      userId={user?.id ?? ""}
    />
  );
}
