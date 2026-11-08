import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

test.beforeEach(async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
  await aba(page, "painel");
});

test("dano e cura mudam os PV, sem passar do máximo", async ({ page }) => {
  const pv = page.locator(".big").first();
  await expect(pv).toHaveText("5");
  await page.fill("#hpamt", "3");
  await page.locator('[data-a="dmg"]').click();
  await expect(pv).toHaveText("2");
  await page.fill("#hpamt", "10");
  await page.locator('[data-a="heal"]').click();
  await expect(pv).toHaveText("5");
});

test("Armadura Arcana ativa soma +4 na CA e fica salva", async ({ page }) => {
  const ca = () => page.evaluate(() => ac(cur()).total);
  const antes = await ca();
  await page.locator('[data-a="ef"][data-k="armaduraArcana"]').click();
  expect(await ca()).toBe(antes + 4);
  await page.reload();
  await expect(page.locator('[data-a="ef"][data-k="armaduraArcana"]')).toHaveAttribute("aria-pressed", "true");
});

test("contador de virotes: atirar e repor", async ({ page }) => {
  const qtd = () => page.evaluate(() => cur().itens.find((i) => /virote/i.test(i.nome)).qtd);
  const antes = await qtd();
  await page.getByRole("button", { name: /Gastar 1 de virotes/i }).click();
  expect(await qtd()).toBe(antes - 1);
  await page.getByRole("button", { name: "Adicionar 10" }).click();
  expect(await qtd()).toBe(antes + 9);
});

test("inspiração: somar e tirar, nunca abaixo de zero", async ({ page }) => {
  const insp = () => page.evaluate(() => +cur().inspiracao || 0);
  const antes = await insp();
  await page.locator('[data-a="insp"][data-v="1"]').click();
  expect(await insp()).toBe(antes + 1);
  for (let i = 0; i < antes + 1; i++) await page.locator('[data-a="insp"][data-v="-1"]').click();
  expect(await insp()).toBe(0);
  await expect(page.locator('[data-a="insp"][data-v="-1"]')).toBeDisabled();
});

test("lançar magia gasta o espaço e o descanso de 8 h recupera", async ({ page }) => {
  const usadas = () =>
    page.evaluate(
      () =>
        Object.values(cur().prep)
          .flatMap((p) => [p.escola, ...p.slots])
          .filter((s) => s && s.used).length
    );
  await page.locator('[data-a="cast"]').first().click();
  expect(await usadas()).toBe(1);
  await page.locator('[data-a="rest"]').first().click();
  await page.locator('.modal [data-a="dorest"]').click();
  expect(await usadas()).toBe(0);
});
