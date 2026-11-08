/* ================= Banco em tempo real: simulado no navegador =================
   Mesma interface do banco do Firebase, mas guardada no localStorage e avisada entre
   abas pelo BroadcastChannel. Serve para testar a mesa sem internet: abra o app em
   duas abas, uma com ?banco=local&perfil=mestre e outra com ?banco=local&perfil=jogador
   (o perfil separa as fichas salvas de cada aba, como se fossem pessoas diferentes).
   Cada aba tem o próprio uid (sessionStorage), como se fossem pessoas diferentes. */
import { clone } from "../util.js";

const CHAVE = "codex-banco-local";
const partes = (p) => String(p).split("/").filter(Boolean);
const relacionados = (a, b) => {
  const x = partes(a),
    y = partes(b);
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (x[i] !== y[i]) return false;
  return true;
};

export function criarBancoLocal() {
  let uid = null;
  try {
    uid = sessionStorage.getItem("codex-banco-uid");
    if (!uid) sessionStorage.setItem("codex-banco-uid", (uid = "local-" + Math.random().toString(36).slice(2, 10)));
  } catch (e) {
    uid = "local-" + Math.random().toString(36).slice(2, 10);
  }
  const ouvintes = new Set();
  const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHAVE) : null;
  /* Cada aba guarda a árvore na memória e aplica as gravações na ordem em que chegam
     (as próprias e as das outras abas, pelo BroadcastChannel). O localStorage é só a foto
     usada por uma aba que abre depois. Assim nenhuma aba lê um estado pela metade. */
  let mem = {};
  try {
    mem = JSON.parse(localStorage.getItem(CHAVE) || "{}");
  } catch (e) {}
  const pegar = (p) => partes(p).reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), mem) ?? null;
  function aplicar(ops) {
    for (const [p, v] of ops) {
      const ks = partes(p);
      if (!ks.length) {
        mem = v && typeof v === "object" ? clone(v) : {};
        continue;
      }
      let o = mem;
      for (const k of ks.slice(0, -1)) o = o[k] && typeof o[k] === "object" ? o[k] : (o[k] = {});
      if (v === null || v === undefined) delete o[ks.at(-1)];
      else o[ks.at(-1)] = clone(v);
    }
    try {
      localStorage.setItem(CHAVE, JSON.stringify(mem));
    } catch (e) {}
  }
  const avisar = (p) => {
    for (const o of ouvintes) if (relacionados(o.p, p)) o.cb(clone(pegar(o.p)));
  };
  if (canal)
    canal.onmessage = (e) => {
      aplicar(e.data.ops);
      avisar(e.data.base);
    };
  /** Grava vários caminhos de uma vez e avisa uma vez só (como o update do Firebase). */
  function escrever(base, valores) {
    const b = partes(base).join("/");
    const ops = valores.map(([p, v]) => [partes(b + "/" + p).join("/"), v === undefined ? null : clone(v)]);
    aplicar(ops);
    avisar(b);
    if (canal) canal.postMessage({ base: b, ops });
  }
  const aoSair = [];
  if (typeof window !== "undefined")
    window.addEventListener("pagehide", () => aoSair.forEach(([p, v]) => escrever(p, [["", v]])));

  return {
    tipo: "local",
    uid,
    ler: async (p) => clone(pegar(p)),
    gravar: async (p, v) => escrever(p, [["", v]]),
    atualizar: async (p, obj) => escrever(p, Object.entries(obj)),
    remover: async (p) => escrever(p, [["", null]]),
    criarSeNaoExiste: async (p, v) => {
      if (pegar(p) !== null) return false;
      escrever(p, [["", v]]);
      return true;
    },
    ouvir(p, cb) {
      const o = { p, cb };
      ouvintes.add(o);
      cb(clone(pegar(p)));
      return () => ouvintes.delete(o);
    },
    ouvirFilhos(p, { adicionado, mudado, removido }) {
      let antes = {};
      const off = this.ouvir(p, (v) => {
        const agora = v && typeof v === "object" ? v : {};
        for (const [k, x] of Object.entries(agora)) {
          if (!(k in antes)) adicionado && adicionado(k, x);
          else if (JSON.stringify(antes[k]) !== JSON.stringify(x)) mudado && mudado(k, x);
        }
        for (const k of Object.keys(antes)) if (!(k in agora)) removido && removido(k);
        antes = clone(agora);
      });
      return off;
    },
    aoDesconectar: async (p, v) => aoSair.push([p, v]),
    cancelarDesconexao: async (p) => {
      for (let i = aoSair.length - 1; i >= 0; i--) if (aoSair[i][0] === p) aoSair.splice(i, 1);
    },
    conexao: (cb) => (cb(true), () => {}),
  };
}
