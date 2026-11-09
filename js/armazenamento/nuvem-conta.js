/* ================= Fichas na conta Google =================
   Com a conta Google, tudo o que fica no navegador também vai para usuarios/<uid>/ no
   Realtime Database:
     usuarios/<uid>/c_<id>   ficha
     usuarios/<uid>/g_<id>   campanha do hub do mestre
     usuarios/<uid>/meta     personagem e campanha ativos
   Ao entrar com o botão, se o navegador e a conta têm fichas diferentes, a pessoa escolhe
   (ver ligarConta e compararConta):
     "conta"      usa as da conta; as deste navegador são trocadas por elas
     "adicionar"  mantém as do navegador e traz as da conta como fichas novas
     "navegador"  mantém as do navegador e a conta passa a ter só elas
   Ao reabrir o app já logado, junta os dois lados, e em conflito vale a versão mais recente
   (campo _em). Depois, mudanças feitas em outro aparelho chegam sozinhas. O navegador
   continua com uma cópia, para funcionar sem internet. */
import { clone, comoListas, uidGen } from "../util.js";
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
// A mesma ficha nos dois lados, sem mudança (mesmo carimbo de alteração ou mesmo conteúdo)
const iguais = (local, daConta, normalizar) =>
  (local._em && local._em === daConta._em) || JSON.stringify(normalizar(clone(local))) === JSON.stringify(daConta);

async function lerConta(usuario) {
  const b = await conectarBanco();
  const base = `usuarios/${usuario.uid}`;
  const remoto = comoListas(await b.ler(base)) || {};
  const chars = {},
    campanhas = {};
  for (const [k, v] of Object.entries(remoto)) {
    if (k.startsWith("c_") && v && v.id) chars[v.id] = comoFicha(v);
    else if (k.startsWith("g_") && v && v.id) campanhas[v.id] = comoCampanha(v);
  }
  return { b, base, chars, campanhas, meta: remoto.meta || {} };
}

/**
 * Compara o navegador com a conta, para decidir se é preciso perguntar o que fazer.
 * Devolve { navegador, conta, ultima, pergunta, modo }: quantidades de fichas e campanhas de
 * cada lado, a data da última mudança na conta e, quando não há o que perguntar, o modo a usar.
 */
export async function compararConta(usuario) {
  const r = await lerConta(usuario);
  const conta = { fichas: Object.keys(r.chars).length, campanhas: Object.keys(r.campanhas).length };
  const navegador = { fichas: Object.keys(state.chars).length, campanhas: Object.keys(state.campanhas || {}).length };
  const ultima = Math.max(0, ...[...Object.values(r.chars), ...Object.values(r.campanhas)].map((x) => x._em || 0));
  const vazia = (x) => !x.fichas && !x.campanhas;
  let modo = null;
  if (vazia(conta)) modo = "navegador";
  else if (vazia(navegador)) modo = "conta";
  else {
    const mesmas = (locais, daConta, normalizar) =>
      Object.keys(locais).length === Object.keys(daConta).length &&
      Object.entries(locais).every(([id, x]) => daConta[id] && iguais(x, daConta[id], normalizar));
    if (mesmas(state.chars, r.chars, comoFicha) && mesmas(state.campanhas || {}, r.campanhas, comoCampanha))
      modo = "recente";
  }
  return { navegador, conta, ultima, pergunta: !modo, modo };
}

/** Rótulo que diferencia a cópia que veio da conta quando o nome já existe no navegador. */
export const SUFIXO_CONTA = " (conta Google)";
const normNome = (n) =>
  String(n || "")
    .trim()
    .toLowerCase();

/**
 * Junta duas listas (fichas ou campanhas) conforme o modo escolhido.
 * marca(id) põe o item na fila de gravação na conta (flush apaga da conta o que não está na lista).
 */
function juntar(locais, daConta, modo, normalizar, marca) {
  if (modo === "conta") return { ...daConta };
  const lista = { ...locais };
  if (modo === "navegador") {
    Object.keys(locais).forEach(marca);
    Object.keys(daConta).forEach((id) => !locais[id] && marca(id)); // só na conta: sai de lá
    return lista;
  }
  if (modo === "recente") {
    for (const [id, x] of Object.entries(daConta)) if (!locais[id] || maisNova(x, locais[id])) lista[id] = x; // em conflito, vale a mais recente
    for (const [id, x] of Object.entries(locais)) if (!daConta[id] || maisNova(x, daConta[id])) marca(id);
    return lista;
  }
  // "adicionar": as do navegador ficam como estão e as da conta entram como fichas novas
  Object.keys(locais).forEach(marca);
  const nomes = new Set(Object.values(locais).map((x) => normNome(x.nome)));
  for (const [id, x] of Object.entries(daConta)) {
    if (locais[id] && iguais(locais[id], x, normalizar)) continue; // a mesma ficha, sem mudança
    const nova = clone(x);
    // A mesma ficha alterada nos dois lados vira duas: a da conta ganha outro id
    if (locais[id]) {
      nova.id = uidGen();
      delete nova.mesa;
    }
    // Duas fichas com o mesmo nome: a da conta ganha um rótulo para não confundir
    if (nomes.has(normNome(nova.nome))) {
      let nome = `${nova.nome || "Sem nome"}${SUFIXO_CONTA}`;
      for (let n = 2; nomes.has(normNome(nome)); n++) nome = `${nova.nome || "Sem nome"} (conta Google ${n})`;
      nova.nome = nome;
    }
    nomes.add(normNome(nova.nome));
    lista[nova.id] = nova;
    marca(nova.id);
  }
  return lista;
}

/**
 * Liga a conta: junta o navegador com a conta conforme o modo ("recente", "conta",
 * "adicionar" ou "navegador") e passa a salvar tudo na conta.
 */
export async function ligarConta(usuario, modo = "recente") {
  desligarConta();
  setStatus("Abrindo a sua conta…", "pend");
  const { b, base, chars: daConta, campanhas: campanhasDaConta, meta } = await lerConta(usuario);
  const chars = juntar(state.chars, daConta, modo, comoFicha, (id) => dirty.add(id));
  const campanhas = juntar(state.campanhas || {}, campanhasDaConta, modo, comoCampanha, (id) => dirty.add("g:" + id));
  const escolher = (atual, salvo, lista) =>
    lista[atual] ? atual : lista[salvo] ? salvo : Object.keys(lista)[0] || null;
  setState({
    ...state,
    chars,
    campanhas,
    // Usando as da conta, abre o personagem que estava aberto na conta
    active: modo === "conta" ? escolher(meta.active, null, chars) : escolher(state.active, meta.active, chars),
    campanhaAtiva:
      modo === "conta"
        ? escolher(meta.campanhaAtiva, null, campanhas)
        : escolher(state.campanhaAtiva, meta.campanhaAtiva, campanhas),
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

/** Ao sair da conta escolhendo apagar: limpa fichas e campanhas deste navegador (a conta não muda). */
export function apagarDoNavegador() {
  desligarConta(); // antes de apagar, para nada ser apagado na conta
  dirty.clear();
  setState({ ...state, chars: {}, active: null, campanhas: {}, campanhaAtiva: null });
  saveLocal();
}
