import { test, expect, abrir, carregarExemplos, aba } from "./ajuda.js";

test("primeiro acesso começa sem personagens, na tela inicial", async ({ page }) => {
  await abrir(page);
  await expect(page.getByText("Seu livro de aventuras ainda está em branco.")).toBeVisible();
  expect(await page.evaluate(() => Object.keys(state.chars).length)).toBe(0);
});

test("criar personagem, recarregar a página e continuar com ele", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: "Criar personagem" }).click();
  await page.fill("#nc_nome", "Thorin");
  await page.locator('[data-a="pickclass"][data-k="guerreiro"]').click();
  await expect(page.locator("#top h1")).toHaveText("Thorin");
  await page.reload();
  await expect(page.locator("#top h1")).toHaveText("Thorin");
});

test("excluir o último personagem volta para a tela inicial, no painel", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: "Criar personagem" }).click();
  await page.fill("#nc_nome", "Descartável");
  await page.locator('[data-a="pickclass"][data-k="mago"]').click();
  await aba(page, "notas");
  await page.locator('[data-a="delchar"]').click();
  await page.locator('.modal [data-a="dodel"]').click();
  await expect(page.getByText("Seu livro de aventuras ainda está em branco.")).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe("#painel");
});

test("carregar exemplos traz o Volis e um personagem por classe", async ({ page }) => {
  await abrir(page);
  await carregarExemplos(page);
  expect(await page.evaluate(() => Object.keys(state.chars).length)).toBe(12);
});

test("backup: copiar de um personagem e importar em outro navegador", async ({ page, browser }) => {
  await abrir(page);
  await carregarExemplos(page);
  const backup = await page.evaluate(() => JSON.stringify(cur()));
  const outra = await browser.newPage();
  await abrir(outra);
  await outra.fill("#impbox", backup);
  await outra.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(outra.locator("#top h1")).toHaveText("Volis E'gurar");
  await outra.close();
});

test("backup inválido mostra mensagem", async ({ page }) => {
  await abrir(page);
  await page.fill("#impbox", "isso não é um backup");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.locator("#impmsg")).toContainText("não é um backup válido");
});
