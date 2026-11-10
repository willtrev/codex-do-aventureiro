import { test, expect, abrir } from "./ajuda.js";

test("hub do mestre: criar campanha, importar fichas e ordenar", async ({ page }) => {
  await abrir(page, "mestre");
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await expect(page.locator("#camp_msg")).toHaveText("Dê um nome à campanha.");
  await page.fill("#camp_nome", "A Maldição de Strahd");
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await expect(page.locator("#top h1")).toHaveText("A Maldição de Strahd");

  const backups = await page.evaluate(() =>
    testChars()
      .slice(0, 3)
      .map((c) => JSON.stringify(c))
  );
  for (const b of backups) {
    await page.getByRole("button", { name: "Colar backup" }).click();
    await page.fill("#mbk", b);
    await page.getByRole("button", { name: "Adicionar à campanha" }).click();
    await expect(page.locator("#mbkmsg")).toContainText("adicionado");
    await page.locator('.modal [data-a="close"]').first().click();
  }
  await expect(page.locator(".mcard")).toHaveCount(3);

  // importar de novo o mesmo personagem atualiza o card, não duplica
  await page.getByRole("button", { name: "Colar backup" }).click();
  await page.fill("#mbk", backups[0]);
  await page.getByRole("button", { name: "Adicionar à campanha" }).click();
  await expect(page.locator("#mbkmsg")).toContainText("atualizado");
  await page.locator('.modal [data-a="close"]').first().click();
  await expect(page.locator(".mcard")).toHaveCount(3);

  await page.selectOption("#camp_ord", "nome");
  await expect(page.locator(".mnome")).toHaveText(["Durgan Pedrafiel", "Grosh Quebra-Escudos", "Lírian Voz-de-Prata"]);
  // iniciativa: Lírian (bardo, +6) antes de Grosh (bárbaro, +1) e Durgan (clérigo, −1)
  await page.selectOption("#camp_ord", "iniciativa");
  await expect(page.locator(".mnome")).toHaveText(["Lírian Voz-de-Prata", "Grosh Quebra-Escudos", "Durgan Pedrafiel"]);

  await page.locator('.mcard [data-a="mdetalhe"]').first().click();
  await expect(page.locator(".modal")).toContainText("Armas");
  await page.locator('.modal [data-a="close"]').first().click();

  await page.reload();
  await expect(page.locator(".mcard")).toHaveCount(3);
});

test("todos os cards da campanha têm o mesmo tamanho", async ({ page }) => {
  await abrir(page, "mestre");
  await page.fill("#camp_nome", "Teste");
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await page.evaluate(() => {
    for (const c of testChars()) adicionarNaCampanha(c, "backup");
    render();
  });
  const alturas = await page
    .locator(".mcard")
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  const larguras = await page
    .locator(".mcard")
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(new Set(alturas).size).toBe(1);
  expect(new Set(larguras).size).toBe(1);
});
