import { defineConfig, devices } from "@playwright/test";

/* Testes de ponta a ponta: abrem o app num navegador de verdade e usam como uma pessoa.
   npm run test:e2e   → sobe o Vite sozinho em http://localhost:5173 e roda os testes.
   BASE_URL=http://... npm run test:e2e   → usa um servidor que já está rodando. */
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "celular", use: { ...devices["Pixel 7"] }, testMatch: /responsivo\.spec\.js/ },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run dev -- --port 5173 --strictPort", url: BASE_URL, reuseExistingServer: true },
});
