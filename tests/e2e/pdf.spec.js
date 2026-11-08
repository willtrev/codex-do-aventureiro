import { test, expect, abrir, aba, carregarExemplos, temFichaPdf } from "./ajuda.js";

/* Importação de PDF: ficha editável, ficha sem formulário, outro modelo e PDF só com imagem.
   Os testes que usam a ficha oficial precisam de public/ficha.pdf (fora do git). */

async function importarBytes(page, base64, nome = "ficha.pdf") {
  // O botão fica na tela inicial e na aba Notas e backup
  if (!(await page.locator('[data-a="importpdf"]').count())) await aba(page, "notas");
  await page.locator('[data-a="importpdf"]').first().click();
  await page.setInputFiles("#pdfimport", {
    name: nome,
    mimeType: "application/pdf",
    buffer: Buffer.from(base64, "base64"),
  });
}
const paraBase64 = "let s='';b.forEach((x)=>(s+=String.fromCharCode(x)));return btoa(s);";

test.describe("com a ficha oficial", () => {
  test.skip(!temFichaPdf, "coloque a ficha editável em public/ficha.pdf para rodar estes testes");

  for (const achatada of [false, true])
    test(`exportar e importar de volta ${achatada ? "uma ficha sem formulário" : "a ficha editável"}`, async ({
      page,
    }) => {
      await abrir(page);
      await carregarExemplos(page);
      const original = await page.evaluate(() => {
        const c = cur();
        return { ca: ac(c).total, pv: c.hp.max, magias: c.grimorio.length };
      });
      const b64 = await page.evaluate(
        new Function(
          "achatada",
          `return (async () => {
            const PDFLib = await loadPdfLib();
            const pdf = await PDFLib.PDFDocument.load(await (await fetch("ficha.pdf")).arrayBuffer());
            const form = pdf.getForm();
            const { T } = buildPdfFields(cur());
            for (const [k, v] of Object.entries(T)) { try { form.getTextField(k).setText(pdfSafe(v)); } catch (e) {} }
            if (achatada) { form.updateFieldAppearances(await pdf.embedFont(PDFLib.StandardFonts.Helvetica)); form.flatten(); }
            const b = await pdf.save(); ${paraBase64}
          })()`
        ),
        achatada
      );
      await importarBytes(page, b64);
      await expect(page.locator(".modal")).toContainText("Revisar importação");
      if (achatada) await expect(page.locator(".modal")).toContainText("Ficha sem campos editáveis");
      else await expect(page.locator(".modal")).toContainText("Tudo importado");
      await page.locator('[data-a="impconfirmar"]').click();
      const importado = await page.evaluate(() => {
        const c = cur();
        return { ca: ac(c).total, pv: c.hp.max, magias: c.grimorio.length };
      });
      expect(importado).toEqual(original);
    });

  test("exportar PDF baixa a ficha preenchida", async ({ page }) => {
    await abrir(page);
    await carregarExemplos(page);
    const download = page.waitForEvent("download");
    await page.locator('[data-a="exportpdf"]').first().click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test("PDF de outro modelo é lido pelos rótulos, com aviso", async ({ page }) => {
  await abrir(page);
  const b64 = await page.evaluate(
    new Function(`return (async () => {
      const PDFLib = await loadPdfLib();
      const d = await PDFLib.PDFDocument.create();
      const pg = d.addPage([595, 842]);
      const f = await d.embedFont(PDFLib.StandardFonts.Helvetica);
      ["Nome: Thorin", "Classe: Guerreiro 2     Raca: Anao", "FOR 16  DES 12  CON 14  INT 10  SAB 10  CAR 8", "PV 20   CA 17"]
        .forEach((t, i) => pg.drawText(t, { x: 40, y: 800 - i * 20, size: 11, font: f }));
      const b = await d.save(); ${paraBase64}
    })()`)
  );
  await importarBytes(page, b64, "outra-ficha.pdf");
  await expect(page.locator(".modal")).toContainText("Outro modelo de ficha");
  await page.locator('[data-a="impconfirmar"]').click();
  await expect(page.locator("#top h1")).toHaveText("Thorin");
  expect(await page.evaluate(() => ac(cur()).total)).toBe(17);
});

test("PDF só com imagem explica que não há texto", async ({ page }) => {
  await abrir(page);
  const b64 = await page.evaluate(
    new Function(`return (async () => {
      const PDFLib = await loadPdfLib();
      const d = await PDFLib.PDFDocument.create();
      d.addPage().drawRectangle({ x: 10, y: 10, width: 100, height: 100 });
      const b = await d.save(); ${paraBase64}
    })()`)
  );
  await importarBytes(page, b64, "foto.pdf");
  await expect(page.locator("#pdfimpmsg")).toContainText("parece ser só imagem");
});
