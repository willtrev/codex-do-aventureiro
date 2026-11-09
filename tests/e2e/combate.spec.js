import { test, expect, carregarExemplos } from "./ajuda.js";

/* Mapa de combate com o banco simulado: mestre e jogador em duas abas. */

async function prepararMesa(mestre, context) {
  await mestre.goto("/?banco=local&perfil=mestre#mestre");
  await mestre.fill("#camp_nome", "Strahd");
  await mestre.getByRole("button", { name: "Criar campanha" }).click();
  await mestre.getByRole("button", { name: "Abrir mesa online" }).click();
  const codigo = await mestre.locator(".mcodigo").innerText();
  const jogador = await context.newPage();
  await jogador.goto("/?banco=local&perfil=jogador");
  await carregarExemplos(jogador);
  await jogador.getByRole("button", { name: "Entrar numa mesa" }).click();
  await jogador.fill("#mesa_cod", codigo);
  await jogador.getByRole("button", { name: "Entrar", exact: true }).click();
  await mestre.getByRole("button", { name: "Abrir mapa de combate" }).click();
  await expect(mestre.locator("#cb_svg")).toBeVisible();
  await jogador.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(jogador.locator("#cb_svg")).toBeVisible();
  return jogador;
}
async function arrastar(page, alvo, dx, dy) {
  const b = await alvo.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}
const posicao = (loc) => loc.evaluate((e) => e.style.transform);

test("jogador move a própria peça e o mestre vê na hora; peça do monstro não se mexe", async ({
  page: mestre,
  context,
}) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Goblin");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await expect(jogador.locator(".tk")).toHaveCount(2);

  const minhaNoMestre = mestre.locator('.tk[id^="tk_pj_"]');
  const antes = await posicao(minhaNoMestre);
  await arrastar(jogador, jogador.locator(".tk.meu"), 160, 110);
  const destino = await posicao(jogador.locator(".tk.meu"));
  expect(destino).not.toBe(antes);
  await expect.poll(() => posicao(minhaNoMestre)).toBe(destino);

  const goblin = jogador.locator('.tk[id^="tk_m_"]');
  const goblinAntes = await posicao(goblin);
  await arrastar(jogador, goblin, 150, 150);
  expect(await posicao(goblin)).toBe(goblinAntes);
});

test("PV do monstro ficam com o mestre; o jogador vê só o estado", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Ogro");
  await mestre.fill("#cbm_pv", "10");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await mestre.fill("#cbm_valor", "6");
  await mestre.getByRole("button", { name: "Dano em Ogro" }).click();
  await expect(mestre.locator("#cb_lista")).toContainText("PV 4/10");
  await expect(jogador.locator('.tk[id^="tk_m_"]')).toHaveClass(/tk-muito/);
  await expect(jogador.locator("main")).not.toContainText("PV 4");
  await expect(jogador.locator("#cb_monstros")).toHaveCount(0);
});

test("iniciativa: todos entram na lista e o mestre define a ordem", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Goblin");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await mestre.getByRole("button", { name: "Começar combate" }).click();
  const nomes = (p) => p.locator("#cb_ordem .cb-nome");
  await expect(nomes(jogador)).toHaveText(["Volis E'gurar", "Goblin"]);
  await expect(jogador.locator("#cb_ordem")).toContainText("É a sua vez!");

  // Mestre sobe o Goblin com a seta
  await mestre.getByRole("button", { name: "Subir Goblin" }).click();
  await expect(nomes(jogador)).toHaveText(["Goblin", "Volis E'gurar"]);

  // Ou anota os valores e ordena
  await mestre.getByLabel("Iniciativa de Volis E'gurar").fill("17");
  await mestre.getByLabel("Iniciativa de Goblin").fill("9");
  await mestre.getByLabel("Iniciativa de Goblin").blur();
  await mestre.getByRole("button", { name: "Ordenar pelos valores" }).click();
  await expect(nomes(jogador)).toHaveText(["Volis E'gurar", "Goblin"]);
  await expect(jogador.locator("#cb_ordem .cb-valor")).toHaveText(["17", "9"]);

  // Monstro novo entra no fim da lista
  await mestre.fill("#cbm_nome", "Ogro");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await expect(nomes(jogador)).toHaveText(["Volis E'gurar", "Goblin", "Ogro"]);

  await mestre.getByRole("button", { name: "Próximo" }).click();
  await mestre.getByRole("button", { name: "Próximo" }).click();
  await mestre.getByRole("button", { name: "Próximo" }).click();
  await expect(jogador.locator("#cb_ordem")).toContainText("Rodada 2");
  await mestre.getByRole("button", { name: "Encerrar" }).click();
  await expect(jogador.locator("#cb_ordem")).toContainText("Combate não começou");
});

test("sem mesa, a tela de combate explica como entrar", async ({ page }) => {
  await page.goto("/#combate");
  await expect(page.locator("main")).toContainText("Para abrir o mapa, entre numa mesa");
});

test("imagem de fundo enviada pelo mestre aparece para o jogador", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  // PNG de 40×20 px gerado na hora
  const png = await mestre.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 20;
    c.getContext("2d").fillRect(0, 0, 40, 20);
    return c.toDataURL("image/png").split(",")[1];
  });
  await mestre.setInputFiles("#cbc_img", {
    name: "mapa.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(mestre.locator("#cbc_msg")).toContainText("Imagem enviada");
  await expect(jogador.locator("#cb_fundo image")).toHaveCount(1);
  // proporção 2:1 com 20 colunas → 10 linhas
  await expect(jogador.locator("#cb_svg")).toHaveAttribute("aria-label", /20 por 10/);
});

test("lista de peças embaixo do mapa: o mestre remove monstros e tira personagens da mesa", async ({
  page: mestre,
  context,
}) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Goblin");
  await mestre.fill("#cbm_qtd", "2");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();

  const pecas = mestre.locator("#cb_pecas li");
  await expect(pecas).toHaveCount(3);
  await expect(pecas.first()).toContainText("Volis E'gurar");
  await expect(pecas.first()).toContainText("Personagem de jogador");
  await expect(jogador.locator("#cb_pecas")).toHaveCount(0); // só o mestre vê a lista

  // Monstro: some do mapa dos dois
  await mestre
    .locator("#cb_pecas")
    .getByRole("button", { name: /Remover Goblin/ })
    .first()
    .click();
  await expect(pecas).toHaveCount(2);
  await expect(jogador.locator(".tk")).toHaveCount(2);

  // Personagem: confirma, sai da mesa e o jogador é desconectado
  await mestre.locator("#cb_pecas").getByRole("button", { name: "Tirar Volis E'gurar da mesa" }).click();
  await expect(mestre.locator(".modal")).toContainText("O jogador é desconectado");
  await mestre.locator('.modal [data-a="cbtirarok"]').click();
  await expect(pecas).toHaveCount(1);
  await expect(mestre.locator('.tk[id^="tk_pj_"]')).toHaveCount(0);
  await expect(jogador.locator("#mesaselo")).toContainText("O mestre tirou Volis E'gurar da mesa");
});
