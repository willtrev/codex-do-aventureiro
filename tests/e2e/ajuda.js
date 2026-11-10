/* Ajuda para os testes de ponta a ponta.
   - Falha o teste se a página tiver qualquer erro de JavaScript.
   - Usa as cópias locais do pdf-lib e do pdf.js (node_modules), para não depender da internet.
   - expor(page): deixa as funções dos módulos acessíveis em window, para os testes lerem o estado. */
import { test as base, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const require = createRequire(import.meta.url);
const local = (p) => {
  try {
    return readFileSync(require.resolve(p));
  } catch {
    return null;
  }
};
const LIBS = {
  "pdf-lib": local("pdf-lib/dist/pdf-lib.min.js"),
  "pdf.min.mjs": local("pdfjs-dist/build/pdf.min.mjs"),
  "pdf.worker.min.mjs": local("pdfjs-dist/build/pdf.worker.min.mjs"),
};

const RAIZ = new URL("../../", import.meta.url).pathname;
const listar = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listar(join(d, e.name)) : e.name.endsWith(".js") && e.name !== "app.js" ? [join(d, e.name)] : []
  );
const MODULOS = listar(join(RAIZ, "js")).map((f) => "/" + relative(RAIZ, f).split("\\").join("/"));

export const test = base.extend({
  page: async ({ page }, use) => {
    const erros = [];
    page.on("pageerror", (e) => erros.push(e.message));
    if (LIBS["pdf-lib"])
      await page.route("**/ajax/libs/pdf-lib/**", (r) =>
        r.fulfill({ body: LIBS["pdf-lib"], contentType: "application/javascript" })
      );
    for (const f of ["pdf.min.mjs", "pdf.worker.min.mjs"])
      if (LIBS[f])
        await page.route("**/ajax/libs/pdf.js/**/" + f, (r) =>
          r.fulfill({
            body: LIBS[f],
            contentType: "application/javascript",
            headers: { "access-control-allow-origin": "*" },
          })
        );
    await use(page);
    expect(erros, "erros de JavaScript na página").toEqual([]);
  },
});
export { expect };

/** Abre o app (opcionalmente numa aba) e espera o topo aparecer. */
export async function abrir(page, hash = "") {
  await page.goto("/" + (hash ? "#" + hash : ""));
  await expect(page.locator("#top")).not.toBeEmpty();
  await expor(page);
}
export async function expor(page) {
  await page.evaluate(async (mods) => {
    for (const m of mods) {
      const ns = await import(m);
      for (const k of Object.keys(ns)) Object.defineProperty(window, k, { get: () => ns[k], configurable: true });
    }
  }, MODULOS);
}
/** Carrega o Volis e os 11 personagens de teste pela tela inicial. */
export async function carregarExemplos(page) {
  await page.getByRole("button", { name: "Carregar exemplos" }).click();
  await page.getByRole("button", { name: "Carregar selecionados" }).click(); // todos vêm marcados
  await expect(page.locator("#top h1")).toHaveText("Volis E'gurar");
}
/** Vai para uma aba do personagem ativo. */
export async function aba(page, nome) {
  await page.evaluate((h) => (location.hash = h), nome);
  await page.waitForFunction((h) => location.hash === "#" + h, nome);
}
export const temFichaPdf = (() => {
  try {
    readFileSync(join(RAIZ, "public/ficha.pdf"));
    return true;
  } catch {
    return false;
  }
})();
