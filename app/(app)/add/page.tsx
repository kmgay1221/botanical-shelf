export const dynamic = "force-dynamic";

import { getAllSpecies, getPlant } from "@/lib/data";
import { todayJST } from "@/lib/watering";
import { createClient } from "@/lib/supabase/server";
import { AddFlow } from "./AddFlow";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [allSpecies, supabase] = await Promise.all([
    getAllSpecies(),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  const editPlant = edit ? await getPlant(edit) : null;
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
