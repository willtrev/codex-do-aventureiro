/* ================= Estado da interface ================= */
const TABS = [
  ["painel", "Painel"],
  ["magias", "Magias"],
  ["pericias", "Perícias"],
  ["ficha", "Ficha"],
  ["inventario", "Inventário"],
  ["notas", "Notas e backup"],
];
let tab = "painel";
/** "fichas": abas do personagem; "mestre": hub da campanha (#mestre). */
let modo = "fichas";
function readHash() {
  const h = location.hash.replace("#", "");
  modo = h === "mestre" ? "mestre" : "fichas";
  if (modo === "mestre") return;
  tab = TABS.some((t) => t[0] === h) ? h : "painel";
}
/** Troca de aba (atualiza o endereço sem criar entrada nova no histórico). */
function irPara(t) {
  tab = t;
  modo = "fichas";
  history.replaceState(null, "", "#" + t);
}
const cur = () => state.chars[state.active];

function getPath(o, p) {
  return p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
}
function setPath(o, p, v) {
  const ks = p.split(".");
  let a = o;
  for (let i = 0; i < ks.length - 1; i++) {
    if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    a = a[ks[i]];
  }
  a[ks[ks.length - 1]] = v;
}
function inp(path, opt = {}) {
  const c = cur();
  const v = getPath(c, path);
  const t = opt.type || "text";
  const id = "f_" + path.replace(/\W/g, "_");
  const ctrl = `<input id="${id}" type="${t}" data-b="${path}" value="${esc(v ?? "")}" ${opt.step ? `step="${opt.step}"` : ""} ${opt.w ? `style="width:${opt.w}"` : ""} ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ""}>`;
  return opt.label ? `<label class="f" for="${id}">${esc(opt.label)}${ctrl}</label>` : ctrl;
}
