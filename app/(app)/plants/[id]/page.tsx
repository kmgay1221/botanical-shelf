export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getPlant } from "@/lib/data";
import { todayJST } from "@/lib/watering";
import { createClient } from "@/lib/supabase/server";
import { PlantDetailClient } from "./PlantDetailClient";

export default async function PlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plant = await getPlant(id);
  if (!plant) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = todayJST();
  const currentMonth = parseInt(today.split("-")[1], 10);

  return (
    <PlantDetailClient
      plant={plant}
      currentMonth={currentMonth}
      userId={user?.id ?? ""}
    />
  );
}
