import { test, expect, carregarExemplos, expor } from "./ajuda.js";

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
  await mestre.uncheck("#cbm_esc"); // visível para os jogadores desde já
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
  await mestre.uncheck("#cbm_esc"); // visível para os jogadores desde já
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
  await mestre.uncheck("#cbm_esc"); // visível para os jogadores desde já
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
  await mestre.uncheck("#cbm_esc"); // visível para os jogadores desde já
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
  await mestre.uncheck("#cbm_esc"); // visível para os jogadores desde já
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();

  // Monstros na lista ao lado; personagens em "Peças no mapa", embaixo do mapa
  const secao = mestre.locator(".cb-pecas-secao");
  const monstros = mestre.locator(".cb-lado #cb_lista li");
  const pecas = secao.locator("#cb_pecas li");
  await expect(monstros).toHaveCount(2);
  await expect(pecas).toHaveCount(1);
  await expect(pecas.first()).toContainText("Volis E'gurar");
  await expect(pecas.first()).toContainText("Personagem de jogador");
  await expect(jogador.locator(".cb-pecas-secao")).toHaveCount(0); // só o mestre vê a lista

  // Monstro: some do mapa dos dois
  await mestre
    .locator("#cb_lista")
    .getByRole("button", { name: /Remover Goblin/ })
    .first()
    .click();
  await expect(monstros).toHaveCount(1);
  await expect(jogador.locator(".tk")).toHaveCount(2);

  // Personagem: confirma, sai da mesa e o jogador é desconectado
  await mestre.locator("#cb_pecas").getByRole("button", { name: "Tirar Volis E'gurar da mesa" }).click();
  await expect(mestre.locator(".modal")).toContainText("O jogador é desconectado");
  await mestre.locator('.modal [data-a="cbtirarok"]').click();
  await expect(pecas).toHaveCount(0);
  await expect(mestre.locator('.tk[id^="tk_pj_"]')).toHaveCount(0);
  await expect(jogador.locator("#mesaselo")).toContainText("O mestre tirou Volis E'gurar da mesa");
});

test("fichas importadas no hub: o mestre põe e tira do mapa", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  // Duas fichas importadas no hub (sem jogador na mesa)
  await mestre.evaluate(() => (location.hash = "mestre"));
  await expor(mestre);
  const backups = await mestre.evaluate(() =>
    testChars()
      .slice(0, 2)
      .map((c) => ({ nome: c.nome, json: JSON.stringify(c) }))
  );
  for (const b of backups) {
    await mestre.getByRole("button", { name: "Colar backup" }).click();
    await mestre.fill("#mbk", b.json);
    await mestre.getByRole("button", { name: "Adicionar à campanha" }).click();
    await mestre.locator('.modal [data-a="close"]').first().click();
  }
  await mestre.getByRole("button", { name: "Abrir mapa de combate" }).click();
  await expect(mestre.locator("#cb_svg")).toBeVisible();

  const fichas = mestre.locator("#cb_fichas li");
  await expect(fichas).toHaveCount(3); // o jogador da mesa + as duas do hub
  const primeira = fichas.filter({ hasText: backups[0].nome });
  await expect(primeira).toContainText("Ficha do hub · fora do mapa");
  await expect(fichas.filter({ hasText: "Volis E'gurar" })).toContainText("Jogador na mesa · no mapa");

  // Colocar: aparece no mapa dos dois e na lista de peças
  await primeira.getByRole("button", { name: /Colocar .* no mapa/ }).click();
  await expect(primeira).toContainText("no mapa");
  await expect(mestre.locator('.tk[id^="tk_h_"]')).toHaveCount(1);
  await expect(jogador.locator('.tk[id^="tk_h_"]')).toHaveCount(1);
  await expect(mestre.locator("#cb_pecas")).toContainText("Ficha do hub");

  // Tirar: some do mapa
  await primeira.getByRole("button", { name: /Tirar .* do mapa/ }).click();
  await expect(mestre.locator('.tk[id^="tk_h_"]')).toHaveCount(0);
  await expect(jogador.locator('.tk[id^="tk_h_"]')).toHaveCount(0);

  // Personagem do jogador: tirar do mapa não desconecta e a peça não volta ao reabrir o mapa
  const volis = fichas.filter({ hasText: "Volis E'gurar" });
  await volis.getByRole("button", { name: /Tirar .* do mapa/ }).click();
  await expect(jogador.locator(".tk.meu")).toHaveCount(0);
  await expect(jogador.locator("#mesaselo, #top")).not.toContainText("O mestre tirou");
  await jogador.reload();
  await expect(jogador.locator("#cb_svg")).toBeVisible();
  await jogador.waitForTimeout(500);
  await expect(jogador.locator(".tk.meu")).toHaveCount(0);
  // E o mestre põe de volta
  await volis.getByRole("button", { name: /Colocar .* no mapa/ }).click();
  await expect(jogador.locator(".tk.meu")).toHaveCount(1);
});

test("o mestre vê os PV dos jogadores no mapa; o jogador não", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  const pecaNoMestre = mestre.locator('.tk[id^="tk_pj_"]');
  await expect(pecaNoMestre.locator(".tk-pvtxt")).toHaveText("5/5");
  await expect(pecaNoMestre.locator(".tk-pv")).toHaveCount(1);
  // O jogador vê só o estado, sem números
  await expect(jogador.locator(".tk.meu .tk-nome")).toHaveText("Volis E'gurar");
  await expect(jogador.locator(".tk.meu .tk-placa")).toHaveCount(0);

  // Dano na ficha do jogador: o mapa do mestre atualiza na hora
  await jogador.evaluate(() => (location.hash = "painel"));
  await jogador.fill("#hpamt", "3");
  await jogador.locator('[data-a="dmg"]').click();
  await expect(pecaNoMestre.locator(".tk-pvtxt")).toHaveText("2/5");
  await expect(pecaNoMestre.locator(".tk-pv")).toHaveClass(/grave/);
});

/* ----- Monstros escondidos dos jogadores ----- */

test("monstro novo entra escondido: o mestre vê transparente com o olho riscado, o jogador não vê", async ({
  page: mestre,
  context,
}) => {
  const jogador = await prepararMesa(mestre, context);
  await expect(mestre.locator("#cbm_esc")).toBeChecked(); // escondido é o padrão
  await mestre.fill("#cbm_nome", "Ogro");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();

  const noMestre = mestre.locator(".tk", { hasText: "Ogro" });
  await expect(noMestre).toHaveClass(/tk-escondido/);
  await expect(noMestre.locator(".tk-olho")).toHaveCount(1);
  await expect(mestre.locator("#cb_lista")).toContainText("1 de 1 escondido(s) dos jogadores");
  await jogador.waitForTimeout(500);
  await expect(jogador.locator(".tk", { hasText: "Ogro" })).toHaveCount(0);

  // Escondido não é só na tela: a peça não está no mapa que os jogadores leem
  const lerBanco = (p) =>
    mestre.evaluate(async (caminho) => {
      const { mesaCombate } = await import(new URL("js/tempo-real/combate.js", location.href));
      const { conectarBanco } = await import(new URL("js/tempo-real/banco.js", location.href));
      const b = await conectarBanco();
      const v = (await b.ler(caminho.replace("<codigo>", mesaCombate.codigo))) || {};
      return Object.values(v).map((t) => t.nome);
    }, p);
  expect(await lerBanco("mesas/<codigo>/mapa/tokens")).not.toContain("Ogro");
  expect(await lerBanco("privado/<codigo>/escondidos")).toContain("Ogro");

  // O mestre ainda move a peça escondida
  const antes = await noMestre.evaluate((e) => e.style.transform);
  await arrastar(mestre, noMestre, 100, 0);
  await expect.poll(() => noMestre.evaluate((e) => e.style.transform)).not.toBe(antes);

  // Mostrar: aparece para o jogador na mesma casa, sem a transparência
  await mestre.getByRole("button", { name: "Mostrar Ogro" }).click();
  const noJogador = jogador.locator(".tk", { hasText: "Ogro" });
  await expect(noJogador).toHaveCount(1);
  await expect(noMestre).not.toHaveClass(/tk-escondido/);
  expect(await noJogador.evaluate((e) => e.style.transform)).toBe(await noMestre.evaluate((e) => e.style.transform));

  // E esconder de novo
  await mestre.getByRole("button", { name: "Esconder Ogro" }).click();
  await expect(noJogador).toHaveCount(0);
  await expect(noMestre).toHaveClass(/tk-escondido/);
});

test("mostrar e esconder vários monstros marcados", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Goblin");
  await mestre.fill("#cbm_qtd", "3");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await expect(mestre.locator(".tk.tk-escondido")).toHaveCount(3);

  // Marca dois e mostra
  await mestre.getByRole("checkbox", { name: "Marcar Goblin 1" }).check();
  await mestre.getByRole("checkbox", { name: "Marcar Goblin 3" }).check();
  await mestre.getByRole("button", { name: "Mostrar marcados" }).click();
  await expect(jogador.locator(".tk", { hasText: "Goblin" })).toHaveCount(2);
  await expect(jogador.locator(".tk", { hasText: "Goblin 2" })).toHaveCount(0);
  await expect(mestre.locator(".tk.tk-escondido")).toHaveCount(1);

  // Marcar todos e esconder
  await mestre.getByRole("checkbox", { name: "Marcar todos" }).check();
  await mestre.getByRole("button", { name: "Esconder marcados" }).click();
  await expect(jogador.locator(".tk", { hasText: "Goblin" })).toHaveCount(0);
  await expect(mestre.locator(".tk.tk-escondido")).toHaveCount(3);
});

test("monstro escondido entra na iniciativa só para o mestre", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Espreitador");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  await mestre.getByRole("button", { name: "Começar combate" }).click();
  await expect(mestre.locator("#cb_ordem")).toContainText("Espreitador");
  await expect(jogador.locator("#cb_ordem")).toContainText("Volis E'gurar");
  await expect(jogador.locator("#cb_ordem")).not.toContainText("Espreitador");
  // Ao aparecer, entra na ordem dos jogadores também
  await mestre.getByRole("button", { name: "Mostrar Espreitador" }).click();
  await expect(jogador.locator("#cb_ordem")).toContainText("Espreitador");
});

test("o mestre vê os PV dos monstros na peça, e a placa muda com dano", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Orc");
  await mestre.fill("#cbm_pv", "10");
  await mestre.uncheck("#cbm_esc");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  const orc = mestre.locator(".tk", { hasText: "Orc" });
  await expect(orc.locator(".tk-pvtxt")).toHaveText("10/10");

  await mestre.fill("#cbm_valor", "6");
  await mestre.getByRole("button", { name: "Dano em Orc" }).click();
  await expect(orc.locator(".tk-pvtxt")).toHaveText("4/10");
  await expect(orc.locator(".tk-pv")).toHaveClass(/grave/);
  // O jogador vê o estado, sem números
  const noJogador = jogador.locator(".tk", { hasText: "Orc" });
  await expect(noJogador).toHaveClass(/tk-muito/);
  await expect(noJogador.locator(".tk-placa")).toHaveCount(0);
});

/* ----- Menu da peça (botão direito) ----- */

test("botão direito no monstro: revelar, esconder, matar e remover", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  await mestre.fill("#cbm_nome", "Troll");
  await mestre.getByRole("button", { name: "Adicionar ao mapa" }).click();
  const troll = mestre.locator(".tk", { hasText: "Troll" });
  const menu = mestre.getByRole("menu", { name: "Ações de Troll" });
  const noJogador = jogador.locator(".tk", { hasText: "Troll" });

  // Revelar
  await troll.click({ button: "right" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveText(["Revelar", "Matar", "Remover"]);
  await menu.getByRole("menuitem", { name: "Revelar" }).click();
  await expect(menu).toHaveCount(0);
  await expect(noJogador).toHaveCount(1);

  // Esconder, e Esc fecha o menu sem fazer nada
  await troll.click({ button: "right" });
  await mestre.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await troll.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Esconder" }).click();
  await expect(noJogador).toHaveCount(0);

  // Matar: fica morto (com o X) e "Matar" some do menu
  await troll.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Matar" }).click();
  await expect(troll).toHaveClass(/tk-caido/);
  await expect(troll.locator(".tk-pvtxt")).toHaveText("-10/6");
  await expect(mestre.locator("#cb_lista")).toContainText("morto");
  await troll.click({ button: "right" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Revelar", "Remover"]);

  // Remover
  await menu.getByRole("menuitem", { name: "Remover" }).click();
  await expect(troll).toHaveCount(0);
});

test("botão direito no personagem e clique fora; o jogador não tem o menu", async ({ page: mestre, context }) => {
  const jogador = await prepararMesa(mestre, context);
  const volis = mestre.locator('.tk[id^="tk_pj_"]');
  const menu = mestre.getByRole("menu");
  await volis.click({ button: "right" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Tirar do mapa", "Tirar da mesa"]);
  // Clique fora fecha
  await mestre.locator("h2", { hasText: "Iniciativa" }).click();
  await expect(menu).toHaveCount(0);

  await volis.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Tirar do mapa" }).click();
  await expect(jogador.locator(".tk.meu")).toHaveCount(0);

  // No jogador, o botão direito não abre o menu
  await mestre
    .locator("#cb_fichas")
    .getByRole("button", { name: /Colocar .* no mapa/ })
    .click();
  await expect(jogador.locator(".tk.meu")).toHaveCount(1);
  await jogador.locator(".tk.meu").click({ button: "right" });
  await expect(jogador.getByRole("menu")).toHaveCount(0);
});
