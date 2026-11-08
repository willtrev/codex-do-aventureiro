/* Conversão dos textos do SRD para português. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { trAlcance, trExecucao, trTeste, trComponentes } from "../../js/regras/traduzir.js";
import { CAT } from "../../js/dados/catalogo.js";

test("alcances padrão viram curto, médio e longo", () => {
  assert.equal(trAlcance("Close (25 ft. + 5 ft./2 levels)"), "curto");
  assert.equal(trAlcance("Medium (100 ft. + 10 ft./level)"), "médio");
  assert.equal(trAlcance("Long (400 ft. + 40 ft./level)"), "longo");
  assert.equal(trAlcance(""), "—");
});

test("distâncias em pés viram metros", () => {
  assert.match(trAlcance("30 ft."), /9 m/);
  assert.match(trAlcance("80 ft."), /24 m/);
});

test("tempo de execução", () => {
  assert.equal(trExecucao("1 standard action"), "padrão");
  assert.equal(trExecucao("1 full round"), "1 rodada completa");
});

test("testes de resistência por extenso, sem abreviações", () => {
  assert.equal(trTeste("Will negates"), "Vontade evita o efeito");
  assert.equal(trTeste("Reflex half"), "Reflexos reduz o dano à metade");
  assert.equal(trTeste(""), "nenhum");
  for (const s of CAT) assert.doesNotMatch(s.ts, /\b(Will|Reflex|Fortitude) (negates|half|partial)\b/, s.en);
});

test("componentes: S vira G (gestual) e DF vira FD (foco divino)", () => {
  assert.equal(trComponentes("V, S, M"), "V, G, M");
  assert.match(trComponentes("V, S, DF"), /FD/);
});
