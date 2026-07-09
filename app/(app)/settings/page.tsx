export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { getProfile } from "@/lib/data";
import { SettingsClient } from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // iOS 判定（User-Agent ベース）
  const hdrs = await headers();
  const ua = hdrs.get("user-agent") ?? "";
  const isIos = /iPhone|iPad|iPod/.test(ua);

  return <SettingsClient profile={profile} isIos={isIos} />;
}
