import { test, expect, carregarExemplos, expor } from "./ajuda.js";

/* Mesa online com o banco simulado (?banco=local): duas abas do mesmo navegador fazem
   o papel do mestre e do jogador; ?perfil= separa as fichas salvas de cada uma. */

async function abrirMesa(mestre) {
  await mestre.goto("/?banco=local&perfil=mestre#mestre");
  await expect(mestre.locator("#top")).not.toBeEmpty();
  await mestre.fill("#camp_nome", "A Maldição de Strahd");
  await mestre.getByRole("button", { name: "Criar campanha" }).click();
  await mestre.getByRole("button", { name: "Abrir mesa online" }).click();
  await expect(mestre.locator(".mcodigo")).toHaveText(/^[A-Z0-9]{6}$/);
  return mestre.locator(".mcodigo").innerText();
}
async function entrar(jogador, codigo) {
  await jogador.goto("/?banco=local&perfil=jogador");
  await expect(jogador.locator("#top")).not.toBeEmpty();
  await carregarExemplos(jogador);
  await jogador.getByRole("button", { name: "Entrar numa mesa" }).click();
  await jogador.fill("#mesa_cod", codigo);
  await jogador.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(jogador.locator("#mesaselo")).toContainText("ao vivo");
}

test("ficha do jogador aparece no hub e se atualiza sozinha", async ({ page: mestre, context }) => {
  const codigo = await abrirMesa(mestre);
  const jogador = await context.newPage();
  await entrar(jogador, codigo);

  const card = mestre.locator(".mcard", { hasText: "Volis E'gurar" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("● ao vivo");
  await expect(card.locator(".stat", { hasText: "CA" }).first()).toContainText("12");

  // Armadura Arcana ligada aparece no card do mestre, com a CA nova, até ser desligada
  await jogador.locator('[data-a="ef"][data-k="armaduraArcana"]').click();
  await expect(card.locator(".mefeitos")).toContainText("Armadura Arcana");
  await expect(card.locator(".stat", { hasText: "CA" }).first()).toContainText("16");
  await jogador.locator('[data-a="ef"][data-k="armaduraArcana"]').click();
  await expect(card.locator(".mefeitos")).not.toContainText("Armadura Arcana");

  // Dano do jogador chega ao mestre sem atrapalhar o que ele está digitando
  const nome = mestre.locator("#camp_ren");
  await nome.click();
  await nome.fill("Strahd — sessão 3 (editando");
  await jogador.fill("#hpamt", "3");
  await jogador.locator('[data-a="dmg"]').click();
  await expect(card.locator(".big")).toHaveText("2");
  await expect(nome).toBeFocused();
  await expect(nome).toHaveValue("Strahd — sessão 3 (editando");

  // A ficha completa também chega (Detalhes)
  await expor(mestre);
  await expect.poll(() => mestre.evaluate(() => campanha().membros[0].c.hp.atual), { timeout: 5000 }).toBe(2);

  // Jogador sai: o card fica, como offline
  await jogador.getByRole("button", { name: "Sair da mesa" }).click();
  await jogador.locator('.modal [data-a="mesasairok"]').click();
  await expect(card).toContainText("○ offline");
});

test("código errado mostra mensagem", async ({ page }) => {
  await page.goto("/?banco=local&perfil=jogador");
  await expect(page.locator("#top")).not.toBeEmpty();
  await carregarExemplos(page);
  await page.getByRole("button", { name: "Entrar numa mesa" }).click();
  await page.fill("#mesa_cod", "ZZZZZZ");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator("#mesa_msg")).toContainText("Não existe mesa com o código ZZZZZZ");
});

test("link de convite abre a janela com o código preenchido", async ({ page: mestre, context }) => {
  const codigo = await abrirMesa(mestre);
  const jogador = await context.newPage();
  await jogador.goto("/?banco=local&perfil=jogador");
  await carregarExemplos(jogador);
  await jogador.goto(`/?banco=local&perfil=jogador#entrar=${codigo}`);
  await expect(jogador.locator("#mesa_cod")).toHaveValue(codigo);
});

test("jogador que recarrega a página volta sozinho para a mesa", async ({ page: mestre, context }) => {
  const codigo = await abrirMesa(mestre);
  const jogador = await context.newPage();
  await entrar(jogador, codigo);
  await jogador.reload();
  await expect(jogador.locator("#mesaselo")).toContainText("ao vivo");
  await expect(mestre.locator(".mcard")).toHaveCount(1);
});
