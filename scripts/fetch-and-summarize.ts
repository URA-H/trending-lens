/**
 * GitHub Trending を取得 → Claude で要約 → JSON にキャッシュ
 *
 * 出力: src/data/trending.json
 * 実行: `pnpm refresh`
 *
 * CI 上では daily refresh の GitHub Action 経由で叩く。
 * ANTHROPIC_API_KEY 未設定なら mock モード。
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scrapeTrending } from "../src/lib/scraper.js";
import { isClaudeEnabled, summarizeAll } from "../src/lib/summarizer.js";
import type { EnrichedRepo, TrendingSnapshot } from "../src/lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../src/data/trending.json");

async function main(): Promise<void> {
  const range = (process.env.TRENDING_RANGE as TrendingSnapshot["range"]) ?? "daily";
  const language = process.env.TRENDING_LANGUAGE || null;

  console.log(`[trending-lens] fetching ${range} trending${language ? ` (${language})` : ""}...`);
  const repos = await scrapeTrending({ range, language });
  console.log(`[trending-lens] scraped ${repos.length} repositories`);

  console.log(
    `[trending-lens] summarizing with Claude (${isClaudeEnabled() ? "live" : "mock mode"})...`,
  );
  const summaries = await summarizeAll(repos);

  const enriched: EnrichedRepo[] = repos.map((r, i) => ({
    ...r,
    ai: summaries[i] ?? null,
  }));

  const snapshot: TrendingSnapshot = {
    fetchedAt: new Date().toISOString(),
    range,
    language,
    aiEnabled: isClaudeEnabled(),
    repos: enriched,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(`[trending-lens] wrote ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("[trending-lens] fatal:", e);
  process.exit(1);
});
