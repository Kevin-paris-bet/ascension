import { defineConfig } from "vite";
import { resolve } from "node:path";

// The Android bundle reuses the game, without Next's server-only routes.
export default defineConfig({
  root: resolve(import.meta.dirname),
  publicDir: resolve(import.meta.dirname, "..", "public"),
  resolve: { alias: { "@": resolve(import.meta.dirname, "..") } },
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(""),
  },
  build: { outDir: "../dist/mobile", emptyOutDir: true },
});
