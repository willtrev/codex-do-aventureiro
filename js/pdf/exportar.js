/* ================= Exportar PDF (ficha editável) ================= */
import { mod, sg, sizeAC, sizeGrap } from "../util.js";
import { SK } from "../regras/basicas.js";
import { at, classFeatures, cls, spellAttr } from "../regras/classes.js";
import { ac, atkBonus, bba, dmgTxt, isSpont, lightLoadKg, saves, skill, slotTable, spell } from "../regras/calculos.js";
import { modal } from "../interface/modais.js";

export const KN_SHORT = {
  c_arcano: "arcano",
  c_arq: "arquitetura",
  c_masm: "masmorras",
  c_geo: "geografia",
  c_hist: "história",
  c_local: "local",
  c_nat: "natureza",
  c_nob: "nobreza",
  c_rel: "religião",
  c_planos: "planos",
};
export const SHEET_ROWS = [
  "abrir",
  "acrobacia",
  "adestrar",
  "fuga",
  "atuacao",
  null,
  null,
  "avaliacao",
  "blefar",
  "cavalgar",
  "concentracao",
  "K",
  "K",
  "K",
  "K",
  "K",
  "cura",
  "decifrar",
  "diplomacia",
  "disfarce",
  "equilibrio",
  "escalar",
  "esconder",
  "falsificacao",
  "furtividade",
  "identificar",
  "intimidacao",
  "natacao",
  "observar",
  "obter",
  "oficios",
  null,
  null,
  "operar",
  "ouvir",
  "prestidigitacao",
  "procurar",
  "profissao",
  null,
  "saltar",
  "sentir",
  "sobrevivencia",
  "cordas",
  "uim",
  "X",
  "X",
];
export const ROW_CHECK = [
  653, 654, 655, 656, 657, 712, 713, 660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670, 671, 672, 673, 674, 675,
  676, 677, 714, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697, 698,
];
export const SPEC_FIELD = {
  5: 317,
  6: 318,
  7: 319,
  12: 320,
  13: 321,
  14: 322,
  15: 323,
  16: 324,
  31: 325,
  32: 326,
  33: 327,
  38: 328,
  39: 329,
};
export const kg = (n) => {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? "—" : String(r).replace(".", ",") + " kg";
};
export function wrapLines(prefix, items, width) {
  const out = [];
  let line = prefix;
  items.forEach((it, i) => {
    const piece = it + (i < items.length - 1 ? ", " : ".");
    if ((line + piece).length > width && line.trim()) {
      out.push(line.trimEnd());
      line = "  " + piece;
    } else line += piece;
  });
  if (line.trim()) out.push(line.trimEnd());
  return out;
}
export function buildPdfFields(c) {
  const T = {},
    checks = [];
  const set = (n, v) => {
    if (v !== undefined && v !== null && v !== "") T["untitled" + n] = String(v);
  };
  const L = +c.nivel || 1,
    a = ac(c),
    sv = saves(c);
  set(7, c.nome);
  set(1, c.jogador);
  set(8, cls(c).nome + " " + L);
  set(9, c.raca);
  set(2, c.tendencia);
  set(3, c.divindade);
  set(4, c.tamanho);
  set(5, c.idade);
  set(6, c.sexo);
  set(10, c.altura);
  set(11, c.peso);
  [
    ["for", 13, 14],
    ["des", 15, 16],
    ["con", 17, 18],
    ["int", 19, 20],
    ["sab", 21, 22],
    ["car", 23, 24],
  ].forEach(([k, v, m]) => {
    set(v, c.attr[k]);
    set(m, sg(mod(c.attr[k])));
  });
  set(44, a.total);
  set(37, Math.max(+c.ca.armadura || 0, c.ef.armaduraArcana ? 4 : 0));
  set(38, Math.max(+c.ca.escudo || 0, c.ef.escudoArcano ? 4 : 0));
  set(39, sg(mod(at(c, "des"))));
  set(40, sizeAC(c.tamanho));
  set(41, +c.ca.natural || 0);
  set(42, +c.ca.deflexao || 0);
  set(43, +c.ca.outros || 0);
  set(45, a.toque);
  set(46, a.surpresa);
  if (!c.ef.armaduraArcana) set(130, "Armadura Arcana: CA " + (a.total + 4) + ", surpresa " + (a.surpresa + 4));
  set(47, c.hp.max);
  set(49, c.hp.atual);
  if (+c.hp.contusao) set(48, c.hp.contusao);
  set(51, sg(mod(at(c, "des")) + (+c.outros.init || 0)));
  set(52, sg(mod(at(c, "des"))));
  set(53, +c.outros.init || 0);
  const r = c.ef.resistencia ? 1 : 0;
  set(54, sg(sv.fort));
  set(59, sg(Math.floor(L / 3)));
  set(60, sg(mod(at(c, "con"))));
  if (r) set(63, "+1");
  if (+c.outros.fort) set(66, sg(+c.outros.fort));
  set(55, sg(sv.ref));
  set(58, sg(Math.floor(L / 3)));
  set(61, sg(mod(at(c, "des"))));
  if (r) set(64, "+1");
  if (+c.outros.ref) set(67, sg(+c.outros.ref));
  set(56, sg(sv.von));
  set(57, sg(2 + Math.floor(L / 2)));
  set(62, sg(mod(at(c, "sab"))));
  if (r) set(65, "+1");
  if (+c.outros.von) set(68, sg(+c.outros.von));
  const rc = String(c.resistCond || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
  rc.slice(0, 3).forEach((t, i) => set(72 + i, t));
  set(75, sg(bba(c)));
  set(76, "—");
  set(77, sg(bba(c) + mod(at(c, "for")) + sizeGrap(c.tamanho) + (+c.outros.agarrar || 0)));
  set(78, sg(bba(c)));
  set(79, sg(mod(at(c, "for"))));
  set(80, sizeGrap(c.tamanho));
  set(81, +c.outros.agarrar || 0);
  set(82, c.deslocamento);
  const AT = [
    [83, 84, 85, 86, 87, 88, 89, 101],
    [92, 93, 94, 95, 96, 97, 98, 102],
    [103, 104, 105, 106, 107, 108, 109, 111],
    [112, 113, 114, 115, 116, 117, 118, 120],
    [121, 122, 123, 124, 125, 126, 127, 129],
  ];
  (c.ataques || []).slice(0, 5).forEach((w, i) => {
    const f = AT[i];
    set(f[0], w.nome);
    set(f[1], sg(atkBonus(c, w)));
    set(f[2], dmgTxt(c, w).replace(/ /g, ""));
    set(f[3], w.critico);
    set(f[4], w.alcance);
    set(f[5], { corpo: "C. a c.", acuidade: "C. a c.", arremesso: "Arrem.", distancia: "Dist." }[w.tipo] || "");
    const ob = String(w.obs || "");
    const mm = ob.match(/Munição:\s*([^.]+)/i);
    set(f[6], ob.replace(/\s*Munição:[^.]*\.?/i, "").trim());
    if (mm || (w.tipo === "distancia" && /besta|arco|funda/i.test(w.nome || ""))) {
      const it = (c.itens || []).find((x) => /virote|flecha|bala/i.test(x.nome || ""));
      if (it) set(f[7], it.nome + " (" + (+it.qtd || 1) + ")");
    }
  });
  // perícias
  set(131, L + 3);
  set(132, String((L + 3) / 2).replace(".", ","));
  const kn = Object.keys(KN_SHORT).sort(
    (x, y) => (+(c.pericias[y] || {}).grad || 0) - (+(c.pericias[x] || {}).grad || 0)
  );
  const knWith = kn.filter((k) => (+(c.pericias[k] || {}).grad || 0) > 0);
  const knRows = knWith.slice(0, 5);
  for (const k of kn) if (knRows.length < 5 && !knRows.includes(k)) knRows.push(k);
  const extra = knWith.slice(5, 7);
  let ki = 0,
    xi = 0;
  SHEET_ROWS.forEach((key, idx) => {
    const n = idx + 1;
    let k = key;
    if (k === "K") k = knRows[ki++];
    if (k === "X") {
      k = extra[xi++];
      if (!k) return;
      set(n === 45 ? 330 : 331, "Conhecimento (" + KN_SHORT[k] + ")");
      set(n === 45 ? 333 : 332, "INT");
    }
    if (!k) return;
    const d = SK[k],
      s = c.pericias[k] || {},
      rr = skill(c, k);
    const ids = n === 1 ? [133, 134, 135, 136] : [135 + n, 180 + n, 225 + n, 270 + n];
    set(ids[0], rr.usable ? sg(rr.total) : "—");
    set(ids[1], sg(rr.abm));
    set(ids[2], String(+s.grad || 0).replace(".", ","));
    const out = (+s.outros || 0) + rr.syn.length * 2;
    if (out) set(ids[3], sg(out));
    if (SPEC_FIELD[n]) {
      if (KN_SHORT[k]) set(SPEC_FIELD[n], KN_SHORT[k]);
      else if (s.spec) set(SPEC_FIELD[n], s.spec);
    }
    if (rr.cls) checks.push("untitled" + ROW_CHECK[idx]);
  });
  // equipamento
  const items = (c.itens || []).filter((x) => x.nome);
  const slots = [];
  for (let k = 0; k < 14; k++) slots.push([334 + 4 * k, 335 + 4 * k, 337 + 4 * k]);
  for (let j = 0; j < 4; j++) slots.push([390 + 4 * j, 391 + 4 * j, 393 + 4 * j]);
  for (let j = 0; j < 9; j++) slots.push([406 + j, 415 + j, 433 + j]);
  items.slice(0, slots.length).forEach((it, i) => {
    const q = +it.qtd || 1;
    set(slots[i][0], it.nome + (q > 1 ? " (" + q + ")" : ""));
    set(slots[i][1], it.local);
    set(slots[i][2], kg((+it.peso || 0) * q));
  });
  const tot = items.reduce((t, x) => t + (+x.peso || 0) * (+x.qtd || 1), 0);
  set(442, kg(tot) === "—" ? "0 kg" : kg(tot));
  const lt = lightLoadKg(c);
  [lt, lt * 2, lt * 3, lt * 3, lt * 6, lt * 15].forEach((v, i) => set(443 + i, kg(v)));
  String(c.idiomas || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 9)
    .forEach((t, i) => set(480 + i, t));
  set(464, +c.dinheiro.pc || 0);
  set(465, +c.dinheiro.pp || 0);
  set(466, +c.dinheiro.po || 0);
  set(467, +c.dinheiro.pl || 0);
  // talentos
  const TF = [
    [489, 490, 491],
    [492, 493, 494],
    [496, 495, 497],
    [498, 499, 500],
    [501, 502, 503],
    [504, 505, 506],
    [507, 508, 509],
    [510, 511, 512],
    [513, 514, 515],
    [516, 517, 518],
    [519, 520, 521],
    [522, 523, 524],
  ];
  (c.talentos || []).slice(0, 12).forEach((t, i) => {
    set(TF[i][0], t.nome);
    set(TF[i][2], t.obs);
  });
  // magia
  if (cls(c).magia) {
    set(525, sg(mod(at(c, spellAttr(c)))));
    set(526, c.classeKey === "bardo" ? "0 (leve)" : "0");
  }
  const MR = [
    [527, 528, 547, null],
    [529, 530, 548, 557],
    [531, 532, 549, 558],
    [533, 534, 550, 559],
    [535, 536, 551, 560],
    [537, 546, 552, 561],
    [538, 545, 553, 562],
    [539, 544, 554, 563],
    [540, 543, 555, 564],
    [541, 542, 556, 565],
  ];
  const tab = slotTable(c);
  for (let l = 0; l < 10; l++) {
    const known = c.grimorio.filter((s) => s.nivel === l).length;
    const row = tab.find((x) => x.l === l);
    if (!known && !row) continue;
    const f = MR[l];
    if (known) set(f[0], known);
    if (row) {
      set(f[1], 10 + l + mod(at(c, spellAttr(c))));
      set(f[2], row.base + (row.escola ? "+1" : ""));
      if (f[3] && row.bonus) set(f[3], row.bonus);
    }
  }
  if (c.classeKey === "mago" && c.escola) set(566, c.escola + ": +1 magia/nível, +2 em Identificar Magias");
  else if (c.classeKey === "clerigo" && c.dominios) set(566, "Domínios: " + c.dominios);
  if (c.escola && +c.cdEscola)
    set(567, "CD de " + c.escola + " (com Foco): +" + c.cdEscola + " em todas as CDs da escola");
  if (c.classeKey === "mago")
    String(c.proibidas || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 2)
      .forEach((t, i) => set(568 + i, t));
  const obs = [];
  const W = 70;
  const byL = {};
  c.grimorio
    .slice()
    .sort((x, y) => x.nome.localeCompare(y.nome))
    .forEach((s) => (byL[s.nivel] = byL[s.nivel] || []).push(s.nome));
  Object.keys(byL)
    .sort((x, y) => x - y)
    .forEach((l) => obs.push(...wrapLines((+l === 0 ? "TRUQUES" : l + "º NÍVEL") + ": ", byL[l], W)));
  if (!isSpont(c) && tab.length)
    obs.push("PREPARADAS (* = espaço extra de " + (cls(c).magia.extra || "").toLowerCase() + "):");
  if (!isSpont(c))
    tab.forEach((rw) => {
      const p = c.prep[rw.l];
      if (!p) return;
      const names = [];
      if (rw.escola && p.escola && p.escola.sid) {
        const s = spell(c, p.escola.sid);
        if (s) names.push(s.nome + "*");
      }
      p.slots.forEach((x) => {
        const s = x.sid && spell(c, x.sid);
        if (s) names.push(s.nome);
      });
      if (names.length) obs.push(...wrapLines((rw.l === 0 ? "Truques" : rw.l + "º") + ": ", names, W));
    });
  if (+c.inspiracao) obs.push("Inspiração: " + c.inspiracao);
  const lines = obs.length > 12 ? obs.slice(0, 11).concat(["(lista completa no Códex do Aventureiro)"]) : obs;
  lines.forEach((t, i) => set(570 + i, t));
  // página 4
  set(582, (+c.xp || 0).toLocaleString("pt-BR"));
  set(583, (((L * (L + 1)) / 2) * 1000).toLocaleString("pt-BR"));
  set(584, "+0");
  set(585, L);
  (c.tracos || []).slice(0, 10).forEach((t, i) => set(613 + i, t.obs ? t.nome + ": " + t.obs : t.nome));
  const unesc = (t) =>
    String(t)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const fe = classFeatures(c);
  const feats = [
    ...fe.R.map((r) => ({ nome: r.nome, obs: r.max + (r.pool ? " PV" : " usos") + " por dia. " + r.desc })),
    ...fe.I.map((i) => ({ nome: unesc(i.nome + (i.valor ? " " + i.valor : "")), obs: i.desc })),
  ];
  const seen = new Set(feats.map((f) => f.nome.split(" ")[0]));
  (c.caracteristicas || []).forEach((t) => {
    if (t && t.nome && !seen.has(String(t.nome).split(" ")[0])) feats.push(t);
  });
  feats.slice(0, 10).forEach((t, i) => {
    set(623 + 3 * i, t.nome);
    set(625 + 3 * i, t.obs);
  });
  return { T, checks };
}
export const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function pdfSafe(t) {
  return String(t)
    .replace(/\u2212/g, "-")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, (ch) => (WINANSI_EXTRA.includes(ch) ? ch : ch === "\n" ? " " : "?"));
}
export let pdfLibPromise = null;
export function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibPromise)
    pdfLibPromise = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
      sc.onload = () => (window.PDFLib ? res(window.PDFLib) : rej(new Error("lib")));
      sc.onerror = () => {
        pdfLibPromise = null;
        rej(new Error("lib"));
      };
      document.head.appendChild(sc);
    });
  return pdfLibPromise;
}
export let SHEET_BYTES = null;
export async function getSheet() {
  if (SHEET_BYTES) return SHEET_BYTES;
  try {
    const r = await fetch("ficha.pdf");
    if (r.ok) {
      const b = await r.arrayBuffer();
      if (b.byteLength > 1000) {
        SHEET_BYTES = b;
        return b;
      }
    }
  } catch (e) {}
  return null;
}
export function plainDownload(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
export async function exportPdf(c) {
  modal(
    `<h2 style="font-size:18px;color:var(--ink)">Exportar ficha em PDF</h2><p id="pdfmsg" style="margin:0">Preenchendo a ficha…</p><div class="row"><button class="btn" data-a="close">Fechar</button></div>`
  );
  const msg = (t) => {
    const el = document.getElementById("pdfmsg");
    if (el) el.textContent = t;
  };
  try {
    const inClaude = !!(window.claude && window.claude.use);
    const dl = inClaude ? await window.claude.use("downloads") : null;
    if (inClaude && !dl) {
      msg("Neste modo de visualização não é possível baixar arquivos. Abra o app pelo claude.ai.");
      return;
    }
    const bytes = await getSheet();
    if (!bytes) {
      document.querySelector(".modal").innerHTML =
        `<h2 style="font-size:18px;color:var(--ink)">Escolha a ficha em branco</h2>
      <p style="margin:0">O modelo de ficha editável não está junto do app. Escolha o PDF da ficha em branco (o mesmo modelo de 4 páginas) e a exportação continua.</p>
      <div class="row"><label class="btn pri" for="sheetfile">Escolher PDF</label><input type="file" id="sheetfile" accept="application/pdf" data-a="sheetfile" style="position:absolute;left:-9999px"><button class="btn" data-a="close">Cancelar</button></div>`;
      return;
    }
    const PDFLib = await loadPdfLib();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const form = pdf.getForm();
    const { T, checks } = buildPdfFields(c);
    const helv = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    for (const [k, v] of Object.entries(T)) {
      try {
        const f = form.getTextField(k);
        const txt = pdfSafe(v);
        f.setText(txt);
        const da = String(f.acroField.getDefaultAppearance() || "");
        const m = da.match(/([\d.]+)\s+Tf/);
        const base = m ? +m[1] : 8.64;
        const wd = f.acroField.getWidgets()[0].getRectangle().width - 4;
        const tw = helv.widthOfTextAtSize(txt, 1);
        if (tw * base > wd && tw > 0) f.setFontSize(Math.max(5, Math.floor((wd / tw) * 10) / 10));
      } catch (e) {}
    }
    for (const k of checks) {
      try {
        form.getCheckBox(k).check();
      } catch (e) {}
    }
    try {
      form.updateFieldAppearances(helv);
    } catch (e) {}
    try {
      const N = PDFLib.PDFName,
        af = form.acroForm.dict;
      let dr = af.lookup(N.of("DR"));
      if (!dr) {
        dr = pdf.context.obj({});
        af.set(N.of("DR"), dr);
      }
      let fonts = dr.lookup(N.of("Font"));
      if (!fonts) {
        fonts = pdf.context.obj({});
        dr.set(N.of("Font"), fonts);
      }
      fonts.set(N.of("Helvetica"), helv.ref);
      fonts.set(N.of("Helv"), helv.ref);
    } catch (e) {}
    const out = await pdf.save({ updateFieldAppearances: false });
    msg("Ficha pronta. Confirme o download na janela que abrir.");
    const fname =
      (String(c.nome || "personagem")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w]+/g, "_")
        .replace(/^_|_$/g, "") || "personagem") +
      "_N" +
      (+c.nivel || 1) +
      ".pdf";
    const blob = new Blob([out], { type: "application/pdf" });
    if (dl) await dl.save({ filename: fname, data: blob });
    else plainDownload(blob, fname);
    msg("Ficha baixada: " + fname + ". Os campos continuam editáveis.");
  } catch (e) {
    const code = e && e.code;
    if (code === "declined") msg("Download cancelado.");
    else if (code === "rate_limited") msg("Já existe uma janela de download aberta. Feche-a e tente de novo.");
    else if (
      code === "unavailable" ||
      code === "not_granted" ||
      code === "capability_disabled" ||
      code === "capability_removed"
    )
      msg("Downloads não estão disponíveis neste modo de visualização.");
    else msg("Não consegui gerar o PDF. Verifique a conexão e tente de novo.");
  }
}

/* Funções para outros arquivos alterarem as variáveis deste (imports são somente leitura). */
export function setSHEET_BYTES(v) {
  SHEET_BYTES = v;
}
