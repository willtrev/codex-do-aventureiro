/* Mesa de combate: regras puras (sem banco). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  casaLivre,
  corDoJogador,
  encaixar,
  estadoPorPV,
  iniciais,
  proximaVez,
  rolarIniciativa,
} from "../../js/tempo-real/combate.js";

test("estado do monstro a partir dos PV, sem revelar números", () => {
  assert.equal(estadoPorPV(10, 10), "ileso");
  assert.equal(estadoPorPV(6, 10), "ferido");
  assert.equal(estadoPorPV(4, 10), "muito ferido");
  assert.equal(estadoPorPV(0, 10), "caído");
  assert.equal(estadoPorPV(-3, 10), "morrendo");
  assert.equal(estadoPorPV(-10, 10), "morto");
});

test("iniciativa: maior total primeiro; empate decide pelo maior modificador", () => {
  const dados = [10, 10, 15];
  const ordem = rolarIniciativa(
    [
      { id: "a", nome: "Ana", mod: 1 },
      { id: "b", nome: "Bruno", mod: 3 },
      { id: "c", nome: "Goblin", mod: 0 },
    ],
    () => dados.shift()
  );
  assert.deepEqual(
    ordem.map((o) => [o.id, o.valor]),
    [
      ["c", 15],
      ["b", 13],
      ["a", 11],
    ]
  );
  const empate = rolarIniciativa(
    [
      { id: "x", nome: "X", mod: 1 },
      { id: "y", nome: "Y", mod: 4 },
    ],
    (() => {
      const d = [13, 10];
      return () => d.shift();
    })()
  );
  assert.deepEqual(
    empate.map((o) => o.id),
    ["y", "x"],
    "14 a 14: vence quem tem +4"
  );
});

test("passar a vez avança e começa nova rodada no fim da ordem", () => {
  const cb = { rodada: 1, vez: "b", ordem: [{ id: "a" }, { id: "b" }] };
  assert.deepEqual(proximaVez(cb), { ...cb, vez: "a", rodada: 2 });
  assert.deepEqual(proximaVez({ ...cb, vez: "a" }), { ...cb, vez: "b", rodada: 1 });
  assert.deepEqual(proximaVez({ ...cb, vez: "a", rodada: 2 }, -1), { ...cb, vez: "b", rodada: 1 });
});

test("peças encaixam na grade e não saem do mapa", () => {
  const cfg = { colunas: 10, linhas: 8 };
  assert.deepEqual(encaixar(3.4, 2.6, cfg), { x: 3, y: 3 });
  assert.deepEqual(encaixar(-2, 99, cfg), { x: 0, y: 7 });
});

test("peça nova vai para a primeira casa livre", () => {
  assert.deepEqual(casaLivre({}, { colunas: 5, linhas: 5 }), { x: 0, y: 0 });
  assert.deepEqual(casaLivre({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, { colunas: 5, linhas: 5 }), { x: 2, y: 0 });
});

test("cor fixa por jogador e iniciais do nome", () => {
  assert.equal(corDoJogador("abc"), corDoJogador("abc"));
  assert.equal(iniciais("Volis E'gurar"), "VE");
  assert.equal(iniciais("Goblin 3"), "G3");
});

test("listas guardadas pelo banco como objetos 0, 1, 2… voltam a ser listas", async () => {
  const { comoListas } = await import("../../js/util.js");
  assert.deepEqual(comoListas({ a: { 0: "x", 1: "y" }, b: { nome: "z" } }), { a: ["x", "y"], b: { nome: "z" } });
  assert.deepEqual(comoListas({ grimorio: { 0: { nome: "Sono" } } }).grimorio, [{ nome: "Sono" }]);
});
