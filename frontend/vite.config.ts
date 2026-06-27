// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              const path = id.replace(/\\/g, "/");
              if (
                path.includes("node_modules/react/") ||
                path.includes("node_modules/react-dom/") ||
                path.includes("node_modules/react-router-dom/")
              ) {
                return "vendor";
              }
              if (path.includes("node_modules/recharts/")) {
                return "charts";
              }
              if (path.includes("node_modules/framer-motion/")) {
                return "motion";
              }
              if (path.includes("node_modules/@tanstack/react-query/")) {
                return "query";
              }
            }
          },
        },
      },
    },
  },
});
