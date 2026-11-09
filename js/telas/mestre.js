/* ================= Hub do mestre =================
   Área da campanha, aberta em #mestre. O mestre dá nome à campanha e traz as fichas
   dos jogadores (PDF, texto de backup ou fichas deste aparelho). Cada ficha vira um card
   com PV, CA e as informações de combate; "Detalhes" abre o resto.

   As fichas importadas são cópias: para atualizar, importe de novo (o card com o
   mesmo nome é substituído). Com a mesa online aberta (js/tempo-real/mesa.js), as fichas
   dos jogadores que entraram com o código se atualizam sozinhas: só o card que mudou
   é redesenhado, sem mexer no resto da tela.

   Estrutura salva em state.campanhas[id]:
     { id, nome, criada, ordem, mesa?: { codigo },
       membros: [{ mid, importado, origem, c, uid? }] }   (uid = jogador ligado pela mesa) */
import { seloConta } from "./conta.js";
import { clamp, clone, esc, lvlName, mod, sg, sizeGrap, uidGen } from "../util.js";
import { ATTRS, SK } from "../regras/basicas.js";
import { at, classFeatures, cls, spellAttr } from "../regras/classes.js";
import { blankChar } from "../personagens/modelos.js";
import { ac, atkBonus, bba, dmgTxt, ensurePrep, isSpont, saves, skill, spell } from "../regras/calculos.js";
import { state, statusHTML, touch } from "../armazenamento/armazenamento.js";
import { theme } from "../interface/tema.js";
import { IDIOMAS, idioma, nomeDe } from "../interface/idioma.js";
import { normTxt } from "../pdf/importar.js";
import { modal } from "../interface/modais.js";
import { modo } from "../interface/estado.js";
import { agarrar, iniciativa, resumoAoVivo } from "../tempo-real/resumo.js";
import { abrirMesa, escutarMesa, linkConvite, mesaMestre } from "../tempo-real/mesa.js";

export const ORDENS = [
  ["chegada", "Ordem de importação"],
  ["nome", "Nome"],
  ["iniciativa", "Iniciativa"],
  ["pv", "PV atuais"],
  ["ca", "CA"],
];

/** Card aguardando confirmação para sair da campanha. */
export let membroARemover = null;
export const campanha = () => (state.campanhas || {})[state.campanhaAtiva] || null;
export function salvarCampanha(g) {
  touch("g:" + g.id);
  touch("__meta");
}

/* ---------- Valores mostrados no card ---------- */

export function estadoPV(hp) {
  const at_ = +hp.atual,
    mx = +hp.max || 0;
  if (at_ < -9) return "Morto";
  if (at_ < 0) return "Morrendo";
  if (at_ === 0) return "Inconsciente";
  if (+hp.contusao > 0 && +hp.contusao >= at_) return "Atordoado (contusão)";
  if (mx && at_ / mx < 0.34) return "Muito ferido";
  return "";
}
export function corPV(hp) {
  const pct = hp.max ? (hp.atual / hp.max) * 100 : 0;
  return hp.atual <= 0 || pct < 34 ? "var(--bad)" : pct < 67 ? "var(--warn)" : "var(--good)";
}
export { agarrar, iniciativa };

/** Valores do card: os que chegam ao vivo da mesa ou, sem mesa, calculados da cópia. */
export function valoresDoCard(m) {
  const vivo = m.uid && mesaMestre.vivos[m.uid];
  return vivo && vivo.resumo ? vivo.resumo : resumoAoVivo(m.c);
}

export function cardMembro(m) {
  const v = valoresDoCard(m);
  const vivo = m.uid ? mesaMestre.vivos[m.uid] : null;
  const hp = v.hp;
  const pct = hp.max ? clamp((hp.atual / hp.max) * 100, 0, 100) : 0;
  const est = estadoPV(hp);
  const st = (rot, x, extra) => `<div class="stat"><span>${rot}</span><b${extra || ""}>${x}</b></div>`;
  const data = new Date(m.importado).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const origem = { pdf: "PDF", backup: "backup", local: "deste aparelho", mesa: "mesa online" }[m.origem] || m.origem;
  const selo = m.uid
    ? vivo && vivo.online
      ? `<span class="tag mvivo" title="Atualiza sozinho">● ao vivo</span>`
      : `<span class="tag" title="Jogador fora da mesa: mostrando a última versão recebida">○ offline</span>`
    : "";
  return `<article class="card mcard" id="card_${m.mid}" aria-labelledby="mc_${m.mid}">
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
      <div style="flex:1;min-width:0"><h3 id="mc_${m.mid}" class="mnome">${esc(v.nome)}</h3>
      <div class="small muted mlinha">${esc([v.classe + " " + v.nivel, v.raca, v.tendencia].filter(Boolean).join(" · "))}</div>
      <div class="small muted mlinha">${v.jogador ? `Jogador: ${esc(v.jogador)}` : "&nbsp;"}</div></div>${selo}
    </div>
    <div class="row" style="align-items:baseline;gap:6px"><span class="small muted" style="font-weight:600;letter-spacing:.06em">PV</span><span class="big" style="font-size:28px">${hp.atual}</span><span class="muted">/ ${hp.max}</span>
      ${hp.temp ? `<span class="tag">+${hp.temp} temp.</span>` : ""}${est ? `<span class="tag" style="color:${corPV(hp)};border-color:${corPV(hp)}">${esc(est)}</span>` : ""}</div>
    <div class="hpbar" role="img" aria-label="${Math.round(pct)}% dos PV"><i style="width:${pct}%;background:${corPV(hp)}"></i></div>
    <div class="mefeitos" aria-label="Efeitos ativos">${(v.efeitos || []).map((e) => `<span class="tag gold">${esc(e)}</span>`).join("") || '<span class="small muted">Nenhum efeito ativo</span>'}</div>
    <div class="mstats">${st("CA", v.ca.total)}${st("Toque", v.ca.toque)}${st("Surpresa", v.ca.surpresa)}${st("Iniciativa", sg(v.iniciativa))}</div>
    <div class="mstats">${st("Fortitude", sg(v.fort))}${st("Reflexos", sg(v.ref))}${st("Vontade", sg(v.von))}${st("BBA", sg(v.bba))}</div>
    <div class="mstats">${st("Agarrar", sg(v.agarrar))}${st("Desloc.", esc(v.deslocamento || "—"), ' style="font-size:16px"')}${st("Inspiração", v.inspiracao)}</div>
    <div class="small muted mresist" title="${esc(v.resistCond || "")}">${v.resistCond ? esc(v.resistCond) : "&nbsp;"}</div>
    <div class="mfoot"><span class="small muted">${m.origem === "mesa" ? "Pela mesa online" : "Importado"} em ${data}${m.origem && m.origem !== "mesa" ? " · " + esc(origem) : ""}</span><div class="row" style="margin-top:8px">
      <button class="btn sm pri" data-a="mdetalhe" data-m="${m.mid}" aria-label="Detalhes de ${esc(v.nome)}">Detalhes</button>
      <button class="btn sm ghost" data-a="mremover" data-m="${m.mid}" aria-label="Tirar ${esc(v.nome)} da campanha">Remover</button></div></div>
  </article>`;
}

export function ordenados(g) {
  const ms = g.membros.map((m) => ({ m, v: valoresDoCard(m) }));
  const o = g.ordem || "chegada";
  if (o === "nome") ms.sort((a, b) => a.v.nome.localeCompare(b.v.nome));
  if (o === "iniciativa") ms.sort((a, b) => b.v.iniciativa - a.v.iniciativa || a.v.nome.localeCompare(b.v.nome));
  if (o === "pv") ms.sort((a, b) => a.v.hp.atual - b.v.hp.atual);
  if (o === "ca") ms.sort((a, b) => b.v.ca.total - a.v.ca.total);
  return ms.map((x) => x.m);
}

/* ---------- Tela ---------- */

export function topoMestre() {
  const g = campanha();
  const lista = Object.values(state.campanhas || {});
  const toggles = `<span class="theme" role="group" aria-label="Idioma do conteúdo">${IDIOMAS.map(
    ([k, n]) => `<button data-a="lang" data-l="${k}" aria-pressed="${idioma === k}">${n}</button>`
  ).join("")}</span>
     <span class="theme" role="group" aria-label="Tema">${[
       ["light", "Claro"],
       ["dark", "Escuro"],
       ["auto", "Automático"],
     ]
       .map(([k, n]) => `<button data-a="theme" data-t="${k}" aria-pressed="${theme === k}">${n}</button>`)
       .join("")}</span>`;
  document.getElementById("top").innerHTML = `
   <div class="idrow">
     <h1>${g ? esc(g.nome) : "Hub do mestre"}</h1><span class="sub">${g ? "Hub do mestre · " + g.membros.length + " personage" + (g.membros.length === 1 ? "m" : "ns") : "Códex do Aventureiro"}</span>
     <span class="spacer"></span>
     ${lista.length > 1 ? `<label class="sr" for="campsel" style="position:absolute;left:-9999px">Campanha</label><select id="campsel" data-a="campsel">${lista.map((x) => `<option value="${x.id}" ${x.id === state.campanhaAtiva ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>` : ""}
     ${g ? `<button class="btn sm" data-a="campnova">Nova campanha</button>` : ""}
     <a class="btn sm" href="#painel">${Object.keys(state.chars).length ? "Minhas fichas" : "Início"}</a>
   </div>
   <div class="row"><span class="status" id="st">${statusHTML()}</span>${seloConta()}<span class="spacer"></span>${toggles}</div>`;
}

export function vMestre() {
  topoMestre();
  const g = campanha();
  if (!g)
    return `<div class="grid"><section class="card c12 inicio-hero">
    <h2>Hub do mestre</h2>
    <p class="inicio-titulo">Reúna as fichas do grupo em um só lugar.</p>
    <p style="margin:0;max-width:62ch;line-height:1.55">Crie a campanha e traga as fichas dos jogadores, em PDF ou pelo texto de backup. Cada personagem vira um card com PV, CA e os números de combate, para consultar durante a sessão.</p>
    <div class="row" style="align-items:flex-end"><label class="f" for="camp_nome" style="flex:1;max-width:420px">Nome da campanha<input id="camp_nome" type="text" placeholder="ex.: A Maldição de Strahd"></label><button class="btn pri" data-a="campcriar">Criar campanha</button>${Object.keys(state.campanhas || {}).length ? `<button class="btn" data-a="campvoltar">Cancelar</button>` : ""}</div>
    <span id="camp_msg" class="small" style="color:var(--bad)" role="status"></span>
  </section></div>`;

  const locais = Object.values(state.chars);
  if (g.mesa) escutarMesa(g, aoMudarNaMesa).then(atualizarSecaoMesa);
  return `<div class="grid">
  <section class="card c12">
    <div class="row" style="align-items:flex-end">
      <label class="f" for="camp_ren" style="flex:1;min-width:200px;max-width:420px">Nome da campanha<input id="camp_ren" type="text" value="${esc(g.nome)}" data-a="campren"></label>
      <span class="spacer"></span>
      <label class="f" for="camp_ord">Ordenar por<select id="camp_ord" data-a="campord">${ORDENS.map(([k, n]) => `<option value="${k}" ${k === (g.ordem || "chegada") ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    </div>
    <div class="row">
      <button class="btn pri" data-a="mimportpdf">Importar ficha em PDF</button>
      <button class="btn" data-a="mbackup">Colar backup</button>
      ${locais.length ? `<button class="btn" data-a="mlocais">Trazer das minhas fichas</button>` : ""}
      <span class="spacer"></span>
      <button class="btn sm danger" data-a="campexcluir">Excluir campanha</button>
    </div>
    <p class="small muted" style="margin:0">Fichas importadas são cópias: para atualizar, importe de novo (o card com o mesmo nome é substituído). Fichas que entram pela mesa online se atualizam sozinhas.</p>
  </section>
  ${secaoMesa(g)}
  <div class="c12" id="mgrid">${gradeCards(g)}</div>
  </div>`;
}

/* ---------- Detalhes ---------- */

export function detalheMembro(mid) {
  const g = campanha();
  const m = g && g.membros.find((x) => x.mid === mid);
  if (!m) return;
  const c = m.c;
  const t = ensurePrep(c);
  const fe = classFeatures(c);
  const armas = (c.ataques || [])
    .map(
      (w) =>
        `<tr><td>${esc(w.nome || "Arma")}</td><td class="num"><b>${sg(atkBonus(c, w))}</b></td><td>${esc(dmgTxt(c, w))}</td><td>${esc(w.critico || "—")}</td><td>${esc(w.alcance && w.alcance !== "—" ? w.alcance : "")}</td></tr>`
    )
    .join("");
  const magias = t
    .map((r) => {
      if (isSpont(c)) {
        const usados = (c.usados && c.usados[r.l]) || 0;
        const conhecidas = c.grimorio.filter((s) => s.nivel === r.l).map((s) => nomeDe(s));
        return `<li><b>${lvlName(r.l)}:</b> ${r.normal - usados} de ${r.normal} espaços. ${esc(conhecidas.join(", ") || "—")}</li>`;
      }
      const p = c.prep[r.l] || { slots: [] };
      const todos = [...(r.escola && p.escola ? [p.escola] : []), ...p.slots];
      const nomes = todos
        .filter((x) => x.sid)
        .map((x) => {
          const s = spell(c, x.sid);
          return s ? (x.used ? "<s>" + esc(nomeDe(s)) + "</s>" : esc(nomeDe(s))) : "";
        })
        .filter(Boolean);
      const livres = todos.filter((x) => x.sid && !x.used).length;
      return `<li><b>${lvlName(r.l)}:</b> ${livres} de ${todos.length} disponíveis. ${nomes.join(", ") || "nenhuma preparada"}</li>`;
    })
    .join("");
  const pericias = Object.keys(c.pericias || {})
    .filter((k) => SK[k] && (+c.pericias[k].grad || 0) > 0)
    .map((k) => {
      const r = skill(c, k);
      return `${esc(SK[k].nome)}${c.pericias[k].spec ? " (" + esc(c.pericias[k].spec) + ")" : ""} ${sg(r.total)}`;
    })
    .sort();
  const recursos = fe.R.map((r) => `${esc(r.nome)} ${r.max}${r.pool ? " PV" : "/dia"}`);
  const sec = (tit, corpo) => (corpo ? `<h2>${tit}</h2>${corpo}` : "");
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">${esc(c.nome)}</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <div class="small muted">${esc([cls(c).nome + " " + c.nivel, c.raca, c.tendencia, c.divindade].filter(Boolean).join(" · "))}</div>
  <div class="stats">${ATTRS.map(([k, n]) => `<div class="stat"><span>${n}</span><b>${at(c, k)}</b><small class="muted">${sg(mod(at(c, k)))}</small></div>`).join("")}</div>
  ${sec("Armas", armas ? `<table class="mtab"><thead><tr><th>Arma</th><th>Acerto</th><th>Dano</th><th>Crítico</th><th>Alcance</th></tr></thead><tbody>${armas}</tbody></table>` : "")}
  ${sec("Magias de hoje", magias ? `<ul style="margin:0;padding-left:18px;line-height:1.55">${magias}</ul><p class="small muted" style="margin:4px 0 0">CD = 10 + nível da magia + ${sg(mod(at(c, spellAttr(c))))}</p>` : "")}
  ${sec("Habilidades por dia", recursos.length ? `<p style="margin:0">${recursos.join(" · ")}</p>` : "")}
  ${sec("Perícias", pericias.length ? `<p style="margin:0;line-height:1.55">${pericias.join(" · ")}</p>` : "")}
  ${sec("Talentos", (c.talentos || []).length ? `<p style="margin:0">${c.talentos.map((x) => esc(nomeDe(x))).join(" · ")}</p>` : "")}
  ${sec("Idiomas", c.idiomas ? `<p style="margin:0">${esc(c.idiomas)}</p>` : "")}`);
}

/* ---------- Importar para a campanha ---------- */

/** Prepara uma cópia leve da ficha (sem os textos longos das magias). */
export function copiaParaCampanha(c) {
  const x = Object.assign(blankChar(), clone(c));
  x.grimorio = (x.grimorio || []).map((s) => {
    const { desc, descPt, alvo, ...resto } = s;
    return resto;
  });
  return x;
}
/** Adiciona ou substitui (pelo nome) uma ficha na campanha ativa. Devolve "novo" ou "atualizado". */
export function adicionarNaCampanha(c, origem) {
  const g = campanha();
  if (!g) return null;
  const copia = copiaParaCampanha(c);
  const ja = g.membros.find((m) => normTxt(m.c.nome) === normTxt(copia.nome));
  const agora = new Date().toISOString();
  if (ja) {
    ja.c = copia;
    ja.importado = agora;
    ja.origem = origem;
  } else g.membros.push({ mid: uidGen(), importado: agora, origem, c: copia });
  salvarCampanha(g);
  return ja ? "atualizado" : "novo";
}
export function backupModal() {
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Colar backup de personagem</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">No Códex do jogador: <b>Notas e backup → Copiar backup</b>. Cole o texto aqui.</p>
  <label class="f" for="mbk">Backup<textarea id="mbk" placeholder='{"nome": ...}' style="min-height:160px"></textarea></label>
  <div class="row"><button class="btn pri" data-a="mbackupok">Adicionar à campanha</button><span id="mbkmsg" class="small" role="status"></span></div>`);
}
export function locaisModal() {
  const g = campanha();
  const lista = Object.values(state.chars)
    .map((c) => {
      const ja = g.membros.some((m) => normTxt(m.c.nome) === normTxt(c.nome));
      return `<label class="row"><input type="checkbox" value="${c.id}" class="mloc"> <b>${esc(c.nome)}</b> <span class="small muted">${esc(cls(c).nome + " " + c.nivel)}${ja ? " · já está na campanha (será atualizado)" : ""}</span></label>`;
    })
    .join("");
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Trazer das minhas fichas</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">Fichas salvas neste aparelho. Útil para NPCs e para quando o mestre também joga.</p>
  <div class="list">${lista}</div>
  <div class="row"><button class="btn pri" data-a="mlocaisok">Adicionar à campanha</button><button class="btn" data-a="close">Cancelar</button></div>`);
}

/* Funções para outros arquivos alterarem as variáveis deste (imports são somente leitura). */
export function setMembroARemover(v) {
  membroARemover = v;
}

/* ---------- Mesa online ---------- */

export function secaoMesa(g) {
  let corpo;
  if (!g.mesa)
    corpo = `<div class="row"><div style="flex:1;min-width:240px"><h2>Mesa online</h2>
      <p class="small muted" style="margin:6px 0 0">Abra a mesa e passe o código aos jogadores. As fichas deles aparecem aqui e se atualizam sozinhas: PV, CA, efeitos ativos e o resto.</p></div>
      <button class="btn pri" data-a="mesaabrir">Abrir mesa online</button></div>`;
  else {
    const x = mesaMestre;
    const st =
      x.status === "erro"
        ? `<span class="small" style="color:var(--bad)">${esc(x.erro)}</span>`
        : x.status === "ao-vivo"
          ? `<span class="small"><span class="dot ok"></span> ao vivo · ${Object.values(x.vivos).filter((v) => v.online).length} personagem(ns) conectado(s)</span>`
          : `<span class="small muted">conectando…</span>`;
    corpo = `<div class="row" style="align-items:center"><div style="flex:1;min-width:240px"><h2>Mesa online</h2>
      <div class="row" style="margin-top:6px;align-items:baseline"><span class="small muted">Código</span><b class="mcodigo">${esc(g.mesa.codigo)}</b>${st}</div></div>
      <button class="btn pri" data-a="abrircombate" data-p="mestre">Abrir mapa de combate</button>
      <button class="btn" data-a="mesacopiar">Copiar link de convite</button>
      ${x.status === "erro" ? `<button class="btn pri" data-a="mesaabrir">Abrir nova mesa</button>` : ""}
      <button class="btn sm danger" data-a="mesafechar">Fechar mesa</button></div>
      <span id="mesa_cp" class="small muted" role="status"></span>`;
  }
  return `<section class="card c12" id="msecao">${corpo}</section>`;
}
export function gradeCards(g) {
  return g.membros.length
    ? `<div class="mgrid">${ordenados(g).map(cardMembro).join("")}</div>`
    : `<section class="card"><p style="margin:0">Nenhum personagem ainda. ${g.mesa ? `Passe o código <b>${esc(g.mesa.codigo)}</b> aos jogadores ou importe as fichas pelos botões acima.` : "Abra a mesa online ou importe as fichas dos jogadores (PDF ou <b>Notas e backup → Copiar backup</b>)."}</p></section>`;
}
/* Atualizações por região: cada função troca só um pedaço da tela. */
export function atualizarSecaoMesa() {
  const el = document.getElementById("msecao");
  const g = campanha();
  if (el && g) el.outerHTML = secaoMesa(g);
}
export function atualizarGrade() {
  const el = document.getElementById("mgrid");
  const g = campanha();
  if (el && g) el.innerHTML = gradeCards(g);
  if (modo === "mestre") topoMestre(); // contagem de personagens no topo (o topo não tem campos de edição)
}
export function atualizarCard(m) {
  const el = document.getElementById("card_" + m.mid);
  if (el) el.outerHTML = cardMembro(m);
  else atualizarGrade();
}

/** Recebe as novidades da mesa (ver escutarMesa em tempo-real/mesa.js). */
export function aoMudarNaMesa(chave, tipo) {
  const uid = chave; // chave da ficha na mesa (<uid>_<id do personagem>)
  const g = campanha();
  if (!g || !g.mesa || typeof document === "undefined") return;
  if (tipo === "presentes") {
    const antes = g.membros.length;
    g.membros = g.membros.filter((x) => x.origem !== "mesa" || !x.uid || chave.includes(x.uid));
    if (g.membros.length !== antes) {
      salvarCampanha(g);
      atualizarGrade();
    }
    return;
  }
  const vivo = mesaMestre.vivos[uid];
  let m = g.membros.find((x) => x.uid === uid);
  if (tipo === "saiu") {
    // O personagem saiu da mesa (ou foi excluído pelo jogador): o card sai do hub
    if (m && m.origem === "mesa") {
      g.membros = g.membros.filter((x) => x !== m);
      salvarCampanha(g);
      atualizarGrade();
    } else if (m) atualizarCard(m);
    atualizarSecaoMesa();
    return;
  }
  if (tipo === "ficha" && vivo && vivo.ficha) {
    // Guarda a última versão recebida na campanha, para continuar visível com o jogador offline
    const copia = copiaParaCampanha(vivo.ficha);
    if (!m) m = g.membros.find((x) => !x.uid && normTxt(x.c.nome) === normTxt(copia.nome));
    if (m) Object.assign(m, { c: copia, uid, origem: "mesa", importado: new Date().toISOString() });
    else {
      m = { mid: uidGen(), importado: new Date().toISOString(), origem: "mesa", c: copia, uid };
      g.membros.push(m);
      salvarCampanha(g);
      atualizarGrade();
      atualizarSecaoMesa();
      return;
    }
    salvarCampanha(g);
  }
  if (m) atualizarCard(m);
  if (tipo === "membro") atualizarSecaoMesa();
  // Com ordenação por PV, CA ou iniciativa, a ordem pode ter mudado: redesenha só a grade
  if (["pv", "ca", "iniciativa"].includes(g.ordem) && tipo !== "membro") {
    const ordem = ordenados(g)
      .map((x) => x.mid)
      .join();
    const naTela = [...document.querySelectorAll("#mgrid .mcard")].map((e) => e.id.slice(5)).join();
    if (ordem !== naTela) atualizarGrade();
  }
}
export async function abrirMesaDaCampanha(g) {
  await abrirMesa(g);
  salvarCampanha(g);
  await escutarMesa(g, aoMudarNaMesa);
}
export const conviteDaCampanha = (g) => (g.mesa ? linkConvite(g.mesa.codigo) : "");
