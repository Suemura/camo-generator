import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { preprocessorOptions: { scss: { api: "modern-compiler" } } },
  build: { target: "es2022", sourcemap: true },
  worker: { format: "es" }, // worker 内の動的 import (digsrc) を分割チャンクにする
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
