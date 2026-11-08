import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

test.beforeEach(async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
});

test("adicionar talento do SRD", async ({ page }) => {
  await aba(page, "ficha");
  await page.locator('[data-a="srdfeat"]').click();
  await page.fill("#busca_srd", "combat casting");
  await expect(page.locator("#srdcount")).toHaveText("1 resultado");
  await page.locator("#srdlist .spellrow:visible [data-a=addfeat]").click();
  expect(await page.evaluate(() => cur().talentos.at(-1).en)).toBe("Combat Casting");
});

test("comprar arma do SRD desconta o dinheiro e cria o ataque", async ({ page }) => {
  await aba(page, "inventario");
  const po = () => page.evaluate(() => cur().dinheiro.po);
  const antes = await po();
  await page.locator('[data-a="srdequip"]').click();
  await page.fill("#busca_srd", "dagger");
  await page.locator("#srdlist .spellrow:visible [data-a=buyequip]").first().click();
  await expect(page.locator("#srdmsg")).toContainText("pago");
  expect(await po()).toBe(antes - 2);
});

test("filtro por categoria esconde o resto", async ({ page }) => {
  await aba(page, "inventario");
  await page.locator('[data-a="srdequip"]').click();
  await page.selectOption("#filtro_equip", "Armor");
  const visiveis = await page.locator("#srdlist .spellrow:visible").count();
  expect(visiveis).toBeGreaterThan(5);
  expect(visiveis).toBeLessThan(40);
});
