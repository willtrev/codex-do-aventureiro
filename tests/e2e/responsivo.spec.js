import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

// Roda no projeto "celular": nenhuma tela pode ter rolagem lateral
test("no celular nenhuma tela rola para o lado", async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
  for (const t of ["painel", "magias", "pericias", "ficha", "inventario", "notas", "mestre"]) {
    await aba(page, t);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobra, `aba ${t}`).toBeLessThanOrEqual(1);
  }
});
