import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  base: `./`,
  plugins: [react(), viteTsconfigPaths()],
  optimizeDeps: { exclude: ["fsevents"] },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/storage": "http://localhost:3001",
    },
  },
});
