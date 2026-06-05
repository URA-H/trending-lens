/**
 * GitHub Trending dashboard 共通型
 */

export interface TrendingRepo {
  /** "owner/name" 形式のフルネーム */
  fullName: string;
  /** リポジトリ URL */
  url: string;
  /** GitHub 上の説明文（生） */
  description: string | null;
  /** プログラミング言語 (null の可能性あり) */
  language: string | null;
  /** 言語のドット色 (CSS color string) */
  languageColor: string | null;
  /** 累積スター数 */
  stars: number;
  /** 累積フォーク数 */
  forks: number;
  /** 期間中の追加スター（"1,234 stars today" 等） */
  starsToday: number;
}

export interface ClaudeSummary {
  /** AI による短い要約（1-2 文） */
  shortSummary: string;
  /** カテゴリラベル（例: AI / Web Framework / Developer Tools / Infra / ...） */
  category: string;
  /** 「なぜ今 trending か」の仮説（1 文） */
  whyTrending: string;
  /**
   * GitHub 原文 description の日本語訳。原文が日本語ならそのまま、
   * 原文が無いときは省略される。UI 側は description より優先して表示する。
   */
  descriptionJa?: string;
}

export interface EnrichedRepo extends TrendingRepo {
  /** Claude が付けた要約。失敗時 null（描画側でフォールバック表示） */
  ai: ClaudeSummary | null;
}

export interface TrendingSnapshot {
  /** 取得時刻 (ISO) */
  fetchedAt: string;
  /** 取得対象の期間: daily / weekly / monthly */
  range: "daily" | "weekly" | "monthly";
  /** 取得時にスコープした言語 (null = 全言語) */
  language: string | null;
  /** Claude による要約が有効か (false なら mock-mode) */
  aiEnabled: boolean;
  /** リポジトリ一覧 */
  repos: EnrichedRepo[];
}
