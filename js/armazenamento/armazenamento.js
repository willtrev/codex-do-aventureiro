/* ================= Armazenamento ================= */
import { clone, esc } from "../util.js";
import { migrate } from "./migracoes.js";
import { render } from "../telas/topo.js";

/* state.chars: personagens deste usuário. state.campanhas: campanhas do hub do mestre,
   cada uma com cópias das fichas dos jogadores (ver js/telas/mestre.js). */
export let state = { chars: {}, active: null, campanhas: {}, campanhaAtiva: null };
export let db = null,
  uid = null,
  storeMode = "local",
  statusTxt = "Carregando…",
  statusCls = "pend";
export const LSKEY = "grimorio-volis-v1";
export function saveLocal() {
  try {
    localStorage.setItem(LSKEY, JSON.stringify(state));
  } catch (e) {}
}
export function loadLocal() {
  try {
    const s = JSON.parse(localStorage.getItem(LSKEY) || "null");
    if (s && s.chars) {
      s.campanhas = s.campanhas || {};
      return s;
    }
  } catch (e) {}
  return null;
}
export function col() {
  return db.collection("data/users/" + uid);
}
export const dirty = new Set();
export let saveTimer = null,
  writing = false;
export function touch(id) {
  dirty.add(id || state.active);
  saveLocal();
  clearTimeout(saveTimer);
  if (storeMode === "cloud") {
    setStatus("Salvando…", "pend");
    saveTimer = setTimeout(flush, 700);
  } else setStatus("Salvo só neste navegador", "pend");
}
export async function flush() {
  if (writing) {
    saveTimer = setTimeout(flush, 400);
    return;
  }
  if (storeMode !== "cloud" || !dirty.size) return;
  writing = true;
  const ids = [...dirty];
  dirty.clear();
  try {
    for (const id of ids) {
      if (id === "__meta")
        await col()
          .doc("meta")
          .set({ active: state.active || "", mig: state.mig || 0, campanhaAtiva: state.campanhaAtiva || "" });
      else if (id.startsWith("g:")) {
        const g = id.slice(2);
        if (state.campanhas[g])
          await col()
            .doc("g_" + g)
            .set(clone(state.campanhas[g]));
        else
          await col()
            .doc("g_" + g)
            .delete();
      } else if (state.chars[id])
        await col()
          .doc("c_" + id)
          .set(clone(state.chars[id]));
      else
        await col()
          .doc("c_" + id)
          .delete();
    }
    setStatus("Salvo na sua conta", "ok");
  } catch (e) {
    ids.forEach((i) => dirty.add(i));
    if (e && e.code === "unavailable") {
      setStatus("Reconectando para salvar…", "pend");
      saveTimer = setTimeout(flush, 1500 + Math.random() * 1500);
    } else if (e && e.code === "quota_exceeded") {
      setStatus("Espaço de armazenamento cheio: apague personagens antigos", "err");
    } else {
      setStatus("Não foi possível salvar na conta; salvo neste navegador", "err");
    }
  } finally {
    writing = false;
  }
}
export function setStatus(t, c) {
  statusTxt = t;
  statusCls = c;
  const el = document.getElementById("st");
  if (el) el.innerHTML = statusHTML();
}
export function statusHTML() {
  return `<span class="dot ${statusCls === "ok" ? "ok" : statusCls === "err" ? "err" : "pend"}"></span>${esc(statusTxt)}`;
}

export async function initCloud() {
  if (!window.claude || typeof window.claude.use !== "function") {
    setStatus("Salvo só neste navegador", "pend");
    return;
  }
  let d = null,
    u = null;
  try {
    [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
  } catch (e) {}
  let id = null;
  try {
    id = u ? await u.id() : null;
  } catch (e) {}
  if (!d || !id) {
    setStatus("Salvo só neste navegador (entre na conta para salvar na nuvem)", "pend");
    return;
  }
  db = d;
  uid = id;
  let timedOut = false;
  const t = setTimeout(() => {
    timedOut = true;
    setStatus("A conta ainda não respondeu; usando os dados deste navegador", "pend");
  }, 10000);
  try {
    const snap = await col().get();
    clearTimeout(t);
    const chars = {},
      campanhas = {};
    let active = null,
      campanhaAtiva = null,
      mig = 0;
    for (const doc of snap.docs) {
      const v = doc.data();
      if (doc.id === "meta") {
        active = v.active;
        mig = v.mig || 0;
        campanhaAtiva = v.campanhaAtiva || null;
      } else if (doc.id.startsWith("c_") && v && v.id) chars[v.id] = clone(v);
      else if (doc.id.startsWith("g_") && v && v.id) campanhas[v.id] = clone(v);
    }
    storeMode = "cloud";
    if (Object.keys(chars).length || Object.keys(campanhas).length) {
      state = {
        chars,
        active: chars[active] ? active : Object.keys(chars)[0] || null,
        mig,
        campanhas,
        campanhaAtiva: campanhas[campanhaAtiva] ? campanhaAtiva : Object.keys(campanhas)[0] || null,
      };
      migrate();
      saveLocal();
      if (!dirty.size) setStatus("Salvo na sua conta", "ok");
      render();
    } else {
      Object.keys(state.chars).forEach((k) => dirty.add(k));
      Object.keys(state.campanhas || {}).forEach((k) => dirty.add("g:" + k));
      dirty.add("__meta");
      setStatus("Salvando…", "pend");
      flush();
    }
  } catch (e) {
    clearTimeout(t);
    setStatus(
      timedOut
        ? "A conta não respondeu; salvo neste navegador"
        : "Não foi possível abrir os dados da conta; salvo neste navegador",
      "err"
    );
  }
}

/* Funções para outros arquivos alterarem as variáveis deste (imports são somente leitura). */
export function setState(v) {
  state = v;
}
