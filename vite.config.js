import { defineConfig } from "vite";

// O site é estático: o build junta os módulos de js/ em poucos arquivos otimizados em dist/.
// base "./" faz os caminhos serem relativos, então o site funciona em qualquer subpasta
// (GitHub Pages em /codex-do-aventureiro/, Cloudflare Pages na raiz, etc.).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    // Os dados do SRD (~1,2 MB) ficam num pedaço separado, guardado em cache pelo navegador.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("/js/dados/srd-") ? "srd" : undefined),
      },
    },
  },
});
