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
  await page.locator('.modal [data-a="contasairok"][data-m="manter"]').click();
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

/* ----- Escolhas ao entrar com fichas dos dois lados e ao sair ----- */

async function criar(page, nome) {
  // Tela inicial (sem fichas) ou botão "Novo" no topo
  await page.locator('[data-a="newchar"], button:has-text("Criar personagem")').first().click();
  await page.fill("#nc_nome", nome);
  await page.locator('[data-a="pickclass"][data-k="guerreiro"]').click();
  await expect(page.locator("#top h1")).toHaveText(nome);
}
/** Computador com os 12 exemplos na conta; celular com fichas próprias, ainda fora da conta. */
async function contaComExemplos(pc, context) {
  await abrir(pc, "pc");
  await carregarExemplos(pc);
  await entrar(pc);
  const celular = await context.newPage();
  await abrir(celular, "celular");
  return celular;
}
const nomes = (page) =>
  page.evaluate(() =>
    Object.values(state.chars)
      .map((c) => c.nome)
      .sort()
  );
async function entrarEscolhendo(page, modo) {
  await page.locator('[data-a="contaentrar"]').first().click();
  await expect(page.locator(".modal")).toContainText("Na sua conta Google: 12 fichas");
  await page.locator(`.modal [data-a="contajuntar"][data-m="${modo}"]`).click();
  await expect(page.locator("#st")).toContainText("Salvo na sua conta Google");
  await expor(page);
}

test("ao entrar, usar as da conta troca as fichas do navegador", async ({ page: pc, context }) => {
  const celular = await contaComExemplos(pc, context);
  await criar(celular, "Thorin");
  await entrarEscolhendo(celular, "conta");
  const n = await nomes(celular);
  expect(n).toHaveLength(12);
  expect(n).not.toContain("Thorin");
});

test("ao entrar, adicionar as da conta mantém as duas e diferencia nomes iguais", async ({ page: pc, context }) => {
  const celular = await contaComExemplos(pc, context);
  await carregarExemplos(celular); // os mesmos nomes, mas outras fichas
  await criar(celular, "Thorin");
  await entrarEscolhendo(celular, "adicionar");
  const n = await nomes(celular);
  expect(n).toHaveLength(25);
  expect(n).toContain("Thorin");
  expect(n).toContain("Volis E'gurar");
  expect(n).toContain("Volis E'gurar (conta Google)");
  expect(n.filter((x) => x.endsWith(" (conta Google)"))).toHaveLength(12);
  // O outro aparelho recebe as novas
  await expor(pc);
  await expect.poll(() => nomes(pc).then((x) => x.length), { timeout: 5000 }).toBe(25);
});

test("ao entrar, substituir a conta deixa nela só as fichas do navegador", async ({ page: pc, context }) => {
  const celular = await contaComExemplos(pc, context);
  await criar(celular, "Thorin");
  await entrarEscolhendo(celular, "navegador");
  expect(await nomes(celular)).toEqual(["Thorin"]);
  await expor(pc);
  await expect.poll(() => nomes(pc), { timeout: 5000 }).toEqual(["Thorin"]);
});

test("cancelar a escolha não entra e não mexe nas fichas", async ({ page: pc, context }) => {
  const celular = await contaComExemplos(pc, context);
  await criar(celular, "Thorin");
  await celular.locator('[data-a="contaentrar"]').first().click();
  await expect(celular.locator(".modal")).toBeVisible();
  await celular.keyboard.press("Escape"); // a escolha é obrigatória: não fecha
  await celular.locator(".modal-bg").click({ position: { x: 5, y: 5 } });
  await expect(celular.locator(".modal")).toBeVisible();
  await celular.locator('.modal [data-a="contacancelar"]').click();
  await expect(celular.locator("#contaselo")).toContainText("Entrar com Google");
  await expor(celular);
  expect(await nomes(celular)).toEqual(["Thorin"]);
});

test("sair apagando tudo limpa o navegador; ao entrar de novo as fichas voltam da conta", async ({ page }) => {
  await abrir(page, "pc");
  await carregarExemplos(page);
  await entrar(page);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.locator('.modal [data-a="contasairok"][data-m="apagar"]').click();
  await expect(page.locator("#contaselo")).toContainText("Entrar com Google");
  await expect(page.getByText("Seu livro de aventuras ainda está em branco.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Seu livro de aventuras ainda está em branco.")).toBeVisible();
  // Navegador vazio: entra sem perguntar e traz tudo da conta
  await entrar(page);
  await expect(page.locator("#top h1")).toHaveText("Volis E'gurar");
  await expor(page);
  expect((await nomes(page)).length).toBe(12);
});
