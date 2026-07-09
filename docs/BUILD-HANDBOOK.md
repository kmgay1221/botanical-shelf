# 植物棚 完成までの全手順書（BUILD HANDBOOK）

この1冊の通りに進めれば、アプリ「植物棚」が完成してスマホで使える状態になります。
`▶ コピペ` と書かれた枠は、そのままClaude Codeに貼り付けるプロンプトです。上から順に実行してください。

**必要なファイル（この手順書含めて7点セット）**
1. `BUILD-HANDBOOK.md`（本書）
2. `plant-care-requirements-v2.md`（要件定義書。第8章UI追補・第9章仕様凍結まで含む）
3. `plant-care-detail-design.md`（詳細設計書。画面遷移・状態定義・例外系・API設計）
4. `plant-care-test-plan.md`（テスト計画書。リリース判定基準）
5. `DESIGN.md`（デザイン仕様書）
6. `plant-care-master-playbook.md`（マスタ作成プレイブック）
7. `plant-ui-mockup-full.html`（確定モックアップ。見た目の正）

**全体の流れ**
```
PHASE 0  アカウント準備（済んでいれば飛ばす）        …30分
PHASE 1  プロジェクト作成・資料配置                  …10分
PHASE 2  土台構築（雛形・DB・認証）                  …1セッション
PHASE 3  コアロジック（水やり計算・seed基盤）        …1セッション
PHASE 4  マスタデータ作成（Deep Research）★並行可   …1〜2時間＋検証
PHASE 5  画面実装（全10画面）                        …2〜3セッション
PHASE 6  AI生成・通知・天気注記                      …1〜2セッション
PHASE 7  総合テスト → デプロイ → スマホ導入          …1セッション
PHASE 8  友人招待・運用                              …随時
```

---

## PHASE 0. アカウント準備

以前の手順書（PART A/B）で完了済みならこのPHASEは飛ばしてください。未了のものだけ:

- [ ] **Supabase**: https://supabase.com → GitHubでサインイン → New project（Region: Tokyo）→ Project Settings > API から `Project URL` / `anon public` / `service_role` の3つをメモ
- [ ] **Vercel**: https://vercel.com → GitHubで登録（Hobbyプラン）
- [ ] **Gemini APIキー**: https://aistudio.google.com → Get API key → キーをメモ
- [ ] **Node.js v18以上**: ターミナルで `node --version`。無ければ https://nodejs.org のLTS版
- [ ] **Claude Code**: `claude --version` で確認。無ければ `curl -fsSL https://claude.ai/install.sh | bash`（Mac）
- [ ] **GitHubアカウント**（Vercel連携に使用）

---

## PHASE 1. プロジェクト作成・資料配置

1. ターミナルで作業フォルダを作成:
```bash
cd ~/Desktop
mkdir botanical-shelf && cd botanical-shelf
mkdir docs
```
2. 5点セットのファイルを `docs/` フォルダに入れる（Finderでドラッグ&ドロップ）
3. フォルダ構成がこうなっていればOK:
```
botanical-shelf/
└── docs/
    ├── BUILD-HANDBOOK.md
    ├── plant-care-requirements-v2.md
    ├── plant-care-detail-design.md
    ├── plant-care-test-plan.md
    ├── DESIGN.md
    ├── plant-care-master-playbook.md
    └── plant-ui-mockup-full.html
```
4. `claude` と打ってClaude Codeを起動

---

## PHASE 2. 土台構築

### ▶ コピペ 2-1（計画確認）
```
docs/ フォルダ内の6つのmdファイルと plant-ui-mockup-full.html を読んでください。
これから「植物棚」という植物水やり管理PWAを作ります。
- 要件: docs/plant-care-requirements-v2.md（第9章の仕様凍結事項が最優先）
- 内部設計: docs/plant-care-detail-design.md（画面遷移・状態定義・例外系E1〜E16・API設計に従う）
- テスト: docs/plant-care-test-plan.md のA項目を自動テスト対象とする
- デザイン: docs/DESIGN.md と docs/plant-ui-mockup-full.html を正とし、見た目を忠実に再現する
- 技術: Next.js 14+ App Router / TypeScript / Tailwind CSS / Supabase / PWA / Vercel
まず全体を要約し、本手順書のPHASE 2〜7に対応する実装計画を提示してください。実装はまだ始めないでください。
```
→ 計画を読んで、要件とズレがないか確認。問題なければ次へ。

### ▶ コピペ 2-2（雛形作成）
```
計画を承認します。まずプロジェクトの雛形を作ってください:
1. Next.js (App Router, TypeScript, Tailwind) をこのフォルダ直下に初期化
2. PWA対応の下地（manifest.json、Service Worker、アイコンは仮でOK）
3. DESIGN.mdのカラートークンとフォント（next/font/googleでShippori Mincho, Zen Kaku Gothic New）をTailwind設定とglobals.cssに反映
4. .env.local.example を作成（必要な環境変数の一覧をコメント付きで）
5. .gitignore に .env.local が含まれることを確認
完了したら npm run dev での確認方法を教えてください。
```
→ 指示どおり `npm run dev` → http://localhost:3000 が開けばOK。

### ▶ コピペ 2-3（DBスキーマ）
```
docs/plant-care-requirements-v2.md 第4章と第9章9.1のSQLをもとに、Supabase用のマイグレーションSQLを1本にまとめて出力してください。含めるもの:
- 全テーブル（profiles, species_master, plants, care_logs, push_subscriptions, notification_logs）と species_master の name_ja ユニーク制約
- RLSポリシー（要件第4章の方針どおり: 本人のみ操作、species_masterは全員読み取り・admin編集）
- profiles を auth.users 作成時に自動生成するトリガー
- Storageバケット（plant-photos）の作成と、本人のみアップロード可のポリシー
私がSupabaseのSQL Editorに貼って実行します。
```
→ 出てきたSQLをコピー → ブラウザでSupabase → 左メニュー **SQL Editor** → **New query** → 貼り付け → **Run**。「Success」と出ればOK。エラーが出たら全文をClaude Codeに貼る。

### `.env.local` の設定
プロジェクト直下に `.env.local` を作り（`.env.local.example` をコピー）、以下を記入:
```
NEXT_PUBLIC_SUPABASE_URL=（SupabaseのProject URL）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public）
SUPABASE_SERVICE_ROLE_KEY=（service_role ※秘密）
GEMINI_API_KEY=（Geminiのキー）
ALLOWED_EMAILS=あなたのメール（友人は後で追加）
```
（VAPIDキーはPHASE 6で追加します）

### ▶ コピペ 2-4（認証）
```
Supabase AuthのMagic Linkログインを実装してください。
- ログイン画面はモックの「ログイン」画面を忠実に再現（ロゴのアガベロゼットSVG含む）
- ALLOWED_EMAILS（カンマ区切り）にあるメールのみログインリンクを送信。それ以外は「このアプリは招待制です」と表示
- ログイン後はホームへ。未ログインはログインへリダイレクト
- SupabaseダッシュボードのAuth設定で必要な作業（Site URLの設定など）があれば、その手順も教えてください
```
→ 案内に従いSupabase側の設定 → 自分のメールでログインできることを確認。

---

## PHASE 3. コアロジック

### ▶ コピペ 3-1（水やり計算）
```
lib/watering.ts に水やり日計算ロジックを実装し、ユニットテストを書いてください。
仕様は要件書3.4節と詳細設計書§2（状態定義・今日やる判定・ストリーク・断水明け）に厳密に従うこと。
日付処理は詳細設計書§6の通りAsia/Tokyo固定で正規化すること。
テストは docs/plant-care-test-plan.md の A-1（U1〜U12）を全件実装し、npm test でパスさせてください。
```
→ `npm test` が全部緑になることを確認。

### ▶ コピペ 3-2（seed基盤）
```
species_master のseed投入基盤を作ってください:
1. docs/plant-care-master-playbook.md STEP 2 のバリデーションスクリプト（zod使用、4サイズ×12ヶ月チェック、生育型と断水月の整合警告、サイズ逆転警告）
2. supabase/seed/species.json を読み、バリデーション→エラー0件なら name_ja でupsert投入するスクリプト（source='curated'）
3. package.json に npm run seed:validate と npm run seed:import を追加
動作確認用のダミー2種でテストしてください。
```

---

## PHASE 4. マスタデータ作成（Deep Research）★PHASE 5と並行OK

作業場所はClaude Codeではなく **Claude.ai（リサーチ機能）または Gemini Deep Research** です。

1. `docs/plant-care-master-playbook.md` を開く
2. **STEP 1の【共通プロンプト】＋【カテゴリ別ブロック①アガベ】** を繋げて投入 → 出力JSONを `agave.json` として保存
3. 同様に **②灌木・塊根** → `caudex.json`、**③ユーフォルビア＋多肉** → `euphorbia.json`、**④観葉植物** → `houseplant.json`
4. プレイブック STEP 3 の目視サニティチェック（15分。特にアガベ大株の真夏7〜10日、亀甲竜の夏断水、実生の断水なし）
5. Claude Codeに戻って:

### ▶ コピペ 4-1
```
Deep Researchで生成した agave.json / caudex.json / euphorbia.json / houseplant.json を docs/seed-raw/ に置きました。
4ファイルを結合して supabase/seed/species.json を作り、npm run seed:validate を実行してください。
エラーと警告を一覧で見せてください。修正が必要なものは私が判断します。
```
→ エラー0件になったら `npm run seed:import` で投入。SupabaseのTable Editorで species_master に入っていることを確認。

---

## PHASE 5. 画面実装

### ▶ コピペ 5-1（共通部品）
```
DESIGN.md §5 のコアコンポーネントを components/ に実装してください:
Placard（ミュージアムプレート）/ RhythmBar（年間水やりリズムバー。カード用16pxと詳細用64pxの2サイズ、当月ハイライト、断水月の低い紫バー）/ PlantThumb(写真 or カテゴリ別イラストSVGプレースホルダー、休眠時のグレースケール、DAYバッジ) / Chip / ボタン類 / BottomNav（5タブ）。
イラストSVGはモックHTML内の agave() 関数のロジックを移植してください。
Storybook等は不要。確認用に /dev/components ページで一覧表示してください。
```
→ http://localhost:3000/dev/components で見た目がモックと揃っているか確認。

### ▶ コピペ 5-2（ホーム＋棚）
```
ホーム画面と植物棚画面を実装してください。モックの「ホーム」「植物棚」タブを忠実に再現:
- ホーム: 日付/DAY → 「今日の水やり n株」→ 天気注記バナー（湿度高め/猛暑の該当日のみ。詳細設計書3.4.2）→「今日の分をすべて完了」ボタン（確認ダイアログ→一括記録、E4）→ タスクカード（1タップ完了、リップル演出、同日2回目は確認E3、reduced-motion対応）→ 実生トレイ → 休眠・断水中 → ストリーク/図鑑サマリー
- 植物棚: 絞り込みチップ（すべて/アガベ/灌木・塊根/観葉/実生/休眠中）→ 2列グリッドカード（サムネ/プレート/リズムバー/期日チップ）→ 詳細へ遷移
- 今日の対象判定・ストリーク計算は lib/watering.ts を使用
```

### ▶ コピペ 5-3(詳細＋記録)
```
株詳細画面と記録ボトムシートを実装してください。モックの「株の詳細」「記録モーダル」を忠実に再現:
- 詳細: ヒーロー写真(DAY・お迎え日バッジ) → プレート＋タグ → 年間リズムパネル(大・今月の間隔とケアノート文) → 3アクションボタン → 成長ギャラリー(最初と最新の写真比較) → 記録タイムライン
- 記録: アクション切替セグメント / 日時(デフォルト現在・変更可) / 写真アップロード(圧縮は詳細設計書§6: 長辺1080px・300KB以下・50枚上限E8) / メモ / アクション連動の保存ボタン
- 記録の編集・削除（E5: 削除後の次回日再計算）と、株のアーカイブ/完全削除（E6: 株名入力の二重確認、記録・Storage写真の連鎖削除）も実装
```

### ▶ コピペ 5-4（追加フロー）
```
株の追加フロー3ステップを実装してください。モックの「追加①②③」を忠実に再現:
- ①種検索: name_ja / aliases / name_scientific を対象にインクリメンタル検索。ヒットは「マスタ収録」表示。見つからない場合の「AIに調べてもらう」導線（機能自体はPHASE 6で接続するので今はプレースホルダー）
- ③株情報: 写真アップロード（未設定時プレースホルダー説明文）/ ニックネーム / 株サイズ4区分セグメント（説明文付き）/ 置き場所3択（屋外の雨スキップ説明）/ メモ / 「植物棚に迎える」
- マスタヒットから直接③へ、AI生成後は②（プレビュー）を経て③へ、の遷移
```

### ▶ コピペ 5-5（図鑑＋設定）
```
図鑑画面と設定画面を実装してください。モックの「図鑑」「設定」を忠実に再現:
- 図鑑: カテゴリチップ（収集数/総数表示）→ 収集率バー → 3列グリッド。所有株（アーカイブ含む）の種は収集済み（カラー＋✓収集）、未収集はシルエット。セルタップで種の月別リズムとケアノートをボトムシート表示
- 設定: プロフィール / 水やり通知トグル / 通知時刻 / 地域（市区町村検索→緯度経度保存） / 断水明け通知トグル / マスタデータ管理（is_adminのみ表示、まずはSupabase Table Editorへの案内でOK） / iOSホーム画面追加ガイド / ログアウト
```

→ ここまでで自分の株を登録し、水やり記録が一通り回ることをローカルで確認。

---

## PHASE 6. AI生成・通知・天気

### ▶ コピペ 6-1（AIオンデマンド生成）
```
種のAIオンデマンド生成を実装してください（要件書3.5.3）:
- Supabase Edge Function（またはNext.jsのAPI Route。シンプルな方を選んで理由を説明）でGemini APIを呼び、4サイズ×12ヶ月のJSONを生成
- プロンプトには docs/plant-care-master-playbook.md の【共通プロンプト】の栽培前提・判断ルールを流用し、流通名→学名解決、不明時はconfidence low を指示
- 生成結果をzodでバリデーション → 追加②プレビュー画面（サイズ切替でリズム表示が変わる）→「この内容で登録」で source='ai_generated' として保存
- レート制限: 1ユーザー10回/日
```

### ▶ コピペ 6-2（通知＋天気）
```
プッシュ通知と天気連動を実装してください。仕様は詳細設計書§4・§5に厳密に従うこと:
1. VAPIDキーの生成手順を教えてください（web-push使用）。生成後 .env.local と Vercel に設定します
2. Service WorkerでのWeb Push受信、設定画面での購読ON/OFF（拒否・未対応時はE13）
3. /api/cron/hourly-notify: 毎時実行。notify_hourが一致するユーザーへ当日対象を1通送信。notification_logsで二重送信防止、対象0件は送らない、Open-Meteoの湿度・猛暑注記を付与（API失敗時E12）、断水明け通知、ストリーク日次更新、410購読の掃除
4. vercel.json にCron設定（"0 * * * *"）とCRON_SECRET検証
5. 地域設定（東京デフォルト、Open-Meteo Geocodingで市区町村検索）
6. ローカルでのテスト送信方法を教えてください
```
→ 案内に従いVAPIDキーを `.env.local` に追記、テスト通知が届くことを確認。

---

## PHASE 7. 総合テスト → デプロイ → スマホ導入

### ▶ コピペ 7-1（総合チェック）
```
リリース前チェックをお願いします:
1. npm run build が通ること、npm test 全件パス（テスト計画書A項目U1〜U21）
2. docs/plant-care-test-plan.md のB（結合）とD（デザイン受け入れ）を私が手動実施するので、Eのテストデータ投入スクリプトを用意し、B・Dの確認手順を画面ごとに案内してください
3. 要件書（第3・8・9章）と詳細設計書の例外系E1〜E16の実装漏れを突き合わせて列挙
4. Lighthouse（モバイル）でPWA要件とパフォーマンスを確認し、問題があれば修正
```
→ 指摘が出たら「すべて修正してください」で潰し込み。

### ▶ コピペ 7-2（GitHubへ）
```
このプロジェクトをGitHubのprivateリポジトリ botanical-shelf としてpushする手順を教えてください。gitの初期化からコマンドを順に。
```

### Vercelデプロイ（ブラウザ作業）
1. https://vercel.com → **Add New > Project** → `botanical-shelf` をImport
2. **Environment Variables** に `.env.local` の全項目を登録（1つでも漏れると動きません）
3. **Deploy** → 発行されたURL（`https://botanical-shelf-xxx.vercel.app`）を開いて動作確認
4. SupabaseのAuth設定の Site URL / Redirect URL を本番URLに更新（手順が不明ならClaude Codeに聞く）
5. Vercelダッシュボードで Cron Jobs が有効になっているか確認

### スマホ導入（iPhone）
1. SafariでVercelのURLを開く → ログイン
2. 共有ボタン → **「ホーム画面に追加」**
3. ホーム画面のアイコンから起動 → 設定画面で通知をON → 翌朝7時に通知が来れば完成 🎉

---

## PHASE 8. 友人招待・運用

- **招待**: Vercelの Environment Variables で `ALLOWED_EMAILS` に友人のメールを追記 → Redeploy → URLを共有し、ホーム画面追加まで案内
- **マスタの手直し**: Supabase → Table Editor → species_master → watering_intervals のJSONを直接編集（全員に即反映）
- **種の追加**: アプリ内のAI生成で随時。まとまった追加はプレイブックのDeep Research→seed再実行
- **Phase 2（次回開発）**: AI写真診断 / 個体別間隔の上書き / マスタ管理画面。着手時は「要件書3.6を実装して」から

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| SQLエラー | エラー全文をClaude Codeに貼る。「既に存在します」系は一度テーブルを削除して再実行 |
| ログインメールが届かない | 迷惑メール確認 → SupabaseのAuth > Rate Limits確認 → Site URL設定を確認 |
| 本番だけ動かない | ほぼ環境変数漏れ。Vercelの設定を`.env.local`と突き合わせ→Redeploy |
| 通知が来ない(iPhone) | ホーム画面追加後にアプリ内で購読ONにしたか / iOS16.4以上か |
| 画像が表示されない | StorageバケットのポリシーとバケットのPublic設定をClaude Codeに確認させる |
| AI生成が失敗する | GEMINI_API_KEYの設定とAI Studio側のクォータを確認 |
| デザインがモックと違う | 「docs/plant-ui-mockup-full.htmlの◯◯画面と見比べて、差分を修正して」と指示 |
| 何をしてよいか分からなくなった | Claude Codeに「docs/BUILD-HANDBOOK.md のPHASE◯まで完了。次に何をすべき？」と聞く |
