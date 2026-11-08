/* Resumo de um personagem numa linha, usado para comparar com os valores esperados.
   Se mudar uma regra de propósito, gere de novo o arquivo esperado:
     node tests/unit/gerar-esperado.js > tests/fixtures/personagens-esperados.txt */
import { cls, classFeatures } from "../../js/regras/classes.js";
import {
  ac,
  atkBonus,
  bba,
  dmgTxt,
  hpSuggest,
  lightLoadKg,
  saves,
  skillPts,
  slotTable,
} from "../../js/regras/calculos.js";
import { sg } from "../../js/util.js";

export function resumo(c) {
  const a = ac(c),
    s = saves(c),
    sp = skillPts(c);
  return [
    c.nome,
    cls(c).nome,
    `PV ${c.hp.max} (sug ${hpSuggest(c)})`,
    `CA ${a.total}/${a.toque}/${a.surpresa}`,
    `BBA ${bba(c)}`,
    `F${s.fort} R${s.ref} V${s.von}`,
    `per ${sp.spent}/${sp.avail}`,
    `slots ${JSON.stringify(slotTable(c).map((r) => [r.l, r.normal, r.escola]))}`,
    `recursos ${classFeatures(c)
      .R.map((r) => r.nome + ":" + r.max)
      .join(",")}`,
    `armas ${c.ataques.map((w) => w.nome + " " + sg(atkBonus(c, w)) + " " + dmgTxt(c, w)).join("; ")}`,
    `carga ${c.itens.reduce((t, x) => t + x.peso * x.qtd, 0).toFixed(2)}/${lightLoadKg(c)}`,
  ].join(" | ");
}
