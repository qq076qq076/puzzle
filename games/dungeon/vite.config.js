import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "assets",
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
