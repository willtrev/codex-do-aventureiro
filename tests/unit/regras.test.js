/* Regras do D&D 3.5 conferidas contra as tabelas do Livro do Jogador. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { blankChar } from "../../js/personagens/modelos.js";
import { CLASSES, CLASS_ORDER, bonusSpells, cls } from "../../js/regras/classes.js";
import { bba, saves, slotTable, hpSuggest } from "../../js/regras/calculos.js";
import { mod } from "../../js/util.js";

const ficha = (classeKey, nivel, attr = {}) => {
  const c = blankChar();
  c.classeKey = classeKey;
  c.classe = CLASSES[classeKey].nome;
  c.nivel = nivel;
  Object.assign(c.attr, { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 }, attr);
  return c;
};
const bom = (L) => 2 + Math.floor(L / 2),
  ruim = (L) => Math.floor(L / 3);
const BBA = { boa: (L) => L, media: (L) => Math.floor((L * 3) / 4), ruim: (L) => Math.floor(L / 2) };
// Progressões do Livro do Jogador: BBA e testes (Fortitude, Reflexos, Vontade)
const TABELA = {
  barbaro: ["boa", bom, ruim, ruim],
  bardo: ["media", ruim, bom, bom],
  clerigo: ["media", bom, ruim, bom],
  druida: ["media", bom, ruim, bom],
  guerreiro: ["boa", bom, ruim, ruim],
  monge: ["media", bom, bom, bom],
  paladino: ["boa", bom, ruim, ruim],
  ranger: ["boa", bom, bom, ruim],
  ladino: ["media", ruim, bom, ruim],
  feiticeiro: ["ruim", ruim, ruim, bom],
  mago: ["ruim", ruim, ruim, bom],
};

test("as 11 classes básicas existem", () => {
  assert.deepEqual([...CLASS_ORDER].sort(), Object.keys(TABELA).sort());
});

for (const [k, [tipo, f, r, v]] of Object.entries(TABELA))
  test(`${CLASSES[k].nome}: BBA e testes de resistência do nível 1 ao 20`, () => {
    for (let L = 1; L <= 20; L++) {
      const c = ficha(k, L);
      assert.equal(bba(c), BBA[tipo](L), `BBA no nível ${L}`);
      const s = saves(c);
      assert.deepEqual([s.fort, s.ref, s.von], [f(L), r(L), v(L)], `testes no nível ${L}`);
    }
  });

test("modificador de atributo", () => {
  assert.deepEqual([1, 8, 9, 10, 11, 12, 18, 19, 20].map(mod), [-5, -1, -1, 0, 0, 1, 4, 4, 5]);
});

test("magias adicionais por atributo alto", () => {
  // Int 18 (+4): 1 extra no 1º ao 4º nível; Int 12 (+1): só no 1º; truques nunca ganham extra
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((l) => bonusSpells(18, l)),
    [0, 1, 1, 1, 1, 0]
  );
  assert.deepEqual(
    [1, 2].map((l) => bonusSpells(12, l)),
    [1, 0]
  );
  assert.equal(bonusSpells(26, 1), 2); // +8: dois extras no 1º nível
});

test("mago: espaços de magia por dia (tabela do Livro do Jogador + magias adicionais de Int 19)", () => {
  // Int 19 (+4) dá 1 magia extra do 1º ao 4º nível e permite magias até o 9º nível
  const esperado = {
    1: [3, 1 + 1],
    5: [4, 3 + 1, 2 + 1, 1 + 1],
    10: [4, 4 + 1, 4 + 1, 3 + 1, 3 + 1, 2],
    20: [4, 4 + 1, 4 + 1, 4 + 1, 4 + 1, 4, 4, 4, 4, 4],
  };
  for (const [L, linha] of Object.entries(esperado)) {
    const t = slotTable(ficha("mago", +L, { int: 19 }));
    assert.deepEqual(
      t.map((r) => r.normal),
      linha,
      `nível ${L}`
    );
  }
});

test("conjurador sem o atributo mínimo (10 + nível da magia) não recebe espaços daquele nível", () => {
  // Int 10 só permite truques; Int 11 já libera o 1º nível
  assert.deepEqual(
    slotTable(ficha("mago", 1, { int: 10 })).map((r) => r.l),
    [0]
  );
  assert.deepEqual(
    slotTable(ficha("mago", 1, { int: 11 })).map((r) => r.l),
    [0, 1]
  );
});

test("mago especialista ganha 1 espaço extra da escola em cada nível de magia, inclusive truques", () => {
  const c = ficha("mago", 3, { int: 16 });
  c.escola = "Encantamento";
  assert.deepEqual(
    slotTable(c).map((r) => r.escola),
    [1, 1, 1]
  );
  c.escola = "";
  assert.deepEqual(
    slotTable(c).map((r) => r.escola),
    [0, 0, 0]
  );
});

test("PV sugeridos: dado de vida cheio no 1º nível e média alta depois", () => {
  assert.equal(hpSuggest(ficha("mago", 1)), 4);
  assert.equal(hpSuggest(ficha("mago", 3)), 4 + 3 + 3);
  assert.equal(hpSuggest(ficha("guerreiro", 2, { con: 14 })), 10 + 2 + 6 + 2);
  assert.equal(cls(ficha("barbaro", 1)).dv, 12);
});
