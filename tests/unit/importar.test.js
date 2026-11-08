/* Importação de ficha: leitura dos campos da ficha oficial e de texto livre. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPdfFields } from "../../js/pdf/exportar.js";
import {
  classeDoTexto,
  conhecimentoDoTexto,
  escolaDoTexto,
  dominioDoTexto,
  magiaDoNome,
  montarDoPdf,
  numPdf,
  pesoPdf,
  tendenciaDoTexto,
} from "../../js/pdf/importar.js";
import { camposDeTextoLivre } from "../../js/pdf/ler-texto.js";
import { volis } from "../../js/personagens/modelos.js";
import { testChars } from "../../js/personagens/testes.js";
import { resumo } from "./resumo.js";

test("números escritos de vários jeitos", () => {
  assert.equal(numPdf("+2"), 2);
  assert.equal(numPdf("−1"), -1);
  assert.equal(numPdf("2,5"), 2.5);
  assert.ok(Number.isNaN(numPdf("dez")));
  assert.equal(pesoPdf("3 lb."), 1.5);
  assert.equal(pesoPdf("1,5 kg"), 1.5);
  assert.equal(pesoPdf("—"), 0);
});

test("classe e nível, inclusive em inglês e multiclasse", () => {
  assert.deepEqual(
    classeDoTexto("Mago 3").map((x) => [x.k, x.nivel]),
    [["mago", 3]]
  );
  assert.deepEqual(
    classeDoTexto("Wizard 3 / Rogue 1").map((x) => [x.k, x.nivel]),
    [
      ["mago", 3],
      ["ladino", 1],
    ]
  );
  assert.equal(classeDoTexto("Bárbaro 2")[0].k, "barbaro");
  assert.equal(classeDoTexto("Bard 2")[0].k, "bardo");
});

test("tendência, conhecimento, escola e domínio em português ou inglês", () => {
  assert.equal(tendenciaDoTexto("Chaotic Good"), "Caótico e Bom");
  assert.equal(tendenciaDoTexto("LN"), "Leal e Neutro");
  assert.equal(conhecimentoDoTexto("arcana"), "c_arcano");
  assert.equal(conhecimentoDoTexto("Conhecimento (história)"), "c_hist");
  assert.equal(escolaDoTexto("Illusion"), "Ilusão");
  assert.equal(dominioDoTexto("Proteção Fort +6"), "Proteção");
  assert.equal(magiaDoNome("Sleep").nome, magiaDoNome("Sono").nome);
});

// Ida e volta: exporta os campos da ficha oficial e importa de novo, sem PDF no meio
for (const c of [volis(1), ...testChars()])
  test(`ida e volta pela ficha oficial: ${c.nome}`, () => {
    const { T } = buildPdfFields(c);
    const r = montarDoPdf({ ...T, __origem: "campos" }, {});
    assert.equal(resumo(r.c), resumo(c));
    assert.deepEqual(r.difs, [], "valores calculados iguais aos da ficha");
    assert.deepEqual(r.c.grimorio.map((s) => s.nome).sort(), c.grimorio.map((s) => s.nome).sort());
  });

test("avisos: multiclasse, magia fora do SRD e nome vazio", () => {
  const F = {
    untitled8: "Wizard 3 / Rogue 1",
    untitled13: "10",
    untitled570: "1º NÍVEL: Sleep, Bola de Fogo Rápida.",
  };
  const r = montarDoPdf(F, {});
  const titulos = r.avisos.map((a) => a.titulo);
  assert.ok(titulos.includes("Multiclasse"));
  assert.ok(titulos.includes("Magias fora do SRD"));
  assert.ok(titulos.includes("Nome"));
  assert.ok(titulos.includes("Atributos"), "atributos vazios são avisados");
  assert.equal(r.c.classeKey, "mago");
  assert.equal(r.c.nivel, 3);
});

test("texto livre: rótulos, atributos e listas", () => {
  const F = camposDeTextoLivre([
    "Nome: Thorin     Jogador: Bruno",
    "Classe: Clérigo 3     Raça: Anão     Tendência: Leal e Bom",
    "Domínios: Bem, Proteção",
    "FOR 14  DES 10  CON 16  INT 8  SAB 15  CAR 12",
    "PV 24   CA 18   Deslocamento: 20 ft.",
    "Talentos",
    "Combat Casting, Toughness",
    "Magias",
    "Truques: Guidance, Light",
    "1: Bless, Cure Light Wounds",
  ]);
  const r = montarDoPdf({ ...F, __origem: "texto" }, {});
  const c = r.c;
  assert.equal(c.nome, "Thorin");
  assert.equal(c.classeKey, "clerigo");
  assert.equal(c.nivel, 3);
  assert.deepEqual(c.attr, { for: 14, des: 10, con: 16, int: 8, sab: 15, car: 12 });
  assert.equal(c.hp.max, 24);
  assert.equal(c.dominios, "Bem, Proteção");
  assert.equal(c.talentos.length, 2);
  // as 4 magias da lista, além das magias dos domínios Bem e Proteção que o app acrescenta
  for (const n of ["Orientação", "Luz", "Abençoar", "Curar Ferimentos Leves"])
    assert.ok(
      c.grimorio.some((s) => s.nome === n),
      n
    );
  assert.ok(r.avisos.some((a) => a.titulo === "Outro modelo de ficha"));
  assert.ok(
    r.avisos.some((a) => a.titulo === "Bônus sem origem"),
    "CA 18 ajustada em Outros"
  );
});
