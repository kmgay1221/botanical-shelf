export const dynamic = "force-dynamic";

import { getMyPlants } from "@/lib/data";
import { todayJST } from "@/lib/watering";
import { ShelfClient } from "./ShelfClient";

export default async function ShelfPage() {
  const plants = await getMyPlants();
  const today = todayJST();
  const currentMonth = parseInt(today.split("-")[1], 10);

  return <ShelfClient plants={plants} currentMonth={currentMonth} />;
}
