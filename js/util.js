/* Funções utilitárias usadas em todo o app. */
const mod = (v) => Math.floor(((+v || 0) - 10) / 2);
const sg = (n) => (n >= 0 ? "+" : "") + n;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
const uidGen = () => Math.random().toString(36).slice(2, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const lvlName = (l) => (l === 0 ? "Truques" : l + "º nível");
const sizeAC = (s) => ({ Pequeno: 1, Médio: 0, Grande: -1 })[s] ?? 0;
const sizeGrap = (s) => ({ Pequeno: -4, Médio: 0, Grande: 4 })[s] ?? 0;
