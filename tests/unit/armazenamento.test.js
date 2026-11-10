/* Migração de dados salvos e campanhas do hub do mestre. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setState, state } from "../../js/armazenamento/armazenamento.js";
import { MIG_ATUAL, migrate } from "../../js/armazenamento/migracoes.js";
import { adicionarNaCampanha, campanha, ordenados } from "../../js/telas/mestre.js";
import { volis } from "../../js/personagens/modelos.js";
import { testChars } from "../../js/personagens/testes.js";

beforeEach(() => setState({ chars: {}, active: null, mig: MIG_ATUAL, campanhas: {}, campanhaAtiva: null }));

test("estado antigo, sem campanhas, ganha a estrutura nova", () => {
  const v = volis(1);
  setState({ chars: { [v.id]: v }, active: v.id, mig: MIG_ATUAL });
  migrate();
  assert.deepEqual(state.campanhas, {});
  assert.equal(Object.keys(state.chars).length, 1);
});

test("primeiro acesso não cria personagens sozinho", () => {
  migrate();
  assert.equal(Object.keys(state.chars).length, 0);
});

test("magia salva com nome antigo é atualizada pelo nome em inglês", () => {
  const v = volis(1);
  const s = v.grimorio[0];
  s.nome = "Nome antigo";
  s.desc = "";
  setState({ chars: { [v.id]: v }, active: v.id, mig: MIG_ATUAL, campanhas: {} });
  migrate();
  assert.notEqual(state.chars[v.id].grimorio[0].nome, "Nome antigo");
  assert.ok(state.chars[v.id].grimorio[0].desc);
});

test("campanha: adicionar, atualizar pelo nome e ordenar por iniciativa", () => {
  state.campanhas.g1 = { id: "g1", nome: "Teste", ordem: "chegada", membros: [] };
  state.campanhaAtiva = "g1";
  const [barbaro, , , , , monge] = testChars();
  assert.equal(adicionarNaCampanha(barbaro, "backup"), "novo");
  assert.equal(adicionarNaCampanha(monge, "pdf"), "novo");
  barbaro.hp.atual = 3;
  assert.equal(adicionarNaCampanha(barbaro, "backup"), "atualizado");
  assert.equal(campanha().membros.length, 2);
  assert.equal(campanha().membros[0].c.hp.atual, 3);
  campanha().ordem = "iniciativa";
  assert.deepEqual(
    ordenados(campanha()).map((m) => m.c.nome),
    ["Sora Punho-Calmo", "Grosh Quebra-Escudos"]
  );
});

test("a cópia na campanha não guarda as descrições longas das magias", () => {
  state.campanhas.g1 = { id: "g1", nome: "Teste", membros: [] };
  state.campanhaAtiva = "g1";
  adicionarNaCampanha(volis(1), "local");
  assert.ok(campanha().membros[0].c.grimorio.every((s) => s.desc === undefined));
});
