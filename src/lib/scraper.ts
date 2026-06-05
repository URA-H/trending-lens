/**
 * GitHub Trending HTML スクレイパー
 *
 * github.com/trending には公式 API が無いので HTML を直接パースする。
 * 構造が変わるとここの調整が要る。
 */

import { load } from "cheerio";
import type { TrendingRepo } from "./types.js";

const TRENDING_URL_BASE = "https://github.com/trending";
const USER_AGENT =
  "trending-lens/0.1 (https://github.com/URA-H/trending-lens)";

export interface ScrapeOptions {
  /** "daily" | "weekly" | "monthly" */
  range?: "daily" | "weekly" | "monthly";
  /** 特定言語に絞る場合（例: "typescript"）。null/未指定なら全言語 */
  language?: string | null;
}

/**
 * github.com/trending の HTML を取得してパースする。
 */
export async function scrapeTrending(
  options: ScrapeOptions = {},
): Promise<TrendingRepo[]> {
  const range = options.range ?? "daily";
  const lang = options.language ?? null;
  const url = lang
    ? `${TRENDING_URL_BASE}/${encodeURIComponent(lang)}?since=${range}`
    : `${TRENDING_URL_BASE}?since=${range}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseTrendingHtml(html);
}

/**
 * github.com/trending の HTML から TrendingRepo[] を抽出する。
 * 単体テストしやすいよう exported。
 */
export function parseTrendingHtml(html: string): TrendingRepo[] {
  const $ = load(html);
  const repos: TrendingRepo[] = [];

  $("article.Box-row").each((_, el) => {
    const $el = $(el);

    // owner/name は h2 a の href から拾うのが堅い
    const href = $el.find("h2 a").attr("href")?.trim();
    if (!href) return;
    const fullName = href.replace(/^\//, "").replace(/\s+/g, "");
    if (!fullName.includes("/")) return;

    const description = $el.find("p").first().text().trim() || null;

    const language = $el
      .find('[itemprop="programmingLanguage"]')
      .first()
      .text()
      .trim() || null;

    const languageColor =
      $el
        .find(".repo-language-color")
        .first()
        .attr("style")
        ?.match(/background-color:\s*([^;]+)/)?.[1]
        ?.trim() ?? null;

    // スター/フォークの数値はリンク内の数値テキスト。カンマ取り除く。
    const counts = $el
      .find('a[href$="/stargazers"], a[href$="/forks"]')
      .map((_i, a) => parseIntLoose($(a).text()))
      .get();
    const stars = counts[0] ?? 0;
    const forks = counts[1] ?? 0;

    // 期間中の追加 ("123 stars today" / "1,234 stars this week")
    const starsTodayText = $el
      .find('span.d-inline-block.float-sm-right')
      .first()
      .text()
      .trim();
    const starsToday = parseIntLoose(starsTodayText);

    repos.push({
      fullName,
      url: `https://github.com/${fullName}`,
      description,
      language,
      languageColor,
      stars,
      forks,
      starsToday,
    });
  });

  return repos;
}

function parseIntLoose(text: string): number {
  if (!text) return 0;
  const match = text.replace(/,/g, "").match(/(\d+)/);
  return match ? parseInt(match[1]!, 10) : 0;
}
