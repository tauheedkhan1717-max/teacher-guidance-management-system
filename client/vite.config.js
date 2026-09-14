import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server config. The API runs separately on :4000 (CORS allows this origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});