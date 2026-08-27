import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: false,
  server: {
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    sourcemap: true,
    rollupOptions: {
      output: { manualChunks: { phaser: ["phaser"] } },
    },
  },
});
