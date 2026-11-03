import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Static phone-app build: plain SPA in, cap-dist/ out, ready for Capacitor.
 * Kept separate from vite.config.ts so the Lovable web build is untouched.
 */
export default defineConfig({
  root: fileURLToPath(new URL("./cap", import.meta.url)),
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: false,
  resolve: {
    alias: {
      // The phone build has no server: swap the cheat assistant and the
      // TanStack Start client for tiny stand-ins (see the stub files).
      "@/game/cheat-assistant.functions": fileURLToPath(
        new URL("./src/game/cheat-assistant.cap.ts", import.meta.url),
      ),
      "@tanstack/react-start": fileURLToPath(
        new URL("./src/cap/react-start-stub.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("./cap-dist", import.meta.url)),
    emptyOutDir: true,
    target: "es2020",
  },
});
