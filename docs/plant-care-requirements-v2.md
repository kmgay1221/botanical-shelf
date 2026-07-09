# 植物水やり管理PWA 要件定義書 v2

> v1からの主な変更点:
> - 水やり間隔の算出を「季節係数による自動計算」から「マスタ直参照方式」に全面変更
> - マスタは 種 × 株サイズ（子株/中株/大株）× 月（1〜12月）の水やり間隔を直接保持
> - 環境プロファイルの係数計算を廃止（置き場所は雨スキップ判定のみに使用）
> - カテゴリに「灌木・塊根植物（コーデックス）」を追加、冬型/夏型の生育型を管理
> - 種マスタの初期データはDeep Researchで作成（別紙プレイブック参照）
> - AI写真診断・写真からの間隔再計算はPhase 2に据え置き

## 1. プロジェクト概要

### 1.1 目的
アガベ（チタノタ系流通品種含む）・灌木・塊根植物（コーデックス）・ユーフォルビア・一般観葉植物の水やり管理を行うPWA。
中核は「種 × 株サイズ × 月」の水やり間隔マスタであり、リマインダーはこのマスタに厳密に従う。

### 1.2 前提条件
- 収益化しない（課金・広告なし）。利用者は身内・友人の数名〜十数名
- ストア配信せずPWAとして利用（iOS 16.4+ / Android、ホーム画面追加）
- 運用コストは無料枠内（AI APIの従量課金のみ許容）
- 栽培環境の基準: 日本・関西（大阪近郊）、鉢植え、水はけの良い用土

### 1.3 スコープ外（実装しない）
- カレンダーUI、オーバーレイカメラ・タイムラプス
- 温湿度の手動記録、剪定記録、グループ一括記録、購入価格・親株子株管理
- 季節係数・環境係数による間隔の自動補正計算（マスタ直参照のため不要）
- 課金機能

---

## 2. 技術スタック（v1から変更なし）

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14+ (App Router) + TypeScript + Tailwind CSS、PWA対応 |
| ホスティング | Vercel（無料枠、Vercel Cron） |
| BaaS | Supabase（Auth / PostgreSQL / Storage / Edge Functions） |
| 認証 | Supabase Auth Magic Link＋許可メールリスト |
| プッシュ通知 | Web Push API（VAPID） |
| 気象データ | Open-Meteo API（無料・キー不要） |
| AI | Gemini API または Claude API（種プロファイルのオンデマンド生成、Phase 2の写真診断） |

---

## 3. 機能要件

### 3.1 認証・ユーザー管理（v1と同じ）
- Magic Linkログイン、`ALLOWED_EMAILS` による招待制
- RLSで自分の植物のみ操作可能
- プロフィール: 表示名、地域（緯度経度）、通知設定

### 3.2 植物登録（植物棚）
登録項目:
- 植物名（ニックネーム）
- 種（species_masterから検索選択。なければAIオンデマンド生成 → 3.5.3）
- **株サイズ**: 実生苗 / 子株 / 中株 / 大株（マスタの間隔参照キー。基準は下記）
  - 実生苗: 播種当年〜1年程度（断水耐性が低く別管理）
  - 子株: 鉢2.5号（直径7.5cm）以下 目安
  - 中株: 3〜5号
  - 大株: 6号以上
  - 株サイズは後から変更可能（植え替え・成長時にユーザーが更新）
- 写真1枚、登録日
- 置き場所: 室内 / ベランダ・軒下 / 屋外 ※表示・メモ用途（天気による自動スキップは行わない）
- 任意メモ欄（日照・用土などは自由記入。計算には使わない）
- 一覧はカード形式（写真・名前・次回水やり予定日・クイック水やりボタン）、アーカイブ機能あり

### 3.3 ケア記録（v1と同じ）
- アクション: 水やり / 肥料 / 照射 の3種
- 各記録に写真1枚・メモを任意添付、1タップ記録、履歴タイムライン表示

### 3.4 リマインダー（マスタ直参照方式）

#### 3.4.1 次回水やり日の計算
```
次回水やり日 = 最終水やり日 + マスタ間隔（種ID, 株サイズ, 当月）
```

- マスタ間隔は `species_master.watering_intervals[size][month]` を直接参照。係数計算は一切行わない
- 間隔が月をまたぐ場合（例: 1月20日に水やり、1月の間隔30日 → 次回2月19日）は、**水やりした日の月の間隔**を使用する（シンプルさ優先。厳密な日割按分はしない）
- 当月の値が `null` の場合は**断水期間**: リマインダーを停止し、植物カードに「断水期間中（〜○月）」と表示。断水明けの月の1日に「断水明け。様子を見て水やりを再開してください」と通知
- 株サイズを変更した場合、次回計算から新サイズの間隔を使用

#### 3.4.2 天気情報の表示（補助機能。スケジュールは一切変更しない）
- 雨による通知スキップ機能は実装しない（利用者は基本的に室内・軒下管理のため。2026-07-06決定）
- 天気は参考情報の注記のみ: 湿度が高い日（降水あり or 湿度80%以上）は通知とホームに「今日は湿度が高め。用土の乾きを確認してから水やりを」と添える
- 猛暑日（最高気温33°C以上）は「夕方の水やり推奨」を添える
- 予定日の変更・スキップ・前倒しは行わない（マスタが正）

#### 3.4.3 通知配信（v1と同じ）
- Vercel Cron を毎時実行。各ユーザーが設定した通知時刻（デフォルト朝7:00、1時間単位で選択可）に合致したユーザーのみに、当日対象をまとめて1通送信
- 送信履歴を notification_logs に記録し、同日・同ユーザー・同種別の二重送信を防止
- アプリ内「今日やるリスト」を通知のフォールバックとして常設
- 肥料: マスタに施肥間隔・施肥期間があれば水やり通知に同梱

### 3.5 植物種マスタ（本アプリの心臓部）

#### 3.5.1 マスタが保持するデータ
種ごとに以下を保持:
- 和名/流通名、学名、別名（流通クローン名。例: SAD＝南アフリカダイヤモンド）
- カテゴリ: `agave` / `caudex_shrub`（灌木・塊根） / `euphorbia` / `houseplant` / `succulent_other`
- 生育型: `summer`（夏型） / `winter`（冬型） / `evergreen`（通年型）
- **watering_intervals**: 株サイズ4区分（実生苗/子株/中株/大株） × 月12区分の間隔（日数、null=断水）
  ```json
  {
    "small":  {"1": null, "2": null, "3": 21, "4": 14, "5": 10, "6": 7, "7": 5, "8": 5, "9": 7, "10": 14, "11": 21, "12": null},
    "medium": {"1": null, "2": null, "3": 25, "4": 18, "5": 12, "6": 8, "7": 7, "8": 7, "9": 10, "10": 18, "11": 25, "12": null},
    "large":  {"1": 35,  "2": 35,  "3": 30, "4": 21, "5": 14, "6": 10, "7": 8, "8": 8, "9": 12, "10": 21, "11": 30, "12": 35}
  }
  ```
- 断水期間の補足（例: 「最低気温5°C以下で完全断水」）
- 施肥間隔（日）と施肥期間（対象月の配列）
- 耐寒温度（°C）、取り込み目安
- ケアノート（水やりの流儀: 例「用土が完全に乾いてからさらに2〜3日待つ」）
- source: `curated`（Deep Research＋検証済み） / `ai_generated`（アプリ内オンデマンド生成）
- confidence: high / medium / low
- 出典メモ（curatedのみ）

#### 3.5.2 マスタ層（curated）— Deep Researchで作成
- 対象: アガベ（チタノタ/オテロイ系流通品種含む）、灌木・塊根（センナ・メリディオナリス、オペルクリカリア・パキプス、ブルセラ属、フォークイエリア属、パキポディウム属ほか）、ユーフォルビア、定番観葉植物
- 作成手順・プロンプトは別紙「マスタ作成プレイブック」に従う
- 生成JSONを管理者が検証 → `supabase/seed/species.json` に配置 → seedスクリプトで投入

#### 3.5.3 オンデマンド生成層（マスタにない種）
- 種検索でヒットしない場合「AIに調べてもらう」ボタンを表示
- Edge FunctionがAI APIを呼び、3.5.1と同一スキーマ（株サイズ×月別込み）で生成
- プレビュー確認 → 登録で `source='ai_generated'` として保存、全ユーザーで再利用
- 詳細画面に「AI生成データ」バッジ表示。流通名は学名・基準種に解決してから生成するようプロンプトで指示（例: 「シーザー」→ Agave titanota 'Caesar'、不明ならチタノタ基準種の値に準拠し confidence: low）
- レート制限: 生成10回/日/ユーザー

#### 3.5.4 マスタ管理画面（管理者のみ）
- species_masterの一覧・編集UI（月別間隔テーブルをグリッド編集できる簡易画面）
- 管理者フラグは profiles.is_admin で制御
- ※工数を抑えたい場合、MVPではSupabase Table Editorでの直接編集で代替可（その場合この画面はPhase 2へ）

### 3.6 Phase 2（MVP完成後）
- AI写真診断: 写真＋種名＋株サイズ＋最終水やり日から「水不足/過湿/問題なし/病害疑い」を判定
- 写真・実績に基づく個体別間隔の提案（マスタ値を個体ごとに上書きする仕組みはこの段階で導入）
- マスタ管理画面（3.5.4をMVPで見送った場合）

---

## 4. データモデル（PostgreSQL / Supabase）

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  latitude numeric,
  longitude numeric,
  location_name text,
  notify_enabled boolean default true,
  notify_hour int default 7,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table species_master (
  id uuid primary key default gen_random_uuid(),
  name_ja text not null,                -- 和名・流通名
  name_scientific text,
  aliases jsonb default '[]',           -- ["SAD","南アフリカダイヤモンド"]
  category text not null check (category in
    ('agave','caudex_shrub','euphorbia','houseplant','succulent_other')),
  growth_type text not null check (growth_type in ('summer','winter','evergreen')),
  watering_intervals jsonb not null,    -- {"small":{"1":null,...,"12":null},"medium":{...},"large":{...}}
  dormancy_note text,
  fertilizer_interval_days int,
  fertilizer_months jsonb,              -- [4,5,6,9,10]
  min_temp_celsius numeric,
  care_notes text,
  source text not null default 'ai_generated' check (source in ('curated','ai_generated')),
  confidence text default 'high' check (confidence in ('high','medium','low')),
  reference_note text,
  created_at timestamptz default now()
);

create table plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  species_id uuid not null references species_master(id),
  nickname text not null,
  size text not null check (size in ('seedling','small','medium','large')),
  photo_url text,
  registered_at date default current_date,
  placement text not null check (placement in ('indoor','balcony','outdoor')),
  memo text,
  archived boolean default false,
  created_at timestamptz default now()
);

create table care_logs (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  action text not null check (action in ('watering','fertilizer','light')),
  logged_at timestamptz not null default now(),
  photo_url text,
  memo text,
  created_at timestamptz default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz default now()
);
```

- RLS: plants / care_logs / push_subscriptions はownerのみ全操作。species_masterは全認証ユーザー読み取り可、insertはEdge Function経由、update/deleteはis_adminのみ
- **watering_intervalsのバリデーション**をアプリ側で必須実装: 4サイズ（seedling/small/medium/large）×12ヶ月のキーが揃っていること、値はnullまたは1〜120の整数であることをzod等で検証（seed投入時・AI生成時の両方）
- 次回水やり日の計算関数は `lib/watering.ts` に一元化し、以下のユニットテストを必須とする:
  - 通常月の計算 / 月またぎ / 断水月（null）でのリマインダー停止 / 断水明け通知判定 / 株サイズ変更後の再計算 / 過去日付・記録編集削除後の再計算

---

## 5. 画面一覧

| # | 画面 | 主な要素 |
|---|---|---|
| 1 | ログイン | Magic Link送信 |
| 2 | ホーム（今日やるリスト） | 本日対象カード・1タップ完了・雨スキップ表示・断水明け案内 |
| 3 | 植物棚 | 全植物カード（写真/名前/次回予定日/断水中バッジ）・追加ボタン |
| 4 | 植物登録/編集 | 種検索（→AI生成フロー）・株サイズ選択・置き場所 |
| 5 | 植物詳細 | 写真・種のケアノート・月別間隔の表示（今月の間隔を強調）・3アクション記録・履歴 |
| 6 | 記録入力モーダル | アクション/日時/写真/メモ |
| 7 | 設定 | 通知ON/OFF・時刻・地域・ホーム画面追加ガイド |
| 8 | マスタ管理（管理者） | species一覧・月別間隔グリッド編集 ※MVPで省略可 |

---

## 6. 非機能要件（v1と同じ＋追記）

- PWA: manifest / Service Worker / iOS向け「ホーム画面に追加」ガイドバナー必須
- 画像はクライアント側で圧縮してからアップロード
- AI API呼び出しはEdge Function経由に限定、レート制限あり
- 環境変数: `ALLOWED_EMAILS`, `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, Supabase各キー
- **watering計算とマスタバリデーションのユニットテストをCIで実行**（この2つがアプリの信頼性の核）

---

## 7. 開発フェーズ

### Phase 1（MVP）
1. Supabaseセットアップ（スキーマ・RLS・Storage）
2. 認証（Magic Link＋許可リスト）
3. species_masterのseed投入の仕組み（JSONバリデーション＋投入スクリプト）
4. **マスタデータ作成（別紙プレイブックに従いDeep Research→検証→投入）** ※開発と並行可
5. 植物CRUD（種選択・株サイズ・置き場所）
6. 水やり日計算ロジック `lib/watering.ts` ＋ユニットテスト
7. ケア記録＋履歴タイムライン
8. 今日やるリスト画面
9. 種のAIオンデマンド生成フロー（Edge Function）
10. PWA化＋Web Push＋Vercel Cron通知
11. Open-Meteo連携（雨スキップ・猛暑注記）

### Phase 2
12. AI写真診断
13. 個体別間隔の上書き機能
14. マスタ管理画面（MVPで省略した場合）

---

## 8. 追補: UI/UX確定による追加要件（v2.1 / 2026-07-06確定）

モックアップ（docs/plant-ui-mockup-full.html）で確定したデザイン・機能を正式要件とする。UIの見た目仕様は docs/DESIGN.md に従うこと。

### 8.1 画面構成の確定
- ボトムナビ5タブ: 今日（ホーム）/ 植物棚 / 追加 / 図鑑 / 設定
- ホームは「今日やるリスト」型で確定。セクション順: 天気注記バナー（湿度高め/猛暑の該当日のみ）→「すべて完了」ボタン → 今日の水やり → 実生トレイ → 休眠・断水中 → ストリーク/図鑑サマリー
- 植物棚はグリッド表示（2列カード）で確定。カテゴリ絞り込みチップ（すべて/アガベ/灌木・塊根/観葉/実生/休眠中）
- 追加フローは3ステップ: ①種検索 → ②育て方確認（AI生成時のみ。マスタヒット時はスキップ可）→ ③株情報入力

### 8.2 追加機能（すべてPhase 1に含める）
1. **図鑑**: カテゴリ別に species_master 全種をグリッド表示。所有株（アーカイブ含む）の種は「収集済み」としてカラー表示、未収集はシルエット＋名前のみ。収集率バー表示。セルから種の月別リズムとケアノートを閲覧可能。新規テーブル不要（plants × species_master から導出）
2. **年間水やりリズムバー**（署名要素）: 12ヶ月の間隔を高さの異なるバーで表示（間隔が短い＝バーが高い）。当月をアクセント色でハイライト。断水月は低い紫のバー。植物棚カード・株詳細・AI生成プレビュー・図鑑で共通コンポーネント化
3. **ストリーク**: 「水やり忘れゼロ継続日数」= 予定日を過ぎて未記録の株が1つもない状態の連続日数。care_logsから導出
4. **成長ギャラリー**: care_logsの写真付き記録から、最初の写真と最新の写真を並べて比較表示（DAY表示付き）
5. **DAY表示**: 登録日からの経過日数を株カード・詳細に表示
6. **断水明け通知**: 休眠明け月の1日に「（株名）が目覚めました」を通知。設定でON/OFF可
7. **水やり完了演出**: 完了ボタンタップで水紋（リップル）アニメーション。prefers-reduced-motion では無効化
8. **写真プレースホルダー**: 写真未登録の株はカテゴリ別の種イラスト（SVG）を表示。モックのSVG生成ロジックを流用

### 8.3 記録モーダルの確定仕様
ボトムシート形式。アクション切替（水やり/肥料/照射）→ 日時（デフォルト現在、変更可）→ 写真（任意）→ メモ（任意）→ 保存。保存ボタンのラベルはアクションに連動（例:「水やりを記録」）

### 8.4 実生トレイ
size=seedling の株はホームで独立セクション「実生トレイ」に表示。複数株をまとめて1レコードで管理できるよう、ニックネームに「×12」等の表記を許容（機能としての一括管理は実装しない。Phase 2検討）

---

## 9. 仕様確定事項（実装前レビュー / 2026-07-06 凍結）

実装前レビューで確定した12項目。本章は第3〜8章に優先する。

1. **記録の編集・削除**: 自分のケア記録は編集・削除可能。編集/削除後は次回水やり日を再計算する
2. **過去日付の記録**: 許容。次回計算は常に「その株の最新の水やり日時」を基準とする
3. **植物の削除**: アーカイブ（既定）と完全削除の両方を提供。完全削除は「株名の入力による二重確認」を必須とし、関連するケア記録・写真（Storage含む）をすべて連鎖削除する
4. **水やり完了の操作**: 株ごとの完了ボタンに加え、ホーム上部に「今日の分をすべて完了」ボタンを設置。タップで当日対象全株に水やり記録を一括作成（確認ダイアログあり）。同一株への同日2回目の記録は「今日は記録済みです。もう一度記録しますか？」の確認を挟む
5. **通知時刻**: ユーザーごとに1時間単位で選択可（デフォルト朝7:00）。Cronは毎時実行し、当該時刻のユーザーにのみ送信
6. **雨スキップ**: 実装しない。天気は湿度・猛暑の注記表示のみ（3.4.2改訂済み）
7. **地域デフォルト**: 東京。設定画面で変更可能
8. **通知の二重送信防止**: notification_logs テーブルで同日・同ユーザー・同種別（daily / dormancy_wake）の送信済みを判定
9. **タイムゾーン**: 全計算・表示を Asia/Tokyo に固定
10. **データ分離**: ユーザーごとに完全分離（RLS）。各ユーザーは自分の植物・記録・写真のみ閲覧・操作可能。species_master（種の育て方）のみ全ユーザー共有。図鑑の収集状況は各自の所有株から個別に算出
11. **腰水管理**: Phase 2へ。Phase 1の実生苗は通常の間隔管理＋メモで対応
12. **写真**: クライアント圧縮を長辺1080px・目標300KB以下に設定。1株あたり50枚を上限とし、超過時は「古い写真を削除してから追加してください」とブロック（自動削除はしない）

### 9.1 追加スキーマ（第4章に追加するSQL）

```sql
-- 通知送信ログ（二重送信防止）
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  kind text not null check (kind in ('daily','dormancy_wake')),
  sent_on date not null,
  created_at timestamptz default now(),
  unique (user_id, kind, sent_on)
);

-- 種名の重複防止（AI生成の同時実行対策。登録時に既存ヒットで再利用）
alter table species_master add constraint species_master_name_ja_key unique (name_ja);
```

- plants の完全削除: `on delete cascade` は care_logs に設定済み。Storage上の写真削除はアプリ側で実装すること
