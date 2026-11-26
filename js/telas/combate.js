/* ================= Mesa de combate: tela =================
   Mapa em SVG com as peças, ordem de iniciativa e (para o mestre) monstros e ajustes do mapa.
   Aberta em #combate, pelo hub (mestre) ou pelo selo da mesa na ficha (jogador).

   Atualização por região: cada novidade do banco mexe só no que mudou
   (uma peça, a lista de iniciativa, a lista de monstros). Durante o arrasto a peça é
   movida direto no SVG e a posição só vai para o banco ao soltar. */
import { seloConta } from "./conta.js";
import { esc, sg, uidDaFicha } from "../util.js";
import { cur } from "../interface/estado.js";
import { theme } from "../interface/tema.js";
import { state, statusHTML } from "../armazenamento/armazenamento.js";
import { resumoAoVivo } from "../tempo-real/resumo.js";
import { campanha } from "./mestre.js";
import {
  TAM_CASA as T,
  colocarNoMapa,
  corDoJogador,
  tirarDoMapa,
  incluirNaOrdem,
  encaixar,
  entrarNoCombate,
  estadoPorPV,
  iniciais,
  mesaCombate,
  moverToken,
  podeMover,
  pararCombate,
} from "../tempo-real/combate.js";

/* ---------- Quem está abrindo: mestre ou jogador ---------- */

export let papelPreferido = (() => {
  try {
    return sessionStorage.getItem("codex-combate-papel");
  } catch (e) {
    return null;
  }
})();
export function setPapelPreferido(v) {
  papelPreferido = v;
  try {
    sessionStorage.setItem("codex-combate-papel", v);
  } catch (e) {}
}
export function contextoCombate() {
  const g = campanha(),
    c = cur();
  const mestre = g && g.mesa ? { papel: "mestre", codigo: g.mesa.codigo, nome: g.nome } : null;
  const jogador = c && c.mesa ? { papel: "jogador", codigo: c.mesa.codigo, nome: c.mesa.nome, c } : null;
  if (papelPreferido === "jogador" && jogador) return jogador;
  if (papelPreferido === "mestre" && mestre) return mestre;
  return mestre || jogador;
}

/* ---------- Peças ---------- */

let arrastando = null;
const ESTADO_CLASSE = {
  ferido: "tk-ferido",
  "muito ferido": "tk-muito",
  caído: "tk-caido",
  morrendo: "tk-caido",
  morto: "tk-caido",
};
/**
 * PV de uma peça de personagem: { atual, max, temp }, ou null. Peça de jogador na mesa usa a
 * ficha ao vivo; peça de ficha do hub usa a ficha da campanha (só o mestre tem a campanha).
 */
export function pvDoToken(id, t) {
  let hp = null;
  if (t.tipo === "pj") {
    const r = mesaCombate.fichas[t.ficha || t.dono];
    hp = r && r.hp;
  } else if (t.tipo === "ficha") {
    const g = campanhaDaMesa();
    const m = g && g.membros.find((x) => "h_" + x.mid === id);
    hp = m && resumoAoVivo(m.c).hp;
  } else if (t.tipo === "monstro") {
    // Só o mestre tem os PV dos monstros (ficam em privado/<código>/monstros)
    const m = mesaCombate.monstros[id];
    hp = m && m.pvMax ? { atual: m.pv, max: m.pvMax } : null;
  }
  return hp ? { atual: +hp.atual || 0, max: +hp.max || 1, temp: +hp.temp || 0 } : null;
}
export function estadoDoToken(id, t) {
  const pv = pvDoToken(id, t);
  if (pv) return estadoPorPV(pv.atual, pv.max);
  return t.tipo === "pj" ? "ileso" : t.estado || "ileso";
}
/** Placa de PV na base da peça (personagem ou monstro), com barra e números (só o mestre vê). */
function pvNaPeca(id, t, est) {
  if (mesaCombate.papel !== "mestre") return { placa: "", titulo: "" };
  const pv = pvDoToken(id, t);
  if (!pv) return { placa: "", titulo: "" };
  const largura = T - 6;
  const cheio = Math.max(0, Math.min(1, pv.atual / pv.max));
  const cor = est === "ileso" ? "ok" : est === "ferido" ? "ferido" : "grave";
  return {
    placa: `<g class="tk-placa"><rect x="3" y="${T - 14}" width="${largura}" height="12" rx="3" class="tk-pv-fundo"/>
      <rect x="3" y="${T - 14}" width="${(largura * cheio).toFixed(1)}" height="12" rx="3" class="tk-pv ${cor}"/>
      <text x="${T / 2}" y="${T - 5}" text-anchor="middle" class="tk-pvtxt">${pv.atual}/${pv.max}</text></g>`,
    titulo: ` · PV ${pv.atual}/${pv.max}${pv.temp ? ` (+${pv.temp} temporários)` : ""}`,
  };
}
function dentroDoToken(id, t) {
  const est = estadoDoToken(id, t);
  const vez = mesaCombate.combate && mesaCombate.combate.vez === id;
  const meio = T / 2;
  const marca =
    est === "ferido" || est === "muito ferido"
      ? `<circle cx="${T - 9}" cy="9" r="7" class="tk-marca"/>`
      : ESTADO_CLASSE[est] === "tk-caido"
        ? `<path d="M12 12 L${T - 12} ${T - 12} M${T - 12} 12 L12 ${T - 12}" class="tk-x"/>`
        : "";
  const pv = pvNaPeca(id, t, est);
  // Monstro escondido (só o mestre vê a peça): olho riscado no canto
  const olho = t.escondido
    ? `<g class="tk-olho"><circle cx="9" cy="9" r="8.5"/><path d="M3.5 9 Q9 3.5 14.5 9 Q9 14.5 3.5 9 Z"/><circle cx="9" cy="9" r="1.8" class="tk-olho-pupila"/><path d="M3.5 14.5 L14.5 3.5"/></g>`
    : "";
  return `<title>${esc(t.nome)}: ${esc(est)}${esc(pv.titulo)}${t.escondido ? " · escondido dos jogadores" : ""}</title>
    ${vez ? `<circle cx="${meio}" cy="${meio}" r="${meio - 1}" class="tk-vez"/>` : ""}
    <circle cx="${meio}" cy="${meio}" r="${meio - 6}" fill="${esc(t.cor || "#666")}" class="tk-corpo"/>
    <text x="${meio}" y="${meio + 5}" text-anchor="middle" class="tk-ini">${esc(iniciais(t.nome))}</text>
    ${marca}
    ${pv.placa}
    ${olho}
    <text x="${meio}" y="${T + 11}" text-anchor="middle" class="tk-nome">${esc(t.nome)}</text>`;
}
function classesDoToken(id, t) {
  const est = estadoDoToken(id, t);
  return `tk ${podeMover(t) ? "movel" : ""} ${ESTADO_CLASSE[est] || ""} ${t.dono === mesaCombate.uid ? "meu" : ""} ${t.escondido ? "tk-escondido" : ""}`;
}
function tokenSVG(id, t) {
  return `<g class="${classesDoToken(id, t)}" id="tk_${id}" data-id="${id}" tabindex="${podeMover(t) ? 0 : -1}" role="img" aria-label="${esc(t.nome)}" style="transform:translate(${t.x * T}px,${t.y * T}px)">${dentroDoToken(id, t)}</g>`;
}
function fundoSVG() {
  const f = mesaCombate.fundo;
  const { colunas: C, linhas: L } = mesaCombate.config;
  return f ? `<image href="${esc(f)}" x="0" y="0" width="${C * T}" height="${L * T}" preserveAspectRatio="none"/>` : "";
}
export function mapaSVG() {
  const { colunas: C, linhas: L } = mesaCombate.config;
  const tokens = Object.entries(mesaCombate.tokens)
    .filter(([, t]) => t.nome)
    .map(([id, t]) => tokenSVG(id, t))
    .join("");
  return `<svg id="cb_svg" viewBox="0 -2 ${C * T} ${L * T + 16}" role="application" aria-label="Mapa de combate, ${C} por ${L} quadrados">
    <defs><pattern id="cb_grade" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><path d="M ${T} 0 L 0 0 0 ${T}" class="cb-linha"/></pattern></defs>
    <rect width="${C * T}" height="${L * T}" class="cb-chao"/>
    <g id="cb_fundo">${fundoSVG()}</g>
    <rect width="${C * T}" height="${L * T}" fill="url(#cb_grade)"/>
    <g id="cb_tokens">${tokens}</g></svg>`;
}

/* ---------- Painéis ---------- */

function painelOrdem() {
  const cb = mesaCombate.combate;
  const mestre = mesaCombate.papel === "mestre";
  if (!cb || !cb.ordem)
    return `<h2>Iniciativa</h2><p class="small muted" style="margin:0">Combate não começou.</p>
      ${mestre ? `<button class="btn pri" data-a="cbrolar">Começar combate</button><p class="small muted" style="margin:0">Todas as peças do mapa entram na lista. Depois é só pôr na ordem.</p>` : ""}`;
  const minha = Object.entries(mesaCombate.tokens).find(([, t]) => t.dono === mesaCombate.uid);
  const minhaVez = minha && cb.vez === minha[0];
  const ordem = cb.ordem.filter((o) => mesaCombate.tokens[o.id]);
  const linhas = ordem
    .map((o, i) => {
      const t = mesaCombate.tokens[o.id];
      const est = estadoDoToken(o.id, t);
      const valor = o.valor === null || o.valor === undefined ? "" : o.valor;
      const controles = mestre
        ? `<input class="cb-val" type="number" value="${esc(valor)}" data-a="cbvalor" data-id="${o.id}" aria-label="Iniciativa de ${esc(t.nome)}" placeholder="—">
           <button class="btn sm ghost cb-seta" data-a="cbsubir" data-id="${o.id}" ${i === 0 ? "disabled" : ""} aria-label="Subir ${esc(t.nome)}">▲</button>
           <button class="btn sm ghost cb-seta" data-a="cbdescer" data-id="${o.id}" ${i === ordem.length - 1 ? "disabled" : ""} aria-label="Descer ${esc(t.nome)}">▼</button>`
        : valor !== ""
          ? `<b class="cb-valor">${esc(valor)}</b>`
          : "";
      return `<li class="cb-item ${o.id === cb.vez ? "vez" : ""}" ${o.id === cb.vez ? 'aria-current="true"' : ""}>
        <span class="cb-pos">${i + 1}</span><span class="cb-cor" style="background:${esc(t.cor)}"></span>
        <span class="cb-nome">${esc(t.nome)}${est === "ileso" ? "" : ` <span class="small muted">${esc(est)}</span>`}</span>${controles}</li>`;
    })
    .join("");
  return `<div class="row"><h2>Iniciativa</h2><span class="spacer"></span><span class="tag">Rodada ${cb.rodada}</span></div>
    ${minhaVez ? `<div class="notice cb-suavez"><b>É a sua vez!</b></div>` : ""}
    <ol class="cb-ordem">${linhas}</ol>
    ${
      mestre
        ? `<p class="small muted" style="margin:0">Use ▲ ▼ para pôr na ordem, ou anote o valor de cada um e clique em Ordenar pelos valores.</p>
          <div class="row"><button class="btn sm" data-a="cbordenar">Ordenar pelos valores</button></div>
          <div class="row"><button class="btn" data-a="cbanterior">Anterior</button><button class="btn pri" data-a="cbproximo">Próximo</button><span class="spacer"></span><button class="btn sm danger" data-a="cbencerrar">Encerrar</button></div>`
        : ""
    }`;
}
/** Monstros marcados na lista, para mostrar ou esconder vários de uma vez. */
export const monstrosMarcados = new Set();
function listaMonstros() {
  const ms = Object.entries(mesaCombate.tokens).filter(([, t]) => t.tipo === "monstro" && t.nome);
  for (const id of [...monstrosMarcados]) if (!mesaCombate.tokens[id]) monstrosMarcados.delete(id);
  if (!ms.length) return `<p class="small muted" style="margin:0">Nenhum monstro no mapa.</p>`;
  const escondidos = ms.filter(([, t]) => t.escondido).length;
  const todos = ms.every(([id]) => monstrosMarcados.has(id));
  return `<div class="row cb-sel">
      <label class="small"><input type="checkbox" data-a="cbseltodos" ${todos ? "checked" : ""}> Marcar todos</label>
      <button class="btn sm" data-a="cbvissel" data-v="1" ${monstrosMarcados.size ? "" : "disabled"}>Mostrar marcados</button>
      <button class="btn sm" data-a="cbvissel" data-v="0" ${monstrosMarcados.size ? "" : "disabled"}>Esconder marcados</button>
    </div>
    <p class="small muted" style="margin:0">${escondidos ? `${escondidos} de ${ms.length} escondido(s) dos jogadores.` : "Todos visíveis para os jogadores."}</p>
    <ul class="cb-monstros">${ms
      .map(([id, t]) => {
        const m = mesaCombate.monstros[id] || {};
        return `<li class="cb-monstro ${t.escondido ? "escondido" : ""}">
        <div class="cb-monstro-topo">
          <input type="checkbox" data-a="cbsel" data-id="${id}" ${monstrosMarcados.has(id) ? "checked" : ""} aria-label="Marcar ${esc(t.nome)}">
          <div style="flex:1;min-width:0"><b>${esc(t.nome)}</b>
            <div class="small muted">PV ${m.pv ?? "?"}/${m.pvMax ?? "?"} · CA ${m.ca ?? "?"} · ${esc(t.estado || "ileso")} · ${t.escondido ? "<b>escondido</b>" : "visível"}</div></div>
          <button class="btn sm ghost" data-a="cbremover" data-id="${id}" aria-label="Remover ${esc(t.nome)}">✕</button>
        </div>
        <div class="cb-monstro-acoes">
          <button class="btn sm" data-a="cbvis" data-id="${id}" data-v="${t.escondido ? 1 : 0}" aria-label="${t.escondido ? "Mostrar" : "Esconder"} ${esc(t.nome)}">${t.escondido ? "Mostrar" : "Esconder"}</button>
          <button class="btn sm" data-a="cbdano" data-id="${id}" aria-label="Dano em ${esc(t.nome)}">Dano</button>
          <button class="btn sm" data-a="cbcura" data-id="${id}" aria-label="Curar ${esc(t.nome)}">Cura</button>
        </div></li>`;
      })
      .join("")}</ul>`;
}
export function atualizarListaMonstros() {
  const l = $("cb_lista");
  if (l) l.innerHTML = listaMonstros();
}
/* ---------- Fichas da campanha: pôr e tirar do mapa (só o mestre) ---------- */

/** Campanha do hub ligada a esta mesa. */
const campanhaDaMesa = () =>
  Object.values(state.campanhas || {}).find((g) => g.mesa && g.mesa.codigo === mesaCombate.codigo) || null;
/**
 * Peça de um membro da campanha. Quem entrou pela mesa (e continua nela) usa a peça do
 * jogador (pj_<chave>, o jogador move); ficha importada no hub usa h_<mid> (só o mestre move).
 */
function pecaDoMembro(m) {
  if (m.uid && m.origem === "mesa" && mesaCombate.fichas[m.uid])
    return {
      id: "pj_" + m.uid,
      nome: m.c.nome,
      cor: corDoJogador(m.uid),
      dono: uidDaFicha(m.uid),
      ficha: m.uid,
      tipo: "pj",
    };
  const hp = resumoAoVivo(m.c).hp;
  return {
    id: "h_" + m.mid,
    nome: m.c.nome,
    cor: corDoJogador(m.mid),
    dono: "mestre",
    tipo: "ficha",
    estado: estadoPorPV(+hp.atual, +hp.max || 1),
  };
}
function listaFichasCampanha() {
  const g = campanhaDaMesa();
  if (!g)
    return `<p class="small muted" style="margin:0">Esta mesa não está ligada a uma campanha deste navegador.</p>`;
  if (!g.membros.length) return `<p class="small muted" style="margin:0">A campanha ainda não tem fichas.</p>`;
  return `<ul class="cb-pecas">${g.membros
    .map((m) => {
      const p = pecaDoMembro(m);
      const noMapa = !!mesaCombate.tokens[p.id];
      const origem = p.tipo === "pj" ? "Jogador na mesa" : "Ficha do hub";
      const botao = noMapa
        ? `<button class="btn sm ghost" data-a="cbfichaout" data-m="${m.mid}" aria-label="Tirar ${esc(m.c.nome)} do mapa">Tirar do mapa</button>`
        : `<button class="btn sm pri" data-a="cbfichain" data-m="${m.mid}" aria-label="Colocar ${esc(m.c.nome)} no mapa">Colocar no mapa</button>`;
      return `<li class="cb-item"><span class="cb-cor" style="background:${esc(p.cor)}"></span>
        <span class="cb-peca"><b>${esc(m.c.nome)}</b><span class="small muted">${origem} · ${noMapa ? "no mapa" : "fora do mapa"}</span></span>${botao}</li>`;
    })
    .join("")}</ul>`;
}
/** Botões "Colocar no mapa" e "Tirar do mapa" da lista de fichas da campanha. */
export async function colocarMembro(mid) {
  const g = campanhaDaMesa();
  const m = g && g.membros.find((x) => x.mid === mid);
  if (m) await colocarNoMapa(pecaDoMembro(m));
}
export async function tirarMembro(mid) {
  const g = campanhaDaMesa();
  const m = g && g.membros.find((x) => x.mid === mid);
  if (m) await tirarDoMapa(pecaDoMembro(m).id);
}

/* Lista de peças embaixo do mapa (só o mestre): tudo que está no mapa, com o botão de tirar */
export let pecaATirar = null;
export const setPecaATirar = (v) => (pecaATirar = v);
const ROTULO_ESTADO = {
  ileso: "ileso",
  ferido: "ferido",
  "muito ferido": "muito ferido",
  caído: "caído",
  morrendo: "morrendo",
  morto: "morto",
};
/** Personagens no mapa (os monstros ficam na lista de monstros, logo acima). */
function listaPecas() {
  const pecas = Object.entries(mesaCombate.tokens)
    .filter(([, t]) => t && t.nome && t.tipo !== "monstro")
    .sort(
      ([, a], [, b]) =>
        (a.tipo === "monstro" ? 1 : 0) - (b.tipo === "monstro" ? 1 : 0) || String(a.nome).localeCompare(b.nome)
    );
  if (!pecas.length) return `<p class="small muted" style="margin:0">Nenhum personagem no mapa.</p>`;
  return `<ul class="cb-pecas">${pecas
    .map(([id, t]) => {
      const pj = t.tipo === "pj";
      // Peça de personagem cuja ficha já saiu da mesa (sobrou de antes): só tira do mapa
      const naMesa = pj && t.ficha && mesaCombate.fichas[t.ficha];
      const tipo =
        (t.escondido ? "Escondido · " : "") +
        (pj
          ? naMesa
            ? "Personagem de jogador"
            : "Personagem (fora da mesa)"
          : t.tipo === "ficha"
            ? "Ficha do hub"
            : "Monstro / NPC");
      const botao = naMesa
        ? `<button class="btn sm ghost" data-a="cbtirar" data-id="${id}" aria-label="Tirar ${esc(t.nome)} da mesa">Tirar da mesa</button>`
        : `<button class="btn sm ghost" data-a="cbremover" data-id="${id}" aria-label="Remover ${esc(t.nome)} do mapa">Remover</button>`;
      return `<li class="cb-item"><span class="cb-cor" style="background:${esc(t.cor || "#888")}"></span>
        <span class="cb-peca"><b>${esc(t.nome)}</b><span class="small muted">${tipo} · ${ROTULO_ESTADO[estadoDoToken(id, t)] || "ileso"}</span></span>${botao}</li>`;
    })
    .join("")}</ul>`;
}

function painelMonstros() {
  return `<h2>Adicionar monstros e NPCs</h2>
    <p class="small muted" style="margin:0">Eles aparecem em "Peças no mapa", embaixo do mapa.</p>
    <div class="fields cb-form">
      <label class="f" for="cbm_nome">Nome<input id="cbm_nome" type="text" placeholder="ex.: Goblin"></label>
      <label class="f" for="cbm_pv">PV<input id="cbm_pv" type="number" min="1" value="6"></label>
      <label class="f" for="cbm_ca">CA<input id="cbm_ca" type="number" value="15"></label>
      <label class="f" for="cbm_qtd">Qtd.<input id="cbm_qtd" type="number" min="1" max="20" value="1"></label>
    </div>
    <label class="small"><input id="cbm_esc" type="checkbox" checked> Entrar escondido dos jogadores</label>
    <div class="row"><button class="btn pri" data-a="cbaddmonstro">Adicionar ao mapa</button><span id="cbm_msg" class="small" style="color:var(--bad)" role="status"></span></div>
`;
}
function painelMapa() {
  const { colunas, linhas } = mesaCombate.config;
  return `<h2>Mapa</h2>
    <div class="fields cb-form">
      <label class="f" for="cbc_col">Colunas<input id="cbc_col" type="number" min="5" max="60" value="${colunas}"></label>
      <label class="f" for="cbc_lin">Linhas<input id="cbc_lin" type="number" min="5" max="60" value="${linhas}"></label>
    </div>
    <div class="row"><button class="btn" data-a="cbcfg">Aplicar tamanho</button></div>
    <div class="row"><label class="btn" for="cbc_img">Enviar imagem de fundo</label><input id="cbc_img" type="file" accept="image/*" data-a="cbfundo" style="position:absolute;left:-9999px">
      ${mesaCombate.fundo ? `<button class="btn ghost" data-a="cblimpar">Remover imagem</button>` : ""}</div>
    <div class="row" style="align-items:flex-end"><label class="f" for="cbc_link" style="flex:1">Ou link de uma imagem<input id="cbc_link" type="url" placeholder="https://..."></label><button class="btn" data-a="cblink">Usar link</button></div>
    <p class="small muted" style="margin:0">Imagens enviadas são reduzidas para caber no plano gratuito. Ajuste colunas e linhas para a grade bater com o desenho.</p>
    <span id="cbc_msg" class="small" role="status"></span>`;
}

/* ---------- Tela ---------- */

export function topoCombate(ctx) {
  const volta =
    ctx && ctx.papel === "mestre"
      ? `<a class="btn sm" href="#mestre">Voltar ao hub</a>`
      : `<a class="btn sm" href="#painel">Voltar à ficha</a>`;
  document.getElementById("top").innerHTML = `
   <div class="idrow"><h1>Combate</h1><span class="sub">${ctx ? `${esc(ctx.nome || "Mesa")} · mesa ${esc(ctx.codigo)} · ${ctx.papel === "mestre" ? "mestre" : "jogador"}` : "Mesa online"}</span>
   <span class="spacer"></span>${volta}</div>
   <div class="row"><span class="status" id="st">${statusHTML()}</span>${seloConta()}<span class="spacer"></span>
   <span class="theme" role="group" aria-label="Tema">${[
     ["light", "Claro"],
     ["dark", "Escuro"],
     ["auto", "Automático"],
   ]
     .map(([k, n]) => `<button data-a="theme" data-t="${k}" aria-pressed="${theme === k}">${n}</button>`)
     .join("")}</span></div>`;
}

export function vCombate() {
  const ctx = contextoCombate();
  topoCombate(ctx);
  if (!ctx)
    return `<div class="grid"><section class="card c12"><h2>Mesa de combate</h2>
      <p style="margin:0;line-height:1.5">Para abrir o mapa, entre numa mesa pelo selo <b>Entrar numa mesa</b> no topo da ficha (jogador) ou abra a mesa online de uma campanha no hub (mestre).</p>
      <div class="row"><a class="btn" href="#painel">Ir para a ficha</a><a class="btn" href="#mestre">Ir para o hub do mestre</a></div></section></div>`;
  const mestre = ctx.papel === "mestre";
  const carregando = mesaCombate.codigo !== ctx.codigo || mesaCombate.papel !== ctx.papel;
  return `<div class="cb-layout">
    <div class="cb-esq">
    <section class="card cb-mapa"><div class="cb-rolagem" id="cb_area">${carregando ? `<p class="muted">Carregando o mapa…</p>` : mapaSVG()}</div>
      <p class="small muted" style="margin:0">${mestre ? "Arraste qualquer peça." : "Arraste a sua peça (contorno destacado). Com ela selecionada, as setas do teclado também movem."}</p></section>
    ${
      mestre
        ? `<section class="card"><h2>Fichas da campanha</h2><div id="cb_fichas">${carregando ? "" : listaFichasCampanha()}</div></section>
           <section class="card cb-pecas-secao"><h2>Peças no mapa</h2>
             <h3 class="cb-sub">Monstros e NPCs</h3>
             <p class="small muted" style="margin:0">Os jogadores veem só o estado (ileso, ferido, muito ferido, caído). Monstros escondidos (meio transparentes, com o olho riscado) só você vê.</p>
             <div class="row"><label for="cbm_valor" class="small muted">Valor de dano ou cura</label><input id="cbm_valor" type="number" min="0" value="1" style="width:72px"></div>
             <div id="cb_lista">${carregando ? "" : listaMonstros()}</div>
             <h3 class="cb-sub">Personagens</h3>
             <div id="cb_pecas">${carregando ? "" : listaPecas()}</div></section>`
        : ""
    }
    </div>
    <aside class="cb-lado">
      <section class="card" id="cb_ordem">${painelOrdem()}</section>
      ${mestre ? `<section class="card" id="cb_monstros">${painelMonstros()}</section><section class="card" id="cb_cfg">${painelMapa()}</section>` : ""}
    </aside></div>`;
}

/* ---------- Atualizações por região ---------- */

const $ = (id) => document.getElementById(id);
function atualizarToken(id) {
  if (arrastando === id) return;
  const t = mesaCombate.tokens[id];
  const el = $("tk_" + id);
  const camada = $("cb_tokens");
  if (!camada) return;
  if (!t || !t.nome) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    camada.insertAdjacentHTML("beforeend", tokenSVG(id, t));
    return;
  }
  // Mesmo elemento: a mudança de posição anima pela transição do CSS
  el.setAttribute("class", classesDoToken(id, t));
  el.style.transform = `translate(${t.x * T}px,${t.y * T}px)`;
  el.innerHTML = dentroDoToken(id, t);
}
let ordemPendente = false;
function atualizarOrdem() {
  const el = $("cb_ordem");
  if (!el) return;
  // Se o mestre está digitando um valor de iniciativa, espera ele sair do campo
  if (el.contains(document.activeElement) && document.activeElement.tagName === "INPUT") {
    if (!ordemPendente) {
      ordemPendente = true;
      el.addEventListener(
        "focusout",
        () => {
          ordemPendente = false;
          setTimeout(atualizarOrdem, 0);
        },
        { once: true }
      );
    }
    return;
  }
  el.innerHTML = painelOrdem();
}
function atualizarPecas() {
  const el = $("cb_pecas");
  if (el) el.innerHTML = listaPecas();
  const f = $("cb_fichas");
  if (f) f.innerHTML = listaFichasCampanha();
}
function atualizarTodosTokens() {
  Object.keys(mesaCombate.tokens).forEach(atualizarToken);
}
const avisos = {
  tokens: (id) => {
    atualizarToken(id);
    // Peça nova com o combate em andamento entra no fim da lista (o mestre grava)
    if (mesaCombate.papel === "mestre" && mesaCombate.tokens[id]) incluirNaOrdem(id);
    atualizarOrdem();
    const l = $("cb_lista");
    if (l) l.innerHTML = listaMonstros();
    atualizarPecas();
  },
  combate: () => {
    atualizarOrdem();
    atualizarTodosTokens(); // anel de "é a vez"
  },
  config: () => {
    const a = $("cb_area");
    if (a) a.innerHTML = mapaSVG();
  },
  fundo: () => {
    const f = $("cb_fundo");
    if (f) f.innerHTML = fundoSVG();
    const cfg = $("cb_cfg");
    if (cfg && !cfg.contains(document.activeElement)) cfg.innerHTML = painelMapa();
  },
  monstros: () => {
    const l = $("cb_lista");
    if (l) l.innerHTML = listaMonstros();
    // PV mudaram: redesenha as peças de monstro (placa de PV e estado)
    for (const [id, t] of Object.entries(mesaCombate.tokens)) if (t.tipo === "monstro") atualizarToken(id);
  },
  fichas: (chave) => {
    const id = "pj_" + chave;
    if (mesaCombate.tokens[id]) atualizarToken(id);
    atualizarOrdem();
    atualizarPecas();
  },
};

/** Liga a tela ao banco (uma vez por mesa) e prepara o arrasto. Chamado depois de cada render. */
export async function montarCombate() {
  const ctx = contextoCombate();
  if (!ctx) return;
  if (mesaCombate.codigo !== ctx.codigo || mesaCombate.papel !== ctx.papel || mesaCombate.status === "fora") {
    try {
      await entrarNoCombate(ctx.codigo, ctx.papel, avisos, ctx.c);
    } catch (e) {
      const a = $("cb_area");
      if (a) a.innerHTML = `<p style="color:var(--bad)">Não foi possível abrir o mapa: ${esc(e.message || e)}</p>`;
      return;
    }
    const a = $("cb_area");
    if (a) a.innerHTML = mapaSVG();
    atualizarOrdem();
    atualizarPecas();
    atualizarListaMonstros();
  }
  const area = $("cb_area");
  if (area && !area.dataset.ligado) {
    area.dataset.ligado = "1";
    area.addEventListener("pointerdown", iniciarArrasto);
    area.addEventListener("keydown", teclado);
    area.addEventListener("contextmenu", abrirMenuPeca);
  }
}
export function sairDoCombate() {
  fecharMenuPeca();
  if (mesaCombate.status !== "fora") pararCombate();
}

/* ---------- Arrastar ---------- */

function pontoSVG(e) {
  const svg = $("cb_svg");
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
/* ---------- Menu da peça (botão direito, só o mestre) ---------- */

/** Opções do menu para a peça: [rótulo, ação, extras de data-*, perigosa?]. */
function opcoesDaPeca(id, t) {
  if (t.tipo === "monstro") {
    const morto = estadoDoToken(id, t) === "morto";
    return [
      t.escondido ? ["Revelar", "cbvis", { v: 1 }] : ["Esconder", "cbvis", { v: 0 }],
      ...(morto ? [] : [["Matar", "cbmatar", {}, true]]),
      ["Remover", "cbremover", {}, true],
    ];
  }
  const naMesa = t.tipo === "pj" && t.ficha && mesaCombate.fichas[t.ficha];
  return [["Tirar do mapa", "cbtirarmapa", {}], ...(naMesa ? [["Tirar da mesa", "cbtirar", {}, true]] : [])];
}
export function fecharMenuPeca() {
  const m = document.getElementById("cb_menu");
  if (m) m.remove();
  document.removeEventListener("pointerdown", foraDoMenu, true);
  window.removeEventListener("resize", fecharMenuPeca);
  window.removeEventListener("scroll", fecharMenuPeca, true);
}
function foraDoMenu(e) {
  if (!e.target.closest("#cb_menu")) fecharMenuPeca();
}
function abrirMenuPeca(e) {
  const g = e.target.closest(".tk");
  if (mesaCombate.papel !== "mestre" || !g) return;
  const id = g.dataset.id;
  const t = mesaCombate.tokens[id];
  if (!t) return;
  e.preventDefault();
  fecharMenuPeca();
  const itens = opcoesDaPeca(id, t)
    .map(([rotulo, acao, extra, perigo]) => {
      const dados = Object.entries(extra)
        .map(([k, v]) => ` data-${k}="${v}"`)
        .join("");
      return `<button role="menuitem" class="${perigo ? "perigo" : ""}" data-a="${acao}" data-id="${id}"${dados}>${rotulo}</button>`;
    })
    .join("");
  const menu = document.createElement("div");
  menu.id = "cb_menu";
  menu.className = "cb-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", `Ações de ${t.nome}`);
  menu.innerHTML = `<div class="cb-menu-tit">${esc(t.nome)}</div>${itens}`;
  document.body.appendChild(menu);
  // Pelo mouse abre no ponteiro; pelo teclado (tecla de menu), junto da peça. Sempre dentro da tela.
  const r = g.getBoundingClientRect();
  const x0 = e.clientX || r.right;
  const y0 = e.clientY || r.top;
  const { width: w, height: h } = menu.getBoundingClientRect();
  menu.style.left = Math.max(4, Math.min(x0, innerWidth - w - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(y0, innerHeight - h - 4)) + "px";
  // Fecha ao escolher, ao clicar fora, com Esc, ao rolar a página ou mudar o tamanho da janela
  menu.addEventListener("click", (ev) => ev.target.closest("button") && setTimeout(fecharMenuPeca));
  menu.addEventListener("keydown", (ev) => {
    const botoes = [...menu.querySelectorAll("button")];
    const i = botoes.indexOf(document.activeElement);
    if (ev.key === "Escape") {
      fecharMenuPeca();
      g.focus();
    } else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      botoes[(i + (ev.key === "ArrowDown" ? 1 : botoes.length - 1)) % botoes.length].focus();
    }
  });
  document.addEventListener("pointerdown", foraDoMenu, true);
  window.addEventListener("resize", fecharMenuPeca);
  window.addEventListener("scroll", fecharMenuPeca, true);
  menu.querySelector("button").focus();
}

function iniciarArrasto(e) {
  const g = e.target.closest(".tk");
  if (!g) return;
  const id = g.dataset.id,
    t = mesaCombate.tokens[id];
  if (!podeMover(t)) return;
  e.preventDefault();
  g.focus({ preventScroll: true });
  g.setPointerCapture(e.pointerId);
  arrastando = id;
  g.classList.add("arrastando");
  const inicio = pontoSVG(e);
  const desloc = { x: inicio.x - t.x * T, y: inicio.y - t.y * T };
  const mover = (ev) => {
    const p = pontoSVG(ev);
    g.style.transform = `translate(${p.x - desloc.x}px,${p.y - desloc.y}px)`;
  };
  const soltar = (ev) => {
    g.removeEventListener("pointermove", mover);
    g.removeEventListener("pointerup", soltar);
    g.removeEventListener("pointercancel", soltar);
    const p = pontoSVG(ev);
    const pos = encaixar((p.x - desloc.x) / T, (p.y - desloc.y) / T, mesaCombate.config);
    g.classList.remove("arrastando");
    g.style.transform = `translate(${pos.x * T}px,${pos.y * T}px)`;
    arrastando = null;
    // Só aqui a posição vai para o banco
    if (pos.x !== t.x || pos.y !== t.y) moverToken(id, pos.x, pos.y);
  };
  g.addEventListener("pointermove", mover);
  g.addEventListener("pointerup", soltar);
  g.addEventListener("pointercancel", soltar);
}
function teclado(e) {
  const g = e.target.closest && e.target.closest(".tk");
  if (!g) return;
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  const id = g.dataset.id,
    t = mesaCombate.tokens[id];
  if (!podeMover(t)) return;
  e.preventDefault();
  moverToken(id, t.x + d[0], t.y + d[1]).then(() => atualizarToken(id));
}
