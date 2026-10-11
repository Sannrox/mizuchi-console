import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base: one build works at `/ui/` and at `/<prefix>/ui/` behind a proxy.
// `pnpm dev` proxies API calls to a local mizuchi server (MIZUCHI_URL).
const mizuchi = process.env.MIZUCHI_URL ?? "http://127.0.0.1:8080";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", assetsDir: "assets" },
  server: {
    proxy: { "/v1": mizuchi, "/healthz": mizuchi },
  },
});
