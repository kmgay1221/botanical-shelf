import webPush from "web-push";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? "";
const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

if (vapidPublic && vapidPrivate) {
  webPush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** true: 送信成功（購読は維持） / false: 購読が無効（410/404 → 呼び出し側で削除） */
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify({ ...payload, url: payload.url ?? "/home" })
    );
    return true;
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return false; // 無効な購読
    console.error("push send error:", e);
    return true; // その他のエラーは購読は残す
  }
}
