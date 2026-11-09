import { test, expect, carregarExemplos, expor } from "./ajuda.js";

/* Conta Google com o banco simulado (?banco=local): o login não abre a janela do Google,
   entra direto como "Pessoa de Teste". Duas abas com perfis diferentes fazem o papel de
   dois aparelhos da mesma pessoa. */

async function abrir(page, perfil) {
  await page.goto(`/?banco=local&perfil=${perfil}`);
  await expect(page.locator("#top")).not.toBeEmpty();
}
async function entrar(page) {
  await page.locator('#contaselo [data-a="contaentrar"], [data-a="contaentrar"]').first().click();
  await expect(page.locator("#contaselo")).toContainText("Pessoa de Teste");
  await expect(page.locator("#st")).toContainText("Salvo na sua conta Google");
}

test("fichas criadas num aparelho aparecem no outro depois do login", async ({ page: pc, context }) => {
  await abrir(pc, "pc");
  await carregarExemplos(pc);
  await entrar(pc);

  const celular = await context.newPage();
  await abrir(celular, "celular");
  await expect(celular.getByText("Seu livro de aventuras ainda está em branco.")).toBeVisible();
  await entrar(celular);
  await expect(celular.locator("#top h1")).toHaveText("Volis E'gurar");
  await expor(celular);
  expect(await celular.evaluate(() => Object.keys(state.chars).length)).toBe(12);

  // Dano no computador chega ao celular
  await pc.evaluate(() => (location.hash = "painel"));
  await pc.fill("#hpamt", "3");
  await pc.locator('[data-a="dmg"]').click();
  await celular.evaluate(() => (location.hash = "painel"));
  await expect(celular.locator(".big").first()).toHaveText("2");
});

test("sair da conta mantém as fichas no aparelho", async ({ page }) => {
  await abrir(page, "pc");
  await carregarExemplos(page);
  await entrar(page);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.locator('.modal [data-a="contasairok"]').click();
  await expect(page.locator("#contaselo")).toContainText("Entrar com Google");
  await expect(page.locator("#st")).toContainText("Salvo só neste navegador");
  await expect(page.locator("#top h1")).toHaveText("Volis E'gurar");
});

test("a sessão continua ao recarregar a página", async ({ page }) => {
  await abrir(page, "pc");
  await carregarExemplos(page);
  await entrar(page);
  await page.reload();
  await expect(page.locator("#contaselo")).toContainText("Pessoa de Teste");
  await expect(page.locator("#st")).toContainText("Salvo na sua conta Google");
});

test("ficha nova num aparelho chega ao outro já conectado", async ({ page: pc, context }) => {
  await abrir(pc, "pc");
  await entrar(pc);
  const celular = await context.newPage();
  await abrir(celular, "celular");
  await entrar(celular);
  await pc.getByRole("button", { name: "Criar personagem" }).click();
  await pc.fill("#nc_nome", "Thorin");
  await pc.locator('[data-a="pickclass"][data-k="guerreiro"]').click();
  await expect(celular.locator("#top h1")).toHaveText("Thorin");
});
