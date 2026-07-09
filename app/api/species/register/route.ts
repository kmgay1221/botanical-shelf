import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speciesSchema } from "@/lib/species-schema";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { species } = await req.json();
  const validated = speciesSchema.safeParse(species);
  if (!validated.success) {
    return NextResponse.json({ error: "不正なデータです" }, { status: 400 });
  }

  const data = { ...validated.data, source: "ai_generated" as const, aliases: validated.data.aliases ?? [] };

  // E10: name_ja 重複チェック → 既存レコードを返す
  const { data: existing } = await supabase
    .from("species_master")
    .select("*")
    .eq("name_ja", data.name_ja)
    .single();

  if (existing) {
    return NextResponse.json({ species: existing, conflict: true });
  }

  const { data: inserted, error } = await supabase
    .from("species_master")
    .insert(data)
    .select()
    .single();

  if (error) {
    // unique 制約で衝突した場合も既存を返す（E10）
    if (error.code === "23505") {
      const { data: fallback } = await supabase
        .from("species_master")
        .select("*")
        .eq("name_ja", data.name_ja)
        .single();
      return NextResponse.json({ species: fallback, conflict: true });
    }
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ species: inserted });
}
