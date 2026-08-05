import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

const staticContentPath = fileURLToPath(new URL("./.generated/static-content.html", import.meta.url));

function buildTimeContent(): Plugin {
  return {
    name: "build-time-content",
    async transformIndexHtml(html) {
      const staticContent = await readFile(staticContentPath, "utf8");
      if (!html.includes("<!-- STATIC_CONTENT -->")) {
        throw new Error("index.html is missing the build-time content marker.");
      }
      return html.replace("<!-- STATIC_CONTENT -->", staticContent);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [buildTimeContent()],
});
