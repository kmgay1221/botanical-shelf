import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) {
    // endpoint 未指定 → ユーザーの全購読を削除
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  } else {
    await supabase.from("push_subscriptions").delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
  }

  return NextResponse.json({ ok: true });
}
