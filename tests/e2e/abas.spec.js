import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

// Abre todas as abas de todos os personagens de exemplo: nenhuma pode dar erro de JavaScript
test("todas as abas de todos os personagens abrem sem erro", async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
  const ids = await page.evaluate(() => Object.keys(state.chars));
  for (const id of ids) {
    await page.evaluate((id) => {
      state.active = id;
      render();
    }, id);
    for (const t of ["painel", "magias", "pericias", "ficha", "inventario", "notas"]) {
      await aba(page, t);
      await expect(page.locator("#main")).not.toBeEmpty();
    }
  }
});

test("tema claro, escuro e automático", async ({ page }) => {
  await abrir(page);
  await page.locator('[data-a="theme"][data-t="dark"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-a="theme"][data-t="light"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
