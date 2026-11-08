/* Adicionar talentos e equipamento do SRD à ficha. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EQUIP_SRD, TALENTOS_SRD, addEquip, addFeat, libraParaKg, precoEmPO } from "../../js/interface/srd-escolha.js";
import { blankChar } from "../../js/personagens/modelos.js";

const achar = (en) => EQUIP_SRD.find((e) => e.en === en).i;

test("conversões de peso e preço", () => {
  assert.equal(libraParaKg("4 lb."), 2);
  assert.equal(libraParaKg("1-1/2 lb."), 0.75);
  assert.equal(libraParaKg("1/2 lb."), 0.25);
  assert.equal(precoEmPO("35 gp"), 35);
  assert.equal(precoEmPO("5 sp"), 0.5);
  assert.equal(precoEmPO("1,500 gp"), 1500);
});

test("comprar desconta o dinheiro e recusa se faltar", () => {
  const c = blankChar();
  c.dinheiro = { pl: 0, po: 10, pp: 0, pc: 0 };
  assert.match(addEquip(c, achar("Longsword"), true), /insuficiente/, "espada longa custa 15 PO");
  assert.equal(c.itens.length, 0);
  addEquip(c, achar("Dagger"), true);
  assert.deepEqual(c.dinheiro, { pl: 0, po: 8, pp: 0, pc: 0 });
});

test("arma entra no inventário e em Minhas armas; adaga também como arremesso", () => {
  const c = blankChar();
  addEquip(c, achar("Dagger"), false);
  assert.equal(c.itens.length, 1);
  assert.deepEqual(
    c.ataques.map((w) => w.tipo),
    ["corpo", "arremesso"]
  );
});

test("munição em pacote soma a quantidade", () => {
  const c = blankChar();
  const i = EQUIP_SRD.find((e) => /^Bolts.*\(10\)$/.test(e.en)).i;
  addEquip(c, i, false);
  addEquip(c, i, false);
  assert.equal(c.itens.length, 1);
  assert.equal(c.itens[0].qtd, 20);
});

test("armadura e escudo ajustam a CA", () => {
  const c = blankChar();
  addEquip(c, achar("Chain shirt"), false);
  addEquip(c, EQUIP_SRD.find((e) => /^Shield, heavy wooden/i.test(e.en)).i, false);
  assert.equal(c.ca.armadura, 4);
  assert.equal(c.ca.escudo, 2);
});

test("talento do SRD guarda o nome em inglês e o benefício", () => {
  const c = blankChar();
  addFeat(c, TALENTOS_SRD.find((t) => t.en === "Combat Casting").i);
  assert.equal(c.talentos[0].en, "Combat Casting");
  assert.match(c.talentos[0].obs, /\+4/);
});
