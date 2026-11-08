/* ================= Cálculos ================= */
import { clamp, mod, sg, sizeAC } from "../util.js";
import { LIGHT_LB, SCHOOLS, SK, SYN } from "./basicas.js";
import { temTeste } from "../dados/catalogo.js";
import { at, babOf, bonusSpells, casterLevel, cls, lvlOf, saveBase, spellAttr } from "./classes.js";
import { DOMAINS, domList } from "./dominios.js";

export function slotTable(c) {
  const k = cls(c),
    m = k.magia;
  if (!m) return [];
  const L = lvlOf(c),
    row = m.tabela[L - 1];
  if (!row) return [];
  const score = at(c, m.attr),
    out = [];
  const extra = m.extra === "Escola" ? (c.escola && c.escola !== "Universal" ? 1 : 0) : m.extra === "Domínio" ? 1 : 0;
  for (let l = 0; l < row.length; l++) {
    const base = row[l];
    if (base == null) continue;
    if (score < 10 + l) break;
    const bonus = bonusSpells(score, l);
    const ex = m.extra === "Domínio" && l === 0 ? 0 : extra;
    if (base + bonus === 0 && !ex) continue;
    out.push({ l, base, bonus, escola: ex, extraNome: m.extra || "", normal: base + bonus });
  }
  return out;
}
export function ensurePrep(c) {
  const t = slotTable(c);
  c.prep = c.prep || {};
  for (const r of t) {
    const p = (c.prep[r.l] = c.prep[r.l] || { escola: { sid: null, used: false }, slots: [] });
    if (!p.escola) p.escola = { sid: null, used: false };
    while (p.slots.length < r.normal) p.slots.push({ sid: null, used: false });
    if (p.slots.length > r.normal) p.slots.length = r.normal;
  }
  return t;
}
export const isSpont = (c) => {
  const m = cls(c).magia;
  return !!(m && m.tipo === "espontanea");
};
export function spellAtk(c, s) {
  if (!s.ataque) return null;
  const parts = [["BBA", bba(c)], s.ataque === "dist" ? ["Des", mod(at(c, "des"))] : ["For", mod(at(c, "for"))]];
  const sz = sizeAC(c.tamanho);
  if (sz) parts.push(["tamanho", sz]);
  return {
    nome: s.ataque === "dist" ? "Toque à distância" : "Toque corpo a corpo",
    total: parts.reduce((t, p) => t + p[1], 0),
    parts,
  };
}
export function spellLine(c, s) {
  const at = spellAtk(c, s);
  return [
    at ? at.nome + " " + sg(at.total) + " (contra CA de toque)" : "",
    s.tempo && s.tempo !== "padrão" ? "Execução: " + s.tempo : "",
    rangeTxt(c, s.alcance),
    s.duracao,
    temTeste(s.ts) ? s.ts + " (CD " + dc(c, s) + ")" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
export function proibList(c) {
  return String(c.proibidas || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => SCHOOLS.includes(x));
}
export function spell(c, id) {
  return c.grimorio.find((s) => s.id === id);
}
export function dc(c, s) {
  return 10 + s.nivel + mod(at(c, spellAttr(c))) + (c.escola && s.escola === c.escola ? +c.cdEscola || 0 : 0);
}
export function rangeTxt(c, a) {
  const L = casterLevel(c) || lvlOf(c);
  if (a === "curto") return `curto (${String(7.5 + 1.5 * Math.floor(L / 2)).replace(".", ",")} m)`;
  if (a === "médio") return `médio (${30 + 3 * L} m)`;
  if (a === "longo") return `longo (${120 + 12 * L} m)`;
  return a;
}
export function saves(c) {
  const r = c.ef.resistencia ? 1 : 0;
  const gr = c.classeKey === "paladino" && lvlOf(c) >= 2 ? Math.max(0, mod(at(c, "car"))) : 0;
  const fu = c.ef.furia && c.classeKey === "barbaro" ? 2 : 0;
  return {
    fort: saveBase(c, "fort") + mod(at(c, "con")) + (+c.outros.fort || 0) + r + gr,
    ref: saveBase(c, "ref") + mod(at(c, "des")) + (+c.outros.ref || 0) + r + gr,
    von: saveBase(c, "von") + mod(at(c, "sab")) + (+c.outros.von || 0) + r + gr + fu,
  };
}
export function bba(c) {
  return babOf(c) + (+c.outros.bba || 0);
}
export function ac(c) {
  const d = mod(at(c, "des")),
    sz = sizeAC(c.tamanho);
  const arm = Math.max(+c.ca.armadura || 0, c.ef.armaduraArcana ? 4 : 0),
    esc_ = Math.max(+c.ca.escudo || 0, c.ef.escudoArcano ? 4 : 0);
  const monk = c.classeKey === "monge" && !arm && !esc_ ? Math.max(0, mod(at(c, "sab"))) + Math.floor(lvlOf(c) / 5) : 0;
  const def = +c.ca.deflexao || 0,
    out = (+c.ca.outros || 0) + monk - (c.ef.furia && c.classeKey === "barbaro" ? 2 : 0),
    nat = +c.ca.natural || 0;
  return {
    total: 10 + arm + esc_ + d + sz + nat + def + out,
    toque: 10 + d + sz + def + out,
    surpresa: 10 + arm + esc_ + Math.min(d, 0) + sz + nat + def + out,
  };
}
export const WTYPE = {
  corpo: "Corpo a corpo",
  acuidade: "Corpo a corpo com Acuidade (Des)",
  arremesso: "Arremesso",
  distancia: "Distância (besta, arco, funda)",
};
export function atkParts(c, a) {
  const ab = a.tipo === "corpo" ? ["For", mod(at(c, "for"))] : ["Des", mod(at(c, "des"))];
  const parts = [["BBA", bba(c)], ab];
  const sz = sizeAC(c.tamanho);
  if (sz) parts.push(["tamanho", sz]);
  if (+a.acertoOutros) parts.push(["outros", +a.acertoOutros]);
  return parts;
}
export function atkBonus(c, a) {
  return atkParts(c, a).reduce((t, p) => t + p[1], 0);
}
export function dmgParts(c, a) {
  const parts = [];
  if (a.tipo === "corpo" || a.tipo === "acuidade" || a.tipo === "arremesso") parts.push(["For", mod(at(c, "for"))]);
  if (+a.danoOutros) parts.push(["outros", +a.danoOutros]);
  return parts;
}
export function dmgMod(c, a) {
  return dmgParts(c, a).reduce((t, p) => t + p[1], 0);
}
export function dmgTxt(c, a) {
  const m = dmgMod(c, a);
  return (a.dado || "—") + (m ? (m > 0 ? " + " + m : " − " + Math.abs(m)) : "");
}
export const AMMO = {
  virotes: { nome: "Virotes", re: /virote|bolt/i, peso: 0.05 },
  flechas: { nome: "Flechas", re: /flecha|arrow/i, peso: 0.075 },
  balas: { nome: "Balas de funda", re: /bala|bullet/i, peso: 0.25 },
};
export function ammoFor(c, w) {
  if (!w || w.tipo !== "distancia") return null;
  const n = String(w.nome || "").toLowerCase();
  const kind = /besta|crossbow/.test(n)
    ? "virotes"
    : /arco|bow/.test(n)
      ? "flechas"
      : /funda|sling/.test(n)
        ? "balas"
        : null;
  if (!kind) return null;
  const idx = (c.itens || []).findIndex((i) => AMMO[kind].re.test(i.nome || ""));
  return { kind, idx, qtd: idx >= 0 ? +c.itens[idx].qtd || 0 : 0 };
}
export const partsTxt = (ps) => ps.map(([n, v]) => n + " " + sg(v)).join(" · ");
export function skill(c, k) {
  const d = SK[k],
    s = c.pericias[k] || {};
  const r = Math.floor(+s.grad || 0);
  const syn = (SYN[k] || []).filter((x) => (+(c.pericias[x] || {}).grad || 0) >= 5);
  const cls_ =
    s.classe ??
    (cls(c).pericias.includes(k) ||
      (c.classeKey === "clerigo" && domList(c).some((d) => (DOMAINS[d].per || []).includes(k))));
  return {
    r,
    syn,
    cls: cls_,
    abm: mod(at(c, d.ab)),
    total: mod(at(c, d.ab)) + r + (+s.outros || 0) + syn.length * 2,
    usable: !d.trained || r > 0,
  };
}
export function skillPts(c) {
  const L = lvlOf(c),
    per = Math.max(1, cls(c).pts + mod(c.attr.int));
  const avail = per * 4 + per * (L - 1) + (+c.pontosExtras || 0);
  let spent = 0;
  for (const k in c.pericias) {
    if (!SK[k]) continue;
    const g = +c.pericias[k].grad || 0;
    spent += g * (skill(c, k).cls ? 1 : 2);
  }
  return { avail, spent };
}
export function hpSuggest(c) {
  const L = lvlOf(c),
    cm = mod(c.attr.con),
    dv = cls(c).dv;
  let h = Math.max(1, dv + cm);
  for (let i = 2; i <= L; i++) h += Math.max(1, dv / 2 + 1 + cm);
  return h;
}
export function lightLoadKg(c) {
  const f = clamp(+c.attr.for || 0, 1, 29);
  let lb = LIGHT_LB[f];
  if (c.tamanho === "Pequeno") lb *= 0.75;
  return Math.round((lb / 2) * 10) / 10;
}
