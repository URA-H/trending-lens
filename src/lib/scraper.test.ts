import { describe, it, expect } from "vitest";
import { parseTrendingHtml } from "./scraper.js";

const SAMPLE_HTML = `
<html><body>
<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a href="/acme/widgets"> acme / widgets </a>
  </h2>
  <p class="col-9 color-fg-muted my-1 pr-4">A tiny widgets library</p>
  <div>
    <span itemprop="programmingLanguage">TypeScript</span>
    <span class="repo-language-color" style="background-color: #3178c6"></span>
    <a href="/acme/widgets/stargazers"> 1,234 </a>
    <a href="/acme/widgets/forks"> 56 </a>
    <span class="d-inline-block float-sm-right"> 789 stars today </span>
  </div>
</article>
<article class="Box-row">
  <h2><a href="/foo/bar"> foo / bar </a></h2>
  <p>Foo bar baz</p>
  <span itemprop="programmingLanguage">Rust</span>
  <span class="repo-language-color" style="background-color: #dea584"></span>
  <a href="/foo/bar/stargazers"> 42 </a>
  <a href="/foo/bar/forks"> 7 </a>
</article>
</body></html>
`;

describe("parseTrendingHtml", () => {
  it("extracts repos with full structure", () => {
    const repos = parseTrendingHtml(SAMPLE_HTML);
    expect(repos).toHaveLength(2);

    const widgets = repos[0]!;
    expect(widgets.fullName).toBe("acme/widgets");
    expect(widgets.url).toBe("https://github.com/acme/widgets");
    expect(widgets.description).toBe("A tiny widgets library");
    expect(widgets.language).toBe("TypeScript");
    expect(widgets.languageColor).toBe("#3178c6");
    expect(widgets.stars).toBe(1234);
    expect(widgets.forks).toBe(56);
    expect(widgets.starsToday).toBe(789);
  });

  it("handles missing optional fields (no starsToday)", () => {
    const repos = parseTrendingHtml(SAMPLE_HTML);
    const bar = repos[1]!;
    expect(bar.fullName).toBe("foo/bar");
    expect(bar.stars).toBe(42);
    expect(bar.starsToday).toBe(0);
  });

  it("returns empty array for non-matching HTML", () => {
    expect(parseTrendingHtml("<html><body><p>nothing</p></body></html>")).toEqual(
      [],
    );
  });
});
