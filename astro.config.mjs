// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages 配信用設定。
 *
 * リポジトリ名 trending-lens でユーザーページ配下になるので
 * site=https://URA-H.github.io, base=/trending-lens で組む。
 * 別ホスト（独自ドメイン等）に切り替えるときはここを変更する。
 */
export default defineConfig({
  site: "https://URA-H.github.io",
  base: "/trending-lens",
  vite: {
    plugins: [tailwindcss()],
  },
});
