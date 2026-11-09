/* ================= Fichas na conta Google =================
   Com a conta Google, tudo o que fica no navegador também vai para usuarios/<uid>/ no
   Realtime Database:
     usuarios/<uid>/c_<id>   ficha
     usuarios/<uid>/g_<id>   campanha do hub do mestre
     usuarios/<uid>/meta     personagem e campanha ativos
   Ao entrar, junta o que está no aparelho com o que está na conta (em conflito, vale a
   versão mais recente, pelo campo _em). Depois, mudanças feitas em outro aparelho chegam
   sozinhas. O navegador continua com uma cópia, para funcionar sem internet. */
import { comoListas } from "../util.js";
import { blankChar } from "../personagens/modelos.js";
import { conectarBanco } from "../tempo-real/banco.js";
import { dirty, flush, saveLocal, setState, setStatus, state, usarNuvem } from "./armazenamento.js";
import { migrate } from "./migracoes.js";
import { render } from "../telas/topo.js";

let parar = null;
// O banco descarta listas vazias e guarda listas como objetos: completa com a ficha em branco
const comoFicha = (v) => Object.assign(blankChar(), comoListas(v));
function comoCampanha(v) {
  const g = comoListas(v);
  g.membros = (g.membros || []).map((m) => ({ ...m, c: comoFicha(m.c) }));
  return g;
}
const maisNova = (a, b) => (a._em || 0) > (b._em || 0);

export async function ligarConta(usuario) {
  desligarConta();
  setStatus("Abrindo a sua conta…", "pend");
  const b = await conectarBanco();
  const base = `usuarios/${usuario.uid}`;
  const remoto = comoListas(await b.ler(base)) || {};
  const chars = {},
    campanhas = {};
  for (const [k, v] of Object.entries(remoto)) {
    if (k.startsWith("c_") && v && v.id) chars[v.id] = comoFicha(v);
    else if (k.startsWith("g_") && v && v.id) campanhas[v.id] = comoCampanha(v);
  }
  const meta = remoto.meta || {};
  // O que está só neste aparelho, ou está mais novo aqui, sobe para a conta
  for (const [id, c] of Object.entries(state.chars))
    if (!chars[id] || maisNova(c, chars[id])) {
      chars[id] = c;
      dirty.add(id);
    }
  for (const [id, g] of Object.entries(state.campanhas || {}))
    if (!campanhas[id] || maisNova(g, campanhas[id])) {
      campanhas[id] = g;
      dirty.add("g:" + id);
    }
  const escolher = (atual, salvo, lista) =>
    lista[atual] ? atual : lista[salvo] ? salvo : Object.keys(lista)[0] || null;
  setState({
    ...state,
    chars,
    campanhas,
    active: escolher(state.active, meta.active, chars),
    campanhaAtiva: escolher(state.campanhaAtiva, meta.campanhaAtiva, campanhas),
    mig: Math.max(state.mig || 0, meta.mig || 0),
  });
  migrate();
  saveLocal();
  dirty.add("__meta");
  usarNuvem(
    { set: (k, v) => b.gravar(`${base}/${k}`, v), del: (k) => b.remover(`${base}/${k}`) },
    "Salvo na sua conta Google"
  );
  render();
  await flush();
  parar = b.ouvirFilhos(base, { adicionado: chegou, mudado: chegou, removido: saiu });
}

export function desligarConta() {
  if (parar) parar();
  parar = null;
  usarNuvem(null);
}

/** Mudança vinda de outro aparelho (as próprias gravações voltam com o mesmo _em e são ignoradas). */
function chegou(k, v) {
  if (!v || !v.id) return;
  if (k.startsWith("c_")) {
    const c = comoFicha(v),
      local = state.chars[c.id];
    if (local && !maisNova(c, local)) return;
    state.chars[c.id] = c;
    if (!state.active) state.active = c.id;
  } else if (k.startsWith("g_")) {
    const g = comoCampanha(v),
      local = state.campanhas[g.id];
    if (local && !maisNova(g, local)) return;
    state.campanhas[g.id] = g;
    if (!state.campanhaAtiva) state.campanhaAtiva = g.id;
  } else return;
  saveLocal();
  redesenhar();
}
function saiu(k) {
  const id = k.slice(2);
  if (k.startsWith("c_") && state.chars[id] && !dirty.has(id)) {
    delete state.chars[id];
    if (state.active === id) state.active = Object.keys(state.chars)[0] || null;
  } else if (k.startsWith("g_") && state.campanhas[id] && !dirty.has("g:" + id)) {
    delete state.campanhas[id];
    if (state.campanhaAtiva === id) state.campanhaAtiva = Object.keys(state.campanhas)[0] || null;
  } else return;
  saveLocal();
  redesenhar();
}
/** Redesenha a tela, mas espera a pessoa sair do campo que está editando. */
let esperando = false;
function redesenhar() {
  const f = document.activeElement;
  const editando = f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName);
  if (!editando) return render();
  if (esperando) return;
  esperando = true;
  f.addEventListener(
    "blur",
    () => {
      esperando = false;
      setTimeout(redesenhar, 0);
    },
    { once: true }
  );
}
