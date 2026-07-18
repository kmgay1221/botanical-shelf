/**
 * POST /api/push/test
 *
 * 【一時的な検証用エンドポイント】
 * 朝7時のCronを待たずに、管理者が自分の端末へテスト通知を即時送信できる。
 * push_subscriptions への保存・VAPID鍵・Service Workerのpush受信を
 * 一通り確認できたら削除してよい。
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPush, type PushSubscriptionRow } from "@/lib/push";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { data: subs, error } = await service
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("user_id", user.id);

  if (error) {
    console.error("push test fetch subscriptions:", error);
    return NextResponse.json({ error: "購読の取得に失敗しました" }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json(
      { error: "購読が見つかりません。設定画面で通知をONにしてください" },
      { status: 404 }
    );
  }

  const results: { endpoint: string; ok: boolean }[] = [];
  for (const sub of subs as PushSubscriptionRow[]) {
    const ok = await sendPush(sub, {
      title: "植物棚 🪴",
      body: "テスト通知です。これが届けば設定は正常です",
      tag: "test",
    });
    results.push({ endpoint: sub.endpoint.slice(-16), ok });
    if (!ok) {
      // 410/404 → 無効な購読を削除
      await service.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }

  return NextResponse.json({ ok: true, sent: results.length, results });
}
