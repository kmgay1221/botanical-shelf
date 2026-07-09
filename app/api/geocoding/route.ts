import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name");
  if (!name?.trim()) return NextResponse.json({ results: [] });

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=ja&format=json`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ results: [] });

    const json = await res.json();
    const results = (json.results ?? []).map((r: {
      name: string;
      admin1?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
    }) => ({
      name: r.admin1 ? `${r.name}（${r.admin1}）` : r.name,
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
