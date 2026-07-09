# 植物種マスタ作成プレイブック（Deep Research活用版）

このドキュメントは、アプリの心臓部である「種 × 株サイズ × 月別」の水やり間隔マスタを、
Deep Research（ClaudeのリサーチまたはGemini Deep Research）で作成し、検証してアプリに投入するまでの手順書です。

## 全体フロー

```
STEP 1: Deep Researchにプロンプトを投入（カテゴリ別に3〜4回に分ける）
STEP 2: 出力JSONの機械チェック（形式検証）
STEP 3: 目視サニティチェック（栽培知識との突き合わせ）
STEP 4: species.json としてプロジェクトに配置 → seed投入
STEP 5: 運用しながらTable Editorで微修正
```

**なぜカテゴリ別に分けるか**: 一度に100種を依頼すると1種あたりの調査が浅くなり、後半の出力が雑になります。「アガベ」「灌木・塊根」「ユーフォルビア＋多肉」「観葉植物」の4回に分け、1回あたり15〜25種に絞ることで精度を保ちます。

---

## STEP 1: Deep Research プロンプト

### 使い方
- Claude（リサーチ機能）または Gemini Deep Research に、下記プロンプトを**カテゴリごとに1回ずつ**投入します
- 【共通プロンプト】の後ろに【カテゴリ別ブロック】を1つ繋げて送信してください
- 出力が長くて途切れた場合は「続きを出力してください」で継続させます

---

### 【共通プロンプト】（毎回冒頭に付ける）

```
あなたは多肉植物・コーデックス・観葉植物の栽培に精通した園芸リサーチャーです。
植物の水やり管理アプリのマスタデータを作成します。以下の条件で、指定する各種について
「株サイズ別 × 月別の適正水やり間隔」を調査し、指定のJSON形式で出力してください。

# 栽培環境の前提（すべての種に共通）
- 地域: 日本・関西（大阪近郊）の気候を基準とする
- 栽培形態: 鉢植え。用土は水はけの良い培養土（多肉・コーデックスは軽石主体の多肉用土、観葉植物は観葉植物用培養土）
- 置き場所: 生育期は屋外またはベランダの日当たり、冬は必要に応じて室内・簡易温室に取り込む一般的な趣味家の管理を想定
- 水やりの定義: 鉢底から流れ出るまでたっぷり与える1回を「1回」とし、その回と次の回の間隔（日数）を答える

# 株サイズの定義
- seedling（実生苗）: 播種当年〜1年程度の実生株。根が浅く断水耐性が極めて低い。冬も完全断水にしない種が多い点に注意
- small（子株）: 鉢2.5号（直径7.5cm）以下の子株・カキ仔・実生2年程度
- medium（中株）: 3〜5号鉢
- large（大株）: 6号鉢以上

# 調査・判断のルール
1. 月別（1月〜12月）の間隔を日数の整数で出す。完全断水すべき月は null とする
2. 子株は用土量が少なく乾きが速い＋根が未発達なため、一般に大株より間隔が短い。
   この差を種の性質に応じて正しく反映すること（差がほぼない種は同じ値でよい）
3. 生育型（夏型/冬型/通年型）を必ず判定し、休眠期の扱いを間隔に反映すること。
   特に冬型コーデックスは夏に断水・冬に灌水と、夏型と逆になる点に注意
4. 関西の気候イベントを織り込むこと: 梅雨（6月中旬〜7月中旬、屋外は自然降雨あり・過湿リスク）、
   猛暑（7月下旬〜8月、夜間も高温で蒸れリスク）、冬の寒波（12〜2月、耐寒温度未満なら断水気味に）
5. 流通名・クローン名（例: シーザー、SAD、BB）は、まず正式な学名・基準種に解決してから調査する。
   その品種固有の情報が見つからない場合は、基準種（例: Agave titanota / oteroi）の管理に準拠し、
   confidence を "low" とし、reference_note にその旨を書く
6. 情報源は、育成家のブログ・生産者/園芸店の栽培解説・書籍・学術情報など複数を突き合わせ、
   極端な値（例: 真夏のアガベに毎日灌水）は採用しない。判断根拠を reference_note に要約する
7. 数値はアプリのリマインダー初期値として使われる。断言できない場合は「安全側＝やや乾かし気味」の値を選ぶこと
   （過湿による根腐れの方が水切れより致命的なため）

# 出力形式
以下のJSON配列のみを出力すること（前置き・解説文は不要）。1種につき1オブジェクト。

[
  {
    "name_ja": "アガベ・チタノタ 白鯨",
    "name_scientific": "Agave titanota 'Hakugei'",
    "aliases": ["白鯨"],
    "category": "agave",
    "growth_type": "summer",
    "watering_intervals": {
      "seedling": {"1": 20, "2": 20, "3": 14, "4": 10, "5": 7, "6": 7, "7": 5, "8": 5, "9": 7, "10": 10, "11": 14, "12": 20},
      "small":  {"1": null, "2": null, "3": 20, "4": 14, "5": 10, "6": 10, "7": 7, "8": 7, "9": 10, "10": 14, "11": 25, "12": null},
      "medium": {"1": null, "2": null, "3": 25, "4": 18, "5": 12, "6": 12, "7": 8, "8": 8, "9": 12, "10": 18, "11": 30, "12": null},
      "large":  {"1": 40, "2": 40, "3": 30, "4": 20, "5": 14, "6": 14, "7": 10, "8": 10, "9": 14, "10": 20, "11": 35, "12": 40}
    },
    "dormancy_note": "最低気温5°C以下の期間は断水推奨。室内取り込み時は月1回程度の軽い灌水でも可",
    "fertilizer_interval_days": 30,
    "fertilizer_months": [4, 5, 6, 9, 10],
    "min_temp_celsius": 0,
    "care_notes": "用土が完全に乾いてから2〜3日待って灌水。梅雨は雨ざらしを避ける",
    "confidence": "high",
    "reference_note": "複数の国内育成家の栽培記録と生産者解説に基づく"
  }
]

※ categoryは agave / caudex_shrub / euphorbia / houseplant / succulent_other のいずれか
※ growth_typeは summer / winter / evergreen のいずれか
※ watering_intervalsは4サイズ（seedling/small/medium/large）×12ヶ月を必ず全て埋める（欠けがあると無効データになる）
※ 実生苗（seedling）は成株と管理が大きく異なる。実生の断水は致命的になりやすいため、
   冬でも軽い灌水を続けるのが一般的な種ではそれを反映すること
```

---

### 【カテゴリ別ブロック①: アガベ】

```
# 今回の調査対象（category: "agave"）

## チタノタ／オテロイ系（流通品種・クローン名）
1. アガベ・チタノタ（基準種） Agave titanota
2. アガベ・オテロイ Agave oteroi
3. 白鯨
4. 黒鯨
5. シーザー（凱撒 / Caesar）
6. SAD（南アフリカダイヤモンド / South Africa Diamond）
7. BB（ブラックアンドブルー / Black and Blue）
8. ハデス（黒帝斬）
9. レッドキャットウィーズル（赤猫 / Red Catweazle）
10. 姫厳竜
11. 悪魔くん
12. スナグルトゥース（狂刺夕映など近縁があれば併記）
13. 雪豹（スノーレオパード ※チタノタ斑入り）
14. 大白鯊
15. 白狂刺
16. 氷河
17. 皇冠
18. 緑幽霊（グリーンゴースト）
19. 魔丸
20. 小島錦
21. 狼人
22. 金剛
23. 斑入り白鯨

## その他のアガベ主要種
24. 笹の雪 Agave victoriae-reginae
25. 氷山（笹の雪の白覆輪斑） Agave victoriae-reginae 'Hyozan'
26. キュービック Agave potatorum 'Cubic'
27. ホリダ Agave horrida
28. ユタエンシス・エボリスピナ Agave utahensis var. eborispina
29. パリー（吉祥天） Agave parryi
30. アテナータ Agave attenuata
31. ポタトルム（吉祥冠） Agave potatorum
32. ジェントリー Agave gentryi
33. ストリクタ Agave stricta
34. マクロアカンサ Agave macroacantha

補足:
- チタノタ系クローンは基本管理がチタノタ/オテロイに準ずることが多いが、
  葉厚・株の締まりやすさなどで灌水の流儀に差が語られる場合はそれを反映すること。
  差の根拠が見つからない場合は基準種と同値でよい（confidence: "low"）
- 斑入り品種（雪豹・小島錦・斑入り白鯨・氷山など）は葉緑素が少なく体力が劣るため、
  強光・過乾燥に弱いとされる。斑入りゆえの管理差の情報があれば必ず反映し、
  care_notes に「斑入りのため〜」の形で明記すること
```

---

### 【カテゴリ別ブロック②: 灌木・塊根植物（コーデックス）】

```
# 今回の調査対象（category: "caudex_shrub"）

1. センナ・メリディオナリス Senna meridionalis
2. オペルクリカリア・パキプス Operculicarya pachypus
3. オペルクリカリア・デカリー Operculicarya decaryi
4. ブルセラ・ファガロイデス Bursera fagaroides
5. ブルセラ・ミクロフィラ Bursera microphylla
6. コミフォラ・カタフ（コミフォラ属代表として） Commiphora kataf
7. ボスウェリア・ネグレクタ Boswellia neglecta
8. フォークイエリア・コルムナリス Fouquieria columnaris
9. フォークイエリア・ファシクラータ Fouquieria fasciculata
10. フォークイエリア・プルプシー Fouquieria purpusii
11. パキポディウム・グラキリス Pachypodium rosulatum var. gracilius
12. パキポディウム・恵比寿笑い Pachypodium brevicaule
13. パキポディウム・ラメリー Pachypodium lamerei
14. アデニウム・アラビカム Adenium arabicum
15. 亀甲竜（ディオスコレア・エレファンティペス） Dioscorea elephantipes ※冬型
16. ケラリア・ピグマエア Ceraria pygmaea ※冬型寄り
17. ブルセラ・パラドクサ Bursera paradoxa（メキシコ原産・細葉の希少種）
18. コミフォラ・モンストローサ Commiphora monstruosa（マダガスカル原産）

補足:
- 夏型/冬型の判定を最重要事項として扱うこと。特に亀甲竜など冬型は夏断水・秋〜春灌水となる
- 落葉性の種（パキプス、センナ等）は「葉の展開・落葉」と灌水開始/停止の関係を dormancy_note に明記すること
- 実生子株（small）は成株と管理が大きく異なる種が多い（断水耐性が低い）ため、サイズ差を丁寧に反映すること
```

---

### 【カテゴリ別ブロック③: ユーフォルビア＋その他多肉】

```
# 今回の調査対象（category: "euphorbia" または "succulent_other"）

## ユーフォルビア（category: "euphorbia"）
1. オベサ Euphorbia obesa
2. ホリダ Euphorbia horrida
3. 峨眉山 Euphorbia 'Gabizan'
4. 鉄甲丸 Euphorbia bupleurifolia
5. ラクテア（ホワイトゴースト含む） Euphorbia lactea
6. ソテツキリン Euphorbia 'Sotetsukirin'

## その他多肉（category: "succulent_other"）
7. ハオルチア・オブツーサ Haworthia cooperi var. truncata
8. エケベリア（代表種として） Echeveria spp.
9. サンスベリア・ローレンティー Sansevieria trifasciata 'Laurentii'
```

---

### 【カテゴリ別ブロック④: 一般観葉植物（定番）】

```
# 今回の調査対象（category: "houseplant"）
前提の置き場所は「室内の明るい場所」とする（この カテゴリのみ屋外前提を上書き）。

1. モンステラ・デリシオサ Monstera deliciosa
2. パキラ Pachira aquatica
3. フィカス・ウンベラータ Ficus umbellata
4. フィカス・ベンガレンシス Ficus benghalensis
5. ガジュマル Ficus microcarpa
6. ポトス Epipremnum aureum
7. サトイモ系（アロカシア・オドラ） Alocasia odora
8. ドラセナ・コンシンネ Dracaena marginata
9. シェフレラ Schefflera arboricola
10. エバーフレッシュ Cojoba arborea var. angustifolia

補足: 観葉植物は季節差が多肉ほど大きくないが、冬の生育緩慢期は間隔を伸ばすこと。
「土の表面が乾いたら」等の定性的流儀は care_notes に書き、月別日数はその流儀を
関西の室内環境で運用した場合の実用的な目安に変換すること。
```

---

## STEP 2: 出力JSONの機械チェック

Deep Researchの出力をファイル（例: `agave.json`）に保存し、Claude Codeに以下を指示します:

```
species.json のバリデーションスクリプトを作ってください。チェック項目:
1. 必須キーが全て存在するか（name_ja, category, growth_type, watering_intervals ほか）
2. watering_intervals が seedling/small/medium/large × 1〜12月 の全キーを持つか
3. 値が null または 1〜120 の整数か
4. category / growth_type が定義済みの値か
5. 論理チェック: growth_type が "summer" なのに7月がnull、"winter" なのに1月がnullなど、
   生育型と断水月が矛盾していないか（警告として出力）
6. small の間隔が large より長い月がないか（警告として出力。逆転は通常おかしい）
エラーと警告を種名付きで一覧出力してください。
```

このスクリプトはそのままアプリのseed投入前チェックとして再利用します。

## STEP 3: 目視サニティチェック（15分で終わる要点だけ）

全数チェックは不要です。以下のスポットだけ自分の栽培感覚と照らします:

- [ ] **アガベ大株の真夏（7-8月）**: 7〜10日前後になっているか（毎日〜3日等の過湿値は要修正）
- [ ] **アガベの冬**: 子株はnullまたは月1回相当、大株は30日以上になっているか
- [ ] **実生苗（seedling）**: 冬もnullで完全断水になっていないか（実生の完全断水は枯死リスク大）、成株より明確に間隔が短いか
- [ ] **パキプス・センナ等の落葉期**: 断水〜ごく控えめになっているか
- [ ] **亀甲竜（冬型）**: 夏がnull・秋〜春に灌水と、夏型と逆になっているか
- [ ] **観葉植物の冬**: 夏より明確に間隔が伸びているか
- [ ] 自分が実際に育てている種を2〜3種選び、普段の感覚と大きくズレていないか

ズレている値はJSONを直接修正します（アプリ投入後もTable Editorでいつでも直せます）。

## STEP 4: seed投入

1. 検証済みJSONを結合して `supabase/seed/species.json` に配置
2. Claude Codeに指示:

```
supabase/seed/species.json を species_master テーブルに投入するseedスクリプトを作成してください。
投入前にSTEP 2のバリデーションを必ず実行し、エラーが1件でもあれば投入を中止してください。
既存レコードとは name_ja で突き合わせ、既存があれば上書き更新（upsert）にしてください。
source は 'curated' を設定してください。
```

## STEP 5: 運用しながらの微修正

- 使っていて「この種のこの月は短すぎる/長すぎる」と感じたら、SupabaseのTable Editor（またはマスタ管理画面）で該当セルを直す → 全ユーザーに即反映
- 修正が続く種はDeep Researchに単独で再調査させるとよい:
  「Agave titanota 'Caesar' の関西・鉢植え・大株の月別水やり間隔だけを、共通プロンプトの条件で再調査してください」

---

## 補足: 品種名の確認事項

以下は音声入力由来と思われる名称の解釈です。異なる場合はプロンプト投入前に修正してください:

- 「シーザー」→ Agave titanota 'Caesar'（凱撒）として収録
- 「SAD」→ 南アフリカダイヤモンドとして収録
- 「BB」→ Black and Blue として収録
- 「センナメリディオ、ナリス」→ センナ・メリディオナリス（Senna meridionalis）として収録
- 「プルセラ・パラドクサ」→ ブルセラ・パラドクサ（Bursera paradoxa、メキシコ原産の細葉希少種）として収録済み
- 「氷山」→ 笹の雪の白覆輪斑（Agave victoriae-reginae 'Hyozan'）、「キュービック」→ Agave potatorum 'Cubic' として収録済み。別の解釈が正しければ修正してください
