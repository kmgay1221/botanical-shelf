/**
 * GET /api/cron/hourly-notify
 * 詳細設計 §5 に準拠
 *
 * 【現在の制限】Vercel Hobby プランは Cron が1日1回まで。
 * vercel.json のスケジュールを "0 22 * * *"（UTC 22:00 = JST 翌7:00）に設定しており、
 * 全ユーザーへの通知が朝7時固定になっている。
 * Pro プランへアップグレードすれば "0 * * * *"（毎時）に戻すことで
 * profiles.notify_hour ごとの個別時刻通知が実現できる。
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { todayJST, toJSTDateString, getTodayTargets, getDormancyWakeTargets, calcStreakIncrement } from "@/lib/watering";
import type { PlantWithLogs } from "@/lib/watering";
import type { SpeciesMaster } from "@/types/database";
import { sendPush, type PushSubscriptionRow } from "@/lib/push";

export async function GET(req: NextRequest) {
  // CRON_SECRET 検証
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const today = todayJST();
  const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const currentHour = nowJST.getHours();

  // 前日（ストリーク計算用）
  const yesterdayDate = new Date(nowJST);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toJSTDateString(yesterdayDate);

  let notified = 0;
  let dormancyWakeSent = 0;
  const errors: string[] = [];

  // ① notify_hour が現在時刻と一致 かつ notify_enabled のユーザーを取得
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id, notify_enabled, notify_hour, notify_dormancy_wake, streak_count, latitude, longitude")
    .eq("notify_enabled", true)
    .eq("notify_hour", currentHour);

  if (profilesError) {
    console.error("profiles fetch:", profilesError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  for (const profile of profiles ?? []) {
    try {
      // ② 本日の daily 通知が送信済みかチェック（二重送信防止）
      const { count: alreadySent } = await service
        .from("notification_logs")
        .select("id", { count: "exact" })
        .eq("user_id", profile.id)
        .eq("kind", "daily")
        .eq("sent_on", today);

      if ((alreadySent ?? 0) > 0) continue;

      // ③ ユーザーの株を取得（種・記録付き）
      const { data: plantsData } = await service
        .from("plants")
        .select(`
          *,
          species:species_master(*),
          care_logs(*)
        `)
        .eq("owner_id", profile.id)
        .eq("archived", false);

      const plants: PlantWithLogs[] = (plantsData ?? []).map((p: Record<string, unknown>) => ({
        ...(p as object),
        species: p.species as SpeciesMaster,
        care_logs: (p.care_logs as unknown[]) ?? [],
      })) as PlantWithLogs[];

      // ④ 今日の水やり対象を算出
      const targets = getTodayTargets(plants, today);

      if (targets.length > 0) {
        // ⑤ 天気取得（失敗時は注記なし: E12）
        let weatherNote = "";
        const lat = profile.latitude ?? 35.681;
        const lon = profile.longitude ?? 139.767;
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=Asia%2FTokyo&forecast_days=1`;
          const weatherRes = await fetch(weatherUrl);
          if (weatherRes.ok) {
            const wJson = await weatherRes.json();
            const maxTemp = wJson?.daily?.temperature_2m_max?.[0] ?? 0;
            const precip = wJson?.daily?.precipitation_sum?.[0] ?? 0;
            if (precip > 0) weatherNote = " ☔ 今日は雨です";
            else if (maxTemp >= 33) weatherNote = " 🌞 猛暑日です。早朝に水やりを";
          }
        } catch {
          // E12: 天気API失敗 → 注記なし
        }

        // ⑥ 通知文を組み立てて送信
        const firstPlant = targets[0].plant.nickname;
        const rest = targets.length > 1 ? ` ほか${targets.length - 1}株` : "";
        const body = `今日の水やり: ${firstPlant}${rest}${weatherNote}`;

        // 購読を取得
        const { data: subs } = await service
          .from("push_subscriptions")
          .select("id, endpoint, keys")
          .eq("user_id", profile.id);

        let dailySent = false;
        for (const sub of subs ?? []) {
          const ok = await sendPush(sub as PushSubscriptionRow, {
            title: "植物棚 🪴",
            body,
            tag: "daily",
          });
          if (ok) {
            dailySent = true;
          } else {
            // 410 Gone → 購読削除
            await service.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }

        // ⑦ 通知ログを記録（実際に1件以上送信できた時のみ。
        // 購読が0件/全滅の日に「送信済み」を記録すると、後で購読しても
        // その日は二度と再送されなくなるため）
        if (dailySent) {
          await service.from("notification_logs").insert({
            user_id: profile.id,
            kind: "daily",
            sent_on: today,
          });
          notified++;
        }
      }

      // ⑧ 断水明け通知（notify_dormancy_wake がONのユーザーのみ）
      if (profile.notify_dormancy_wake) {
        const wakeTargets = getDormancyWakeTargets(plants, today);

        for (const { plant } of wakeTargets) {
          // 断水明けログ（重複防止: user_id + 'dormancy_wake' + today ユニーク）
          const { count: wakeAlreadySent } = await service
            .from("notification_logs")
            .select("id", { count: "exact" })
            .eq("user_id", profile.id)
            .eq("kind", "dormancy_wake")
            .eq("sent_on", today);

          if ((wakeAlreadySent ?? 0) > 0) continue;

          const { data: subs } = await service
            .from("push_subscriptions")
            .select("id, endpoint, keys")
            .eq("user_id", profile.id);

          let wakeSent = false;
          for (const sub of subs ?? []) {
            const ok = await sendPush(sub as PushSubscriptionRow, {
              title: "植物棚 🌱",
              body: `${plant.nickname}が目覚めました。様子を見て水やりを再開してください`,
              url: `/plants/${plant.id}`,
              tag: `dormancy-wake-${plant.id}`,
            });
            if (ok) {
              wakeSent = true;
            } else {
              await service.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }

          if (wakeSent) {
            await service.from("notification_logs").insert({
              user_id: profile.id,
              kind: "dormancy_wake",
              sent_on: today,
            });
            dormancyWakeSent++;
          }
        }
      }

      // ⑨ ストリーク日次更新（前日終了時点の判定）
      const streakOk = calcStreakIncrement(plants, yesterday);
      const newStreak = streakOk ? profile.streak_count + 1 : 0;
      await service.from("profiles").update({ streak_count: newStreak }).eq("id", profile.id);

    } catch (e) {
      console.error(`user ${profile.id} error:`, e);
      errors.push(profile.id);
    }
  }

  return NextResponse.json({
    ok: true,
    hour: currentHour,
    today,
    notified,
    dormancyWakeSent,
    errors,
  });
}
