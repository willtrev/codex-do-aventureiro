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

/** Volta a transformar em lista os objetos com chaves 0, 1, 2… (o banco em tempo real guarda listas assim). */
export function comoListas(v) {
  if (Array.isArray(v)) return v.map(comoListas);
  if (!v || typeof v !== "object") return v;
  const ks = Object.keys(v);
  const lista = ks.length > 0 && ks.every((k, i) => String(i) === k || /^\d+$/.test(k));
  if (lista) {
    const arr = [];
    for (const k of ks) arr[+k] = comoListas(v[k]);
    return Array.from(arr, (x) => (x === undefined ? null : x));
  }
  const o = {};
  for (const k of ks) o[k] = comoListas(v[k]);
  return o;
}
