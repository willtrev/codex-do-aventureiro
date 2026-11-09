/* As regras do Firebase (database.rules.json) não rodam nos testes do navegador, que usam o
   banco simulado. Este teste confere que todo caminho que o código grava dentro de uma mesa
   está declarado no lugar certo das regras: um bloco no lugar errado faz o Firebase recusar. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const regras = JSON.parse(readFileSync(new URL("../../database.rules.json", import.meta.url), "utf8")).rules;
const mesa = regras.mesas.$codigo;
const ler = (f) => readFileSync(new URL("../../" + f, import.meta.url), "utf8");
// Em mesa.js, base = mesas/<código>; em combate.js, base = mesas/<código>/mapa
const mesaJs = ler("js/tempo-real/mesa.js");
const combateJs = ler("js/tempo-real/combate.js");

test("todo caminho usado numa mesa existe nas regras, no nível da mesa", () => {
  const usados = new Set();
  for (const m of mesaJs.matchAll(/(?:\$\{base\}|mesas\/\$\{[^}]+\})\/([a-z]+)/g)) usados.add(m[1]);
  for (const m of combateJs.matchAll(/mesas\/\$\{[^}]+\}\/([a-z]+)/g)) usados.add(m[1]);
  assert.ok(usados.size >= 4, "deveria achar os caminhos usados no código");
  for (const nome of usados) assert.ok(mesa[nome], `falta "${nome}" em mesas/$codigo nas regras`);
});

test("membros só aceita papel, nome e online", () => {
  const filhos = Object.keys(regras.mesas.$codigo.membros.$uid).filter((k) => !k.startsWith("."));
  assert.deepEqual(filhos.sort(), ["$outro", "nome", "online", "papel"]);
});

test("personagem removido pelo mestre não grava a ficha; o próprio jogador pode limpar a marca", () => {
  assert.match(mesa.fichas.$ficha[".write"], /removidas/);
  assert.match(mesa.removidas.$ficha[".write"], /!newData\.exists\(\)/);
});

test("jogador pode apagar uma peça que já não existe (sair da mesa sem peça no mapa)", () => {
  assert.match(mesa.mapa.tokens.$id[".write"], /!data\.exists\(\) && \(!newData\.exists\(\)/);
});
