/* Resumo ao vivo enviado ao mestre: valores do card e efeitos ativos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { volis } from "../../js/personagens/modelos.js";
import { testChars } from "../../js/personagens/testes.js";
import { efeitosAtivos, resumoAoVivo } from "../../js/tempo-real/resumo.js";
import { fichaParaEnvio, gerarCodigo, normCodigo } from "../../js/tempo-real/mesa.js";
import { ac } from "../../js/regras/calculos.js";

test("resumo traz PV, CA e números de combate iguais aos da ficha", () => {
  const c = volis(1);
  const r = resumoAoVivo(c);
  assert.equal(r.nome, "Volis E'gurar");
  assert.deepEqual(r.ca, { total: 12, toque: 12, surpresa: 10 });
  assert.deepEqual([r.fort, r.ref, r.von, r.bba], [1, 2, 3, 0]);
  assert.ok(JSON.stringify(r).length < 1500, "resumo pequeno para enviar a cada mudança");
});

test("Armadura Arcana ligada aparece nos efeitos e soma na CA", () => {
  const c = volis(1);
  assert.deepEqual(efeitosAtivos(c), []);
  c.ef.armaduraArcana = true;
  assert.deepEqual(efeitosAtivos(c), ["Armadura Arcana"]);
  assert.equal(resumoAoVivo(c).ca.total, ac(volis(1)).total + 4);
});

test("efeitos de classe, como a Fúria do bárbaro", () => {
  const b = testChars().find((x) => x.classeKey === "barbaro");
  b.ef.furia = true;
  assert.deepEqual(efeitosAtivos(b), ["Em fúria"]);
});

test("código da mesa: 6 caracteres sem letras que confundem (0/O, 1/I/L)", () => {
  for (let i = 0; i < 200; i++) assert.match(gerarCodigo(), /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(normCodigo(" k7m-2qx "), "K7M2QX");
});

test("ficha enviada não leva as descrições longas das magias nem o vínculo da mesa", () => {
  const c = volis(1);
  c.mesa = { codigo: "ABCDEF" };
  const f = fichaParaEnvio(c);
  assert.equal(f.mesa, undefined);
  assert.ok(f.grimorio.every((s) => s.desc === undefined));
  assert.ok(JSON.stringify(f).length < JSON.stringify(c).length * 0.7, "ao menos 30% menor");
});
