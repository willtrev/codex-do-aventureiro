/* Integridade dos dados do SRD e das traduções. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SRD_MAGIAS } from "../../js/dados/srd-magias.js";
import { SRD_CLASSES } from "../../js/dados/srd-classes.js";
import { SRD_DOMINIOS } from "../../js/dados/srd-dominios.js";
import { SRD_TALENTOS } from "../../js/dados/srd-talentos.js";
import { SRD_EQUIPAMENTO } from "../../js/dados/srd-equipamento.js";
import { TR_MAGIAS } from "../../js/dados/traducoes-magias.js";
import { CAT, magiaPorNomeSRD } from "../../js/dados/catalogo.js";
import { CLASSES, CLASS_ORDER } from "../../js/regras/classes.js";
import { DOMAINS } from "../../js/regras/dominios.js";
import { FICHA_CAMPOS } from "../../js/dados/ficha-campos.js";

test("SRD: 606 magias, 11 classes, 22 domínios, talentos e equipamento", () => {
  assert.equal(SRD_MAGIAS.length, 606);
  assert.equal(Object.keys(SRD_CLASSES).length, 11);
  assert.equal(SRD_DOMINIOS.length, 22);
  assert.ok(SRD_TALENTOS.length >= 100, "talentos");
  assert.ok(SRD_EQUIPAMENTO.length >= 250, "equipamento");
});

test("cada classe tem a tabela completa do nível 1 ao 20", () => {
  for (const k of CLASS_ORDER) {
    const t = CLASSES[k].srd;
    assert.ok(t.length >= 20, CLASSES[k].nome); // algumas trazem também níveis épicos
    for (const linha of t.slice(0, 20))
      for (const campo of ["bba", "fort", "ref", "von"]) assert.equal(typeof linha[campo], "number");
  }
});

test("toda magia do SRD tem nome em português, sem nomes repetidos", () => {
  const semPt = SRD_MAGIAS.filter((m) => !TR_MAGIAS[m.nome] || !TR_MAGIAS[m.nome].nome).map((m) => m.nome);
  assert.deepEqual(semPt, []);
  const nomes = CAT.map((s) => s.nome.toLowerCase());
  const repetidos = nomes.filter((n, i) => nomes.indexOf(n) !== i);
  assert.deepEqual(repetidos, []);
});

test("toda magia do catálogo tem nível, escola e ao menos uma lista de classe ou domínio", () => {
  for (const s of CAT) {
    assert.ok(Number.isInteger(s.nivel) && s.nivel >= 0 && s.nivel <= 9, s.en);
    assert.ok(s.escola, s.en);
    assert.ok(Object.keys(s.listas).length + Object.keys(s.dominios).length > 0, s.en);
  }
});

test("magias de ataque de toque são marcadas (Raio de Gelo, Toque Chocante)", () => {
  assert.equal(CAT.find((s) => s.en === "Ray of Frost").ataque, "dist");
  assert.equal(CAT.find((s) => s.en === "Shocking Grasp").ataque, "corpo");
  assert.equal(CAT.find((s) => s.en === "Sleep").ataque, "");
});

test("busca de magia pelo nome em inglês aceita variações (Mass, Greater, Mage's)", () => {
  assert.equal(magiaPorNomeSRD("Sleep").en, "Sleep");
  assert.equal(magiaPorNomeSRD("mass cure light wounds").en, "Cure Light Wounds, Mass");
  assert.ok(magiaPorNomeSRD("Mage Armor"));
});

test("os 22 domínios do clérigo estão no app, com 9 magias cada", () => {
  assert.equal(Object.keys(DOMAINS).length, 22);
  for (const [nome, d] of Object.entries(DOMAINS)) assert.equal(d.m.length, 9, nome);
});

test("mapa da ficha oficial tem as posições dos campos usados na importação", () => {
  for (const n of [1, 2, 7, 8, 9, 13, 44, 47, 566, 570, 581]) assert.ok(FICHA_CAMPOS[n], "campo " + n);
});
