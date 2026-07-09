#!/usr/bin/env tsx
/**
 * npm run seed:validate
 * supabase/seed/species.json のバリデーション
 */

import fs from "fs";
import path from "path";
import { speciesSchema, checkLogicWarnings } from "../lib/species-schema";

const SEED_PATH = path.resolve(__dirname, "../supabase/seed/species.json");

function main() {
  if (!fs.existsSync(SEED_PATH)) {
    console.error(`❌ ${SEED_PATH} が見つかりません`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  if (!Array.isArray(raw)) {
    console.error("❌ species.json は配列である必要があります");
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const item of raw) {
    const result = speciesSchema.safeParse(item);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`[${item.name_ja ?? "不明"}] ${issue.path.join(".")} — ${issue.message}`);
      }
    } else {
      const warns = checkLogicWarnings(result.data);
      for (const w of warns) {
        warnings.push(`[${w.name_ja}] ⚠️  ${w.message}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn("\n⚠️  警告:");
    warnings.forEach((w) => console.warn(" ", w));
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} 件のエラーがあります:`);
    errors.forEach((e) => console.error(" ", e));
    process.exit(1);
  }

  console.log(`\n✅ ${raw.length} 種すべてのバリデーションが通過しました（警告: ${warnings.length} 件）`);
}

main();
