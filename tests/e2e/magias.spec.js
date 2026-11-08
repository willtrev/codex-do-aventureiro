import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

test.beforeEach(async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
  await aba(page, "magias");
});

test("buscar e adicionar magia do SRD ao grimório", async ({ page }) => {
  await page.locator('[data-a="addspell"]').click();
  await page.fill("#busca_magia", "magic missile");
  await expect(page.locator("#catcount")).toHaveText("1 magia");
  await page.locator("#catlist .spellrow:visible [data-a=addcat]").click();
  expect(await page.evaluate(() => cur().grimorio.some((s) => s.en === "Magic Missile"))).toBe(true);
});

test("Info mostra o resumo em português e o texto completo do SRD em inglês", async ({ page }) => {
  await page.evaluate(() => {
    const c = cur();
    spellInfo(
      c,
      c.grimorio.find((s) => s.en === "Sleep")
    );
  });
  const m = page.locator(".modal");
  await expect(m).toContainText("Sono");
  await expect(m).toContainText("Texto completo do SRD (inglês)");
  await expect(m).toContainText("magical slumber");
});

test("idioma: PT + EN, só PT e só EN", async ({ page }) => {
  const primeiro = () => page.locator(".sname").first();
  await page.locator('[data-a="lang"][data-l="ambos"]').click();
  await expect(primeiro()).toContainText("(");
  await page.locator('[data-a="lang"][data-l="en"]').click();
  await expect(page.locator(".sname", { hasText: "Sleep" })).toHaveCount(1);
  await page.locator('[data-a="lang"][data-l="pt"]').click();
  await expect(page.locator(".sname", { hasText: "Sleep" })).toHaveCount(0);
  await page.locator('[data-a="lang"][data-l="ambos"]').click();
});

test("preparar magia num espaço do dia", async ({ page }) => {
  const sel = page.locator('select[data-a="prepsel"]').first();
  const opcoes = await sel.locator("option").allTextContents();
  await sel.selectOption({ index: opcoes.length - 1 });
  const id = await sel.inputValue();
  expect(id).not.toBe("");
});
