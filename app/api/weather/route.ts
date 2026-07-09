import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") ?? "35.681";
  const lon = searchParams.get("lon") ?? "139.767";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=Asia%2FTokyo&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json(null);
    const json = await res.json();
    const maxTemp = json?.daily?.temperature_2m_max?.[0] ?? 0;
    const precip = json?.daily?.precipitation_sum?.[0] ?? 0;
    return NextResponse.json({ highHumidity: precip > 0, hotDay: maxTemp >= 33 });
  } catch {
    // E12: 天気API失敗 → null を返す
    return NextResponse.json(null);
  }
}
