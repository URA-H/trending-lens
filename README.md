# trending-lens

> github.com/trending を毎日スクレイピングして、Claude が要約・カテゴリ分類し、カードで並べる静的ダッシュボード。Astro で組んで GitHub Pages に毎朝デプロイされます。

[![Tech: Astro 5](https://img.shields.io/badge/Astro-5-FF5D01)](https://astro.build/)
[![Tech: Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4)](https://tailwindcss.com/)
[![Tech: Claude](https://img.shields.io/badge/Anthropic-Claude-cc785c)](https://www.anthropic.com/)
[![Tech: Node 20+](https://img.shields.io/badge/Node-20%2B-339933)](https://nodejs.org/)

---

## 目次

- [どんなアプリか](#どんなアプリか)
- [スクリーンショット](#スクリーンショット)
- [使っている技術](#使っている技術)
- [アーキテクチャ](#アーキテクチャ)
- [仕組みの中身](#仕組みの中身)
- [ローカルで動かす](#ローカルで動かす)
- [デプロイ（GitHub Pages）](#デプロイgithub-pages)
- [このリポジトリについて](#このリポジトリについて)

---

## どんなアプリか

**毎日の GitHub Trending を、Claude が読みやすく整えて並べる** 静的ダッシュボードです。

- github.com/trending を HTML スクレイピングして取得
- 各リポについて Claude に「短い要約 / カテゴリ / なぜ今 trending か」を聞く
- 結果を JSON にキャッシュし、Astro が静的ページに焼く
- GitHub Actions が毎朝（JST 08:00）実行 → 自動コミット → GitHub Pages にデプロイ

Trending を眺めるけど内容を全部読む気力はない、というときの**自分用の朝刊**として作りました。

---

## スクリーンショット

| 画面 | 説明 |
|------|------|
| ![Top](./docs/screenshots/top.png) | トップ（今日の Trending、カードで縦並び） |
| ![Card](./docs/screenshots/card.png) | リポカード（AI 要約 + カテゴリ + 「なぜ trending」） |
| ![Dark](./docs/screenshots/dark.png) | ダークモード（OS 設定追従） |

*（撮影予定）*

---

## 使っている技術

| カテゴリ | 採用技術 |
|----------|----------|
| サイトジェネレータ | **Astro 5** |
| スタイル | Tailwind CSS v4 |
| HTML パース | cheerio |
| AI | **Anthropic Claude API**（Sonnet 系） |
| バリデーション | Zod |
| 言語 | TypeScript 5 |
| テスト | Vitest |
| ホスティング | GitHub Pages |
| 定期実行 | GitHub Actions（cron） |

---

## アーキテクチャ

```
   ┌───────────────────────┐
   │ github.com/trending    │
   └────────────┬──────────┘
                │ HTML
                ▼
   ┌───────────────────────┐
   │ scripts/refresh         │
   │  - cheerio で parse     │
   │  - Claude API で要約     │
   │  - mock fallback        │
   └────────────┬──────────┘
                │ JSON
                ▼
   ┌───────────────────────┐
   │ src/data/trending.json  │ ← Git で履歴管理（変化を追える）
   └────────────┬──────────┘
                │ import
                ▼
   ┌───────────────────────┐
   │ Astro build (static)    │
   └────────────┬──────────┘
                │
                ▼
   ┌───────────────────────┐
   │ GitHub Pages            │
   └───────────────────────┘
```

GitHub Actions が `daily-refresh.yml` で毎日 23:00 UTC（= 08:00 JST）に走り、refresh → commit → build → deploy を自動でやります。

---

## 仕組みの中身

### 1. スクレイピング

`src/lib/scraper.ts` で cheerio を使って `github.com/trending` をパース。`article.Box-row` を起点に owner/name、説明、言語、スター数、期間内増加スターを抽出します。

公式 API が存在しない領域なので、構造が変わったらここを直す前提です。**パース関数は単体テスト可能** にしてあり (`scraper.test.ts`)、サンプル HTML で 3 件のテストを通しています。

### 2. AI 要約（mock-mode フォールバック）

`src/lib/summarizer.ts` で Claude API に各リポを投げ、3 つの構造化フィールドを取り出します:

```
{
  "shortSummary": "1-2 文の要約",
  "category": "AI / Web Framework / Developer Tools / ...",
  "whyTrending": "なぜ今 trending しているかの仮説"
}
```

`ANTHROPIC_API_KEY` が未設定なら **決定論的なモック出力** に切り替わるため、API キーが無くてもサイトは動きます（mock 結果には `[mock]` プレフィックスが付くので一目で区別可能）。

### 3. データのキャッシュ戦略

要約結果は `src/data/trending.json` に書き出し、**Git で履歴管理** します。これにより:

- ビルド時に API を叩かない（ローカルでもサクッと `pnpm build`）
- 日々の Trending の変化が Git log に残る
- AI 要約のコストが日 1 回だけ

### 4. UI

Astro + Tailwind v4 で 1 ページのカード並び。ダークモードは `prefers-color-scheme` ベースの自動切り替え。装飾は控えめで「読みやすさ重視」。

---

## ローカルで動かす

### 前提

- Node.js 20+ / pnpm
- （任意）`ANTHROPIC_API_KEY` — 未設定なら mock モード

### 起動

```bash
git clone https://github.com/URA-H/trending-lens.git
cd trending-lens
pnpm install

# データを取得（mock or live）
pnpm refresh

# 開発サーバー
pnpm dev
```

→ http://localhost:4321/trending-lens/

### テスト

```bash
pnpm test          # scraper の HTML パース確認
pnpm typecheck     # Astro + TS の型チェック
```

---

## デプロイ（GitHub Pages）

1. GitHub の Settings → Pages で **Build and deployment** を **GitHub Actions** に設定
2. （AI 要約を有効にする場合）Settings → Secrets → Actions に `ANTHROPIC_API_KEY` を追加
3. main に push すると `.github/workflows/daily-refresh.yml` が走り、ビルド → デプロイ

毎日 23:00 UTC（= 08:00 JST）に自動で refresh + 再デプロイされます。

サイト URL: `https://URA-H.github.io/trending-lens/`

---

## このリポジトリについて

個人開発のポートフォリオ作品の1つです。**スクレイピング + LLM 要約 + 静的サイト + GitHub Actions** を全部つなげた小さな仕事をしています。

姉妹リポジトリ:
- [URA-H/stocklens](https://github.com/URA-H/stocklens) — 株式分析 SaaS
- [URA-H/hoshi-yomi-ai](https://github.com/URA-H/hoshi-yomi-ai) — 東洋占術 AI
- [URA-H/threefortune-mcp](https://github.com/URA-H/threefortune-mcp) — 占術 MCP（direct import）
- [URA-H/stocklens-mcp](https://github.com/URA-H/stocklens-mcp) — 株式分析 MCP（HTTP proxy）

## ライセンス・注意事項

- 本プロジェクトは学習・個人開発目的のものです
- 取得データの著作権は各リポジトリの作者に帰属します
- 過度なスクレイピングは行わず、1 日 1 回のみ実行します
