#!/usr/bin/env tsx
/**
 * npm run seed:import
 * supabase/seed/species.json を species_master テーブルに投入
 * バリデーション通過後のみ実行。name_ja でupsert（source='curated'）
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { speciesSchema } from "../lib/species-schema";

const SEED_PATH = path.resolve(__dirname, "../supabase/seed/species.json");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ 環境変数 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定してください");
    process.exit(1);
  }

  if (!fs.existsSync(SEED_PATH)) {
    console.error(`❌ ${SEED_PATH} が見つかりません`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  if (!Array.isArray(raw)) {
    console.error("❌ species.json は配列である必要があります");
    process.exit(1);
  }

  // バリデーション（エラーがあれば中止）
  const errors: string[] = [];
  const validated: ReturnType<typeof speciesSchema.parse>[] = [];

  for (const item of raw) {
    const result = speciesSchema.safeParse(item);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`[${item.name_ja ?? "不明"}] ${issue.path.join(".")} — ${issue.message}`);
      }
    } else {
      validated.push(result.data);
    }
  }

  if (errors.length > 0) {
    console.error(`❌ バリデーションエラーが ${errors.length} 件あります。投入を中止します:`);
    errors.forEach((e) => console.error(" ", e));
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let success = 0;
  let failed = 0;

  for (const species of validated) {
    const { error } = await supabase
      .from("species_master")
      .upsert(
        {
          ...species,
          source: "curated",
          aliases: species.aliases ?? [],
        },
        { onConflict: "name_ja" }
      );

    if (error) {
      console.error(`  ❌ ${species.name_ja}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✅ ${species.name_ja}`);
      success++;
    }
  }

  console.log(`\n完了: ${success} 件投入, ${failed} 件失敗`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
