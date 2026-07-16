import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { speciesSchema } from "@/lib/species-schema";
import { todayJST } from "@/lib/watering";

// Vercel タイムアウトを60秒に延長（デフォルト10秒では Gemini 応答に不足）
export const maxDuration = 60;

const RATE_LIMIT = 10; // 1日あたりの最大生成回数

const SYSTEM_PROMPT = `あなたは多肉植物・コーデックス・観葉植物の栽培に精通した園芸リサーチャーです。
植物の水やり管理アプリのマスタデータを作成します。

# 栽培環境の前提
- 地域: 日本・関西（大阪近郊）
- 鉢植え。水はけの良い培養土
- 水やり定義: 鉢底から流れ出るまでたっぷり与える1回

# 株サイズの定義
- seedling（実生苗）: 播種当年〜1年。断水耐性が極めて低い。冬も断水にしない種が多い
- small（子株）: 2.5号以下
- medium（中株）: 3〜5号
- large（大株）: 6号以上

# 調査・判断のルール
1. 月別（1〜12月）の間隔を日数の整数で出す。完全断水すべき月はnullとする
2. 子株は大株より間隔が短いのが原則
3. 生育型（summer/winter/evergreen）を必ず判定
4. 関西の気候を織り込む
5. 流通名は学名・基準種に解決してから調査
6. 断言できない場合は安全側（やや乾かし気味）の値を選ぶ

# 出力形式
以下のJSON1件のみを出力（前置き・解説文は不要）:
{
  "name_ja": "植物の和名・流通名",
  "name_scientific": "学名",
  "aliases": ["別名"],
  "category": "agave|caudex_shrub|euphorbia|houseplant|succulent_other",
  "growth_type": "summer|winter|evergreen",
  "watering_intervals": {
    "seedling": {"1":...,"2":...,...,"12":...},
    "small":    {"1":...,"2":...,...,"12":...},
    "medium":   {"1":...,"2":...,...,"12":...},
    "large":    {"1":...,"2":...,...,"12":...}
  },
  "dormancy_note": "断水期間の補足",
  "fertilizer_interval_days": 30,
  "fertilizer_months": [4,5,6,9,10],
  "min_temp_celsius": 0,
  "care_notes": "水やりの流儀",
  "confidence": "high|medium|low",
  "reference_note": "調査根拠"
}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "種名を入力してください" }, { status: 400 });

  // レート制限チェック（1日10回）
  const today = todayJST();
  const service = createServiceClient();
  const { count } = await service
    .from("ai_generation_logs")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00+09:00`)
    .lte("created_at", `${today}T23:59:59+09:00`);

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "本日の生成回数上限（10回）に達しました" },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI APIキーが設定されていません" }, { status: 500 });

  // Gemini API 呼び出し（429 時は10秒待って1回リトライ）
  const prompt = `${SYSTEM_PROMPT}\n\n# 調査対象\n${query}`;
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
  const GEMINI_BODY = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
  });

  async function callGemini(): Promise<Response> {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: GEMINI_BODY,
    });
    if (res.status === 429) {
      // レート制限 → 10秒待ってリトライ
      await new Promise((r) => setTimeout(r, 10000));
      return fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: GEMINI_BODY,
      });
    }
    return res;
  }

  try {
    const res = await callGemini();

    if (res.status === 429) {
      return NextResponse.json(
        { error: "AIが混み合っています。しばらく待ってからもう一度お試しください（1分程度）" },
        { status: 429 }
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Gemini API error: ${res.status}`, body);
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // JSONを抽出（マークダウンコードブロック ```json ... ``` にも対応）
    const stripped = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSONが見つかりませんでした");

    const parsed = JSON.parse(match[0]);
    const validated = speciesSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("AI生成JSONバリデーション失敗:", validated.error);
      return NextResponse.json({ error: "生成データの形式が不正でした。もう一度お試しください" }, { status: 422 });
    }

    return NextResponse.json({ species: validated.data });
  } catch (e) {
    console.error("AI生成エラー:", e);
    return NextResponse.json({ error: "生成に失敗しました。もう一度お試しください" }, { status: 500 });
  }
}
