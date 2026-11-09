/* ================= Mesa de combate: dados =================
   Mapa em grade com peças (tokens), monstros do mestre e ordem de iniciativa.

   Estrutura no banco (regras em database.rules.json):
     mesas/<CÓDIGO>/mapa/config          { colunas, linhas }                 só o mestre grava
     mesas/<CÓDIGO>/mapa/fundo           imagem (data URL) ou link            só o mestre grava
     mesas/<CÓDIGO>/mapa/tokens/<id>     { nome, cor, x, y, dono, tipo, estado }
                                         o jogador grava só a própria peça (dono = uid dele)
     mesas/<CÓDIGO>/mapa/combate         { rodada, vez, ordem: [{ id, valor }] }   só o mestre
     privado/<CÓDIGO>/monstros/<id>      { pv, pvMax, ca, ini }               só o mestre lê e grava

   Os jogadores veem dos monstros só o estado (ileso, ferido, muito ferido, caído).
   As funções puras (sem banco) ficam no começo, para os testes. */
import { comoListas, uidGen } from "../util.js";
import { conectarBanco } from "./banco.js";

export const TAM_CASA = 50; // tamanho de um quadrado da grade, em unidades do SVG
export const MAPA_PADRAO = { colunas: 20, linhas: 14 };
export const CORES_PJ = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#65a30d", "#ca8a04"];
export const COR_MONSTRO = "#b91c1c";

/* ---------- Funções puras ---------- */

/** Cor fixa para cada jogador, a partir do uid. */
export function corDoJogador(uid) {
  let h = 0;
  for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CORES_PJ[h % CORES_PJ.length];
}
/** Estado visível para todos a partir dos PV (os números ficam com o mestre). */
export function estadoPorPV(pv, pvMax) {
  if (pv <= -10) return "morto";
  if (pv < 0) return "morrendo";
  if (pv === 0) return "caído";
  if (pv >= pvMax) return "ileso";
  return pv / pvMax < 0.5 ? "muito ferido" : "ferido";
}
export const iniciais = (nome) =>
  String(nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
/** Posição dentro do mapa, encaixada na grade. */
export function encaixar(x, y, cfg) {
  return {
    x: Math.max(0, Math.min((cfg.colunas || MAPA_PADRAO.colunas) - 1, Math.round(x))),
    y: Math.max(0, Math.min((cfg.linhas || MAPA_PADRAO.linhas) - 1, Math.round(y))),
  };
}
/** Primeira casa livre, procurando a partir do canto superior esquerdo. */
export function casaLivre(tokens, cfg) {
  const ocupadas = new Set(Object.values(tokens || {}).map((t) => t.x + "," + t.y));
  const C = cfg.colunas || MAPA_PADRAO.colunas,
    L = cfg.linhas || MAPA_PADRAO.linhas;
  for (let y = 0; y < L; y++) for (let x = 0; x < C; x++) if (!ocupadas.has(x + "," + y)) return { x, y };
  return { x: 0, y: 0 };
}
/* Ordem de iniciativa: o app só põe todo mundo na lista; quem decide a ordem é o mestre,
   movendo cada um para cima ou para baixo, ou anotando o valor que cada um tirou. */

/** Todos os participantes na ordem inicial: personagens primeiro, depois monstros. */
export function ordemInicial(tokens) {
  return Object.entries(tokens)
    .filter(([, t]) => t.nome)
    .sort(([, a], [, b]) => (a.tipo === "pj" ? 0 : 1) - (b.tipo === "pj" ? 0 : 1))
    .map(([id]) => ({ id, valor: null }));
}
/** Move um participante uma posição para cima (-1) ou para baixo (+1). */
export function moverNaOrdem(ordem, id, sentido) {
  const i = ordem.findIndex((o) => o.id === id),
    j = i + sentido;
  if (i < 0 || j < 0 || j >= ordem.length) return ordem;
  const nova = ordem.slice();
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}
/** Ordena pelo valor anotado (maior primeiro); quem não tem valor fica no fim, na mesma ordem. */
export function ordenarPorValor(ordem) {
  const tem = (o) => o.valor !== null && o.valor !== undefined && o.valor !== "";
  return ordem
    .map((o, i) => ({ o, i }))
    .sort((a, b) => tem(b.o) - tem(a.o) || (tem(a.o) ? b.o.valor - a.o.valor : 0) || a.i - b.i)
    .map((x) => x.o);
}
/** Passa a vez; ao voltar ao primeiro da ordem, começa uma nova rodada. */
export function proximaVez(combate, sentido = 1) {
  const ordem = combate.ordem || [];
  if (!ordem.length) return combate;
  let i = ordem.findIndex((o) => o.id === combate.vez);
  let rodada = combate.rodada || 1;
  i += sentido;
  if (i >= ordem.length) {
    i = 0;
    rodada++;
  } else if (i < 0) {
    i = ordem.length - 1;
    rodada = Math.max(1, rodada - 1);
  }
  return { ...combate, vez: ordem[i].id, rodada };
}

/** Reduz a imagem do mapa para caber no banco (lado maior até 1600 px, JPEG). */
export async function reduzirImagem(arquivo, ladoMax = 1600, limiteBytes = 700_000) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("Não foi possível abrir a imagem."));
      i.src = url;
    });
    const k = Math.min(1, ladoMax / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k);
    cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    let q = 0.8,
      dados = cv.toDataURL("image/jpeg", q);
    while (dados.length > limiteBytes && q > 0.35) dados = cv.toDataURL("image/jpeg", (q -= 0.1));
    return { dados, largura: cv.width, altura: cv.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- Ligação com o banco ---------- */

export const mesaCombate = {
  codigo: null,
  papel: null, // "mestre" | "jogador"
  uid: null,
  config: { ...MAPA_PADRAO },
  fundo: "",
  tokens: {},
  combate: null,
  fichas: {}, // uid → resumo (para o estado das peças dos personagens)
  monstros: {}, // só o mestre: id → { pv, pvMax, ca, ini }
  status: "fora",
  erro: "",
};
let parar = [];

/**
 * Começa a receber o mapa. avisos.tokens(id), avisos.combate(), avisos.config(), avisos.fundo(),
 * avisos.monstros() e avisos.fichas() são chamados a cada mudança, para a tela atualizar só a região certa.
 */
export async function entrarNoCombate(codigo, papel, avisos, personagem) {
  pararCombate();
  Object.assign(mesaCombate, {
    codigo,
    papel,
    config: { ...MAPA_PADRAO },
    fundo: "",
    tokens: {},
    combate: null,
    fichas: {},
    monstros: {},
    status: "conectando",
    erro: "",
  });
  const b = await conectarBanco();
  mesaCombate.uid = b.uid;
  const base = `mesas/${codigo}/mapa`;
  const t = mesaCombate.tokens;
  parar.push(
    b.ouvir(`${base}/config`, (v) => {
      mesaCombate.config = { ...MAPA_PADRAO, ...(v || {}) };
      avisos.config();
    }),
    b.ouvir(`${base}/fundo`, (v) => {
      mesaCombate.fundo = v || "";
      avisos.fundo();
    }),
    b.ouvir(`${base}/combate`, (v) => {
      mesaCombate.combate = comoListas(v);
      avisos.combate();
    }),
    b.ouvirFilhos(`${base}/tokens`, {
      adicionado: (id, v) => ((t[id] = v), avisos.tokens(id)),
      mudado: (id, v) => ((t[id] = v), avisos.tokens(id)),
      removido: (id) => (delete t[id], avisos.tokens(id)),
    }),
    b.ouvirFilhos(`mesas/${codigo}/fichas`, {
      adicionado: (uid, v) => ((mesaCombate.fichas[uid] = comoListas(v.resumo)), garantirPeca(uid), avisos.fichas(uid)),
      mudado: (uid, v) => ((mesaCombate.fichas[uid] = comoListas(v.resumo)), avisos.fichas(uid)),
      removido: (uid) => (delete mesaCombate.fichas[uid], avisos.fichas(uid)),
    })
  );
  if (papel === "mestre")
    parar.push(
      b.ouvir(`privado/${codigo}/monstros`, (v) => {
        mesaCombate.monstros = v || {};
        avisos.monstros();
      })
    );
  // A peça do próprio jogador aparece sozinha ao abrir o mapa
  if (papel === "jogador" && personagem) await garantirPeca(b.uid, personagem.nome);
  mesaCombate.status = "ao-vivo";
}
export function pararCombate() {
  parar.forEach((f) => f());
  parar = [];
  mesaCombate.status = "fora";
}

/** Cria a peça de um personagem que ainda não tem (o mestre cria para todos; o jogador, para si). */
async function garantirPeca(uid, nome) {
  const id = "pj_" + uid;
  if (mesaCombate.tokens[id]) return;
  if (mesaCombate.papel === "jogador" && uid !== mesaCombate.uid) return;
  const b = await conectarBanco();
  const r = mesaCombate.fichas[uid];
  await b.criarSeNaoExiste(`mesas/${mesaCombate.codigo}/mapa/tokens/${id}`, {
    nome: nome || (r && r.nome) || "Personagem",
    cor: corDoJogador(uid),
    ...casaLivre(mesaCombate.tokens, mesaCombate.config),
    dono: uid,
    tipo: "pj",
  });
}

const caminho = (p) => `mesas/${mesaCombate.codigo}/mapa/${p}`;
export const podeMover = (t) => !!t && (mesaCombate.papel === "mestre" || t.dono === mesaCombate.uid);

export async function moverToken(id, x, y) {
  const t = mesaCombate.tokens[id];
  if (!podeMover(t)) return;
  const p = encaixar(x, y, mesaCombate.config);
  t.x = p.x;
  t.y = p.y;
  const b = await conectarBanco();
  await b.atualizar(caminho(`tokens/${id}`), { x: p.x, y: p.y });
}

/* ----- Só o mestre ----- */

export async function salvarConfig(cfg) {
  const b = await conectarBanco();
  await b.gravar(caminho("config"), { colunas: cfg.colunas, linhas: cfg.linhas });
}
export async function salvarFundo(dados) {
  const b = await conectarBanco();
  await b.gravar(caminho("fundo"), dados || null);
}
export async function adicionarMonstros({ nome, pv, ca, ini, quantidade = 1 }) {
  const b = await conectarBanco();
  for (let i = 1; i <= quantidade; i++) {
    const id = "m_" + uidGen();
    const nomeFinal = quantidade > 1 ? `${nome} ${i}` : nome;
    const pos = casaLivre(mesaCombate.tokens, mesaCombate.config);
    mesaCombate.tokens[id] = { ...pos }; // reserva a casa para o próximo da leva
    await b.gravar(`privado/${mesaCombate.codigo}/monstros/${id}`, { pv, pvMax: pv, ca, ini });
    await b.gravar(caminho(`tokens/${id}`), {
      nome: nomeFinal,
      cor: COR_MONSTRO,
      ...pos,
      dono: "mestre",
      tipo: "monstro",
      estado: "ileso",
    });
  }
}
export async function mudarPVMonstro(id, delta) {
  const m = mesaCombate.monstros[id];
  if (!m) return;
  const pv = Math.min(m.pvMax, m.pv + delta);
  const b = await conectarBanco();
  await b.atualizar(`privado/${mesaCombate.codigo}/monstros/${id}`, { pv });
  await b.atualizar(caminho(`tokens/${id}`), { estado: estadoPorPV(pv, m.pvMax) });
}
export async function removerToken(id) {
  const b = await conectarBanco();
  await b.remover(caminho(`tokens/${id}`));
  if (id.startsWith("m_")) await b.remover(`privado/${mesaCombate.codigo}/monstros/${id}`);
  const cb = mesaCombate.combate;
  if (cb && cb.ordem && cb.ordem.some((o) => o.id === id)) {
    const ordem = cb.ordem.filter((o) => o.id !== id);
    await b.gravar(
      caminho("combate"),
      ordem.length ? { ...cb, ordem, vez: cb.vez === id ? (ordem[0] || {}).id : cb.vez } : null
    );
  }
}
async function gravarCombate(cb) {
  const b = await conectarBanco();
  await b.gravar(caminho("combate"), cb);
}
/** Começa o combate com todas as peças do mapa na lista. */
export async function iniciarCombate() {
  const ordem = ordemInicial(mesaCombate.tokens);
  await gravarCombate({ rodada: 1, vez: ordem.length ? ordem[0].id : null, ordem });
}
export async function moverParticipante(id, sentido) {
  const cb = mesaCombate.combate;
  if (cb) await gravarCombate({ ...cb, ordem: moverNaOrdem(cb.ordem || [], id, sentido) });
}
export async function definirValor(id, valor) {
  const cb = mesaCombate.combate;
  if (!cb) return;
  const v = valor === "" || valor === null || isNaN(+valor) ? null : +valor;
  await gravarCombate({ ...cb, ordem: (cb.ordem || []).map((o) => (o.id === id ? { ...o, valor: v } : o)) });
}
export async function ordenarCombate() {
  const cb = mesaCombate.combate;
  if (cb) await gravarCombate({ ...cb, ordem: ordenarPorValor(cb.ordem || []) });
}
/** Peça que entrou no mapa com o combate em andamento vai para o fim da lista. */
export async function incluirNaOrdem(id) {
  const cb = mesaCombate.combate;
  const t = mesaCombate.tokens[id];
  if (!cb || !t || !t.nome || (cb.ordem || []).some((o) => o.id === id)) return;
  await gravarCombate({ ...cb, ordem: [...(cb.ordem || []), { id, valor: null }] });
}
export async function passarVez(sentido = 1) {
  if (!mesaCombate.combate) return;
  const b = await conectarBanco();
  await b.gravar(caminho("combate"), proximaVez(mesaCombate.combate, sentido));
}
export async function encerrarCombate() {
  const b = await conectarBanco();
  await b.remover(caminho("combate"));
}
