/* Funções utilitárias usadas em todo o app. */
export const mod = (v) => Math.floor(((+v || 0) - 10) / 2);
export const sg = (n) => (n >= 0 ? "+" : "") + n;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
export const uidGen = () => Math.random().toString(36).slice(2, 10);
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const lvlName = (l) => (l === 0 ? "Truques" : l + "º nível");
export const sizeAC = (s) => ({ Pequeno: 1, Médio: 0, Grande: -1 })[s] ?? 0;
export const sizeGrap = (s) => ({ Pequeno: -4, Médio: 0, Grande: 4 })[s] ?? 0;
