/**
 * Claude API での要約 + カテゴリ分類
 *
 * ANTHROPIC_API_KEY 未設定時は mock モードで決定論的に動作するため、
 * フォークしてすぐ動かせる（コスト 0 で UI 確認可能）。
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ClaudeSummary, TrendingRepo } from "./types.js";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 400;

const summarySchema = z.object({
  shortSummary: z.string().min(1).max(280),
  category: z.string().min(1).max(40),
  whyTrending: z.string().min(1).max(280),
  descriptionJa: z.string().min(1).max(400).optional(),
});

export interface SummarizeOptions {
  /** API キーが無くてもエラーにせず mock で進める */
  allowMock?: boolean;
}

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * 1 リポジトリを要約する。失敗時は null（描画側でフォールバック）。
 */
export async function summarizeRepo(
  repo: TrendingRepo,
  options: SummarizeOptions = {},
): Promise<ClaudeSummary | null> {
  if (!isClaudeEnabled()) {
    return options.allowMock !== false ? mockSummary(repo) : null;
  }

  try {
    const client = new Anthropic();
    const prompt = buildPrompt(repo);
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    const text = extractText(res.content);
    return parseSummary(text);
  } catch (e) {
    // ログだけ吐いて null を返す。スクリプトは続行できる
    console.warn(`[summarizer] failed for ${repo.fullName}:`, (e as Error).message);
    return null;
  }
}

/**
 * 全リポジトリを順に要約。スループットは抑えめにして rate limit に優しく。
 */
export async function summarizeAll(
  repos: TrendingRepo[],
  options: SummarizeOptions = {},
): Promise<Array<ClaudeSummary | null>> {
  const results: Array<ClaudeSummary | null> = [];
  for (const r of repos) {
    results.push(await summarizeRepo(r, options));
  }
  return results;
}

// ─── helpers ────────────────────────────────────────────────

const SYSTEM_PROMPT = `あなたは GitHub Trending を毎日見ている開発者向けの編集者です。
各リポジトリについて、以下を厳密な JSON で返してください:

{
  "shortSummary": "そのリポジトリが何をするものか、1-2 文（日本語、最大 280 文字）",
  "category": "AI / Web Framework / Developer Tools / Infra / Data / Game / Education / Productivity などのカテゴリラベル",
  "whyTrending": "なぜ今 trending しているかの仮説 1 文（日本語、最大 280 文字）",
  "descriptionJa": "GitHub の description を読みやすい日本語に訳したもの（最大 400 文字）。description が無い場合または既に日本語の場合は省略してよい"
}

トーンは淡々と。煽らない。技術用語はそのまま英語で残してよい。
返答は JSON オブジェクトのみ、前置き・後置きの文章は禁止。`;

function buildPrompt(repo: TrendingRepo): string {
  return [
    `Repository: ${repo.fullName}`,
    `URL: ${repo.url}`,
    `Language: ${repo.language ?? "(unspecified)"}`,
    `Stars total: ${repo.stars} (added recently: ${repo.starsToday})`,
    `Description: ${repo.description ?? "(no description)"}`,
  ].join("\n");
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseSummary(text: string): ClaudeSummary | null {
  // JSON だけを掬う（モデルが ```json ... ``` で囲うケースに備える）
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    const obj = JSON.parse(jsonText);
    const parsed = summarySchema.safeParse(obj);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * モック要約。ANTHROPIC_API_KEY なしで開発を進めるための決定論的フォールバック。
 */
function mockSummary(repo: TrendingRepo): ClaudeSummary {
  const language = repo.language?.toLowerCase() ?? "";
  const category =
    language.includes("python") || language.includes("notebook")
      ? "AI / Data"
      : language.includes("rust") || language.includes("go")
        ? "Infra / Tooling"
        : language.includes("ts") ||
            language.includes("javascript") ||
            language.includes("svelte")
          ? "Web / Frontend"
          : "General";
  const desc = repo.description ?? `${repo.fullName} (no description)`;
  return {
    shortSummary: `[mock] ${desc.slice(0, 140)}`,
    category: `[mock] ${category}`,
    whyTrending: `[mock] 直近で ${repo.starsToday} stars 増。`,
    // mock では実翻訳できないので、原文 description をそのまま返してフォールバックの動作確認に使う
    descriptionJa: repo.description
      ? `[mock 訳] ${repo.description}`
      : undefined,
  };
}
