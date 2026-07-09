import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "不正な購読情報です" }, { status: 400 });
  }

  // 既存の購読を endpoint で upsert（同じエンドポイントは上書き）
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("push subscribe:", error);
    return NextResponse.json({ error: "購読の保存に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
