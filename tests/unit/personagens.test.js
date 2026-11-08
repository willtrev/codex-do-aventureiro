/* Os 12 personagens de exemplo têm de calcular sempre os mesmos números
   (PV, CA, BBA, testes, perícias, espaços de magia, recursos, ataques e carga). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { volis } from "../../js/personagens/modelos.js";
import { testChars } from "../../js/personagens/testes.js";
import { resumo } from "./resumo.js";

const esperado = readFileSync(new URL("../fixtures/personagens-esperados.txt", import.meta.url), "utf8")
  .trim()
  .split(/\r?\n/); // aceita quebras de linha do Windows (CRLF)
const chars = [volis(1), ...testChars()];

test("há um personagem de exemplo para cada uma das 11 classes, além do Volis", () => {
  assert.equal(chars.length, 12);
  assert.equal(new Set(testChars().map((c) => c.classeKey)).size, 11);
});

for (const [i, c] of chars.entries())
  test(`${c.nome}: valores calculados não mudaram`, () => {
    assert.equal(resumo(c), esperado[i]);
  });
