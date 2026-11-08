/* Tendências permitidas por classe (Livro do Jogador). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALIGNS, alignBlock, alignCode } from "../../js/regras/tendencias.js";

const permitidas = (k) => ALIGNS.filter(([cod]) => !alignBlock(k, cod)).map(([cod]) => cod);

test("ordem das tendências: LB, LN, LM, NB, N, NM, CB, CN, CM", () => {
  assert.deepEqual(
    ALIGNS.map((a) => a[0]),
    ["LB", "LN", "LM", "NB", "N", "NM", "CB", "CN", "CM"]
  );
});

test("restrições por classe", () => {
  assert.deepEqual(permitidas("paladino"), ["LB"]);
  assert.deepEqual(permitidas("monge"), ["LB", "LN", "LM"]);
  assert.deepEqual(permitidas("barbaro"), ["NB", "N", "NM", "CB", "CN", "CM"]);
  assert.deepEqual(permitidas("bardo"), ["NB", "N", "NM", "CB", "CN", "CM"]);
  assert.deepEqual(permitidas("druida"), ["LN", "NB", "N", "NM", "CN"]);
  assert.equal(permitidas("mago").length, 9, "tendências más são permitidas (regra da mesa revogada)");
});

test("lê tendências escritas de várias formas", () => {
  assert.equal(alignCode("Leal e Neutro"), "LN");
  assert.equal(alignCode("caótico e bom"), "CB");
  assert.equal(alignCode("Lawful Evil"), "LM");
  assert.equal(alignCode("Neutral"), "N");
});
