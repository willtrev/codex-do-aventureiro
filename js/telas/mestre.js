/* ================= Hub do mestre =================
   Área da campanha, aberta em #mestre. O mestre dá nome à campanha e traz as fichas
   dos jogadores (PDF, texto de backup ou fichas deste aparelho). Cada ficha vira um card
   com PV, CA e as informações de combate; "Detalhes" abre o resto.

   As fichas na campanha são cópias: para atualizar, importe de novo (o card com o
   mesmo nome é substituído).

   Estrutura salva em state.campanhas[id]:
     { id, nome, criada, ordem, membros: [{ mid, importado, origem, c }] } */

const ORDENS = [
  ["chegada", "Ordem de importação"],
  ["nome", "Nome"],
  ["iniciativa", "Iniciativa"],
  ["pv", "PV atuais"],
  ["ca", "CA"],
];

/** Card aguardando confirmação para sair da campanha. */
let membroARemover = null;
const campanha = () => (state.campanhas || {})[state.campanhaAtiva] || null;
function salvarCampanha(g) {
  touch("g:" + g.id);
  touch("__meta");
}

/* ---------- Valores mostrados no card ---------- */

function estadoPV(c) {
  const at_ = +c.hp.atual,
    mx = +c.hp.max || 0;
  if (at_ < -9) return "Morto";
  if (at_ < 0) return "Morrendo";
  if (at_ === 0) return "Inconsciente";
  if (+c.hp.contusao > 0 && +c.hp.contusao >= at_) return "Atordoado (contusão)";
  if (mx && at_ / mx < 0.34) return "Muito ferido";
  return "";
}
function corPV(c) {
  const pct = c.hp.max ? (c.hp.atual / c.hp.max) * 100 : 0;
  return c.hp.atual <= 0 || pct < 34 ? "var(--bad)" : pct < 67 ? "var(--warn)" : "var(--good)";
}
const iniciativa = (c) => mod(at(c, "des")) + (+c.outros.init || 0);
const agarrar = (c) => bba(c) + mod(at(c, "for")) + sizeGrap(c.tamanho) + (+c.outros.agarrar || 0);

function cardMembro(m) {
  const c = m.c;
  const a = ac(c),
    s = saves(c);
  const pct = c.hp.max ? clamp((c.hp.atual / c.hp.max) * 100, 0, 100) : 0;
  const est = estadoPV(c);
  const st = (rot, v, extra) => `<div class="stat"><span>${rot}</span><b${extra || ""}>${v}</b></div>`;
  const data = new Date(m.importado).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `<article class="card mcard" aria-labelledby="mc_${m.mid}">
    <div class="row" style="align-items:flex-start">
      <div style="flex:1;min-width:0"><h3 id="mc_${m.mid}" class="mnome">${esc(c.nome)}</h3>
      <div class="small muted mlinha">${esc([cls(c).nome + " " + c.nivel, c.raca, c.tendencia].filter(Boolean).join(" · "))}</div>
      <div class="small muted mlinha">${c.jogador ? `Jogador: ${esc(c.jogador)}` : "&nbsp;"}</div></div>
    </div>
    <div class="row" style="align-items:baseline;gap:6px"><span class="small muted" style="font-weight:600;letter-spacing:.06em">PV</span><span class="big" style="font-size:28px">${c.hp.atual}</span><span class="muted">/ ${c.hp.max}</span>
      ${c.hp.temp ? `<span class="tag">+${c.hp.temp} temp.</span>` : ""}${est ? `<span class="tag" style="color:${corPV(c)};border-color:${corPV(c)}">${esc(est)}</span>` : ""}</div>
    <div class="hpbar" role="img" aria-label="${Math.round(pct)}% dos PV"><i style="width:${pct}%;background:${corPV(c)}"></i></div>
    <div class="mstats">${st("CA", a.total)}${st("Toque", a.toque)}${st("Surpresa", a.surpresa)}${st("Iniciativa", sg(iniciativa(c)))}</div>
    <div class="mstats">${st("Fortitude", sg(s.fort))}${st("Reflexos", sg(s.ref))}${st("Vontade", sg(s.von))}${st("BBA", sg(bba(c)))}</div>
    <div class="mstats">${st("Agarrar", sg(agarrar(c)))}${st("Desloc.", esc(c.deslocamento || "—"), ' style="font-size:16px"')}${st("Inspiração", +c.inspiracao || 0)}</div>
    <div class="small muted mresist" title="${esc(c.resistCond || "")}">${c.resistCond ? esc(c.resistCond) : "&nbsp;"}</div>
    <div class="mfoot"><span class="small muted">Importado em ${data}${m.origem ? " · " + esc({ pdf: "PDF", backup: "backup", local: "deste aparelho" }[m.origem] || m.origem) : ""}</span><div class="row" style="margin-top:8px">
      <button class="btn sm pri" data-a="mdetalhe" data-m="${m.mid}" aria-label="Detalhes de ${esc(c.nome)}">Detalhes</button>
      <button class="btn sm ghost" data-a="mremover" data-m="${m.mid}" aria-label="Tirar ${esc(c.nome)} da campanha">Remover</button></div></div>
  </article>`;
}

function ordenados(g) {
  const ms = g.membros.slice();
  const o = g.ordem || "chegada";
  if (o === "nome") ms.sort((a, b) => a.c.nome.localeCompare(b.c.nome));
  if (o === "iniciativa") ms.sort((a, b) => iniciativa(b.c) - iniciativa(a.c) || a.c.nome.localeCompare(b.c.nome));
  if (o === "pv") ms.sort((a, b) => a.c.hp.atual - b.c.hp.atual);
  if (o === "ca") ms.sort((a, b) => ac(b.c).total - ac(a.c).total);
  return ms;
}

/* ---------- Tela ---------- */

function topoMestre() {
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
   <div class="row"><span class="status" id="st">${statusHTML()}</span><span class="spacer"></span>${toggles}</div>`;
}

function vMestre() {
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
  const cards = ordenados(g).map(cardMembro).join("");
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
    <p class="small muted" style="margin:0">Os cards são cópias das fichas no momento da importação. Para atualizar, importe de novo: o card com o mesmo nome é substituído.</p>
  </section>
  ${
    g.membros.length
      ? `<div class="c12 mgrid">${cards}</div>`
      : `<section class="card c12"><p style="margin:0">Nenhum personagem ainda. Peça aos jogadores a ficha em PDF ou o texto de <b>Notas e backup → Copiar backup</b>, e importe pelos botões acima.</p></section>`
  }
  </div>`;
}

/* ---------- Detalhes ---------- */

function detalheMembro(mid) {
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
function copiaParaCampanha(c) {
  const x = Object.assign(blankChar(), clone(c));
  x.grimorio = (x.grimorio || []).map((s) => {
    const { desc, descPt, alvo, ...resto } = s;
    return resto;
  });
  return x;
}
/** Adiciona ou substitui (pelo nome) uma ficha na campanha ativa. Devolve "novo" ou "atualizado". */
function adicionarNaCampanha(c, origem) {
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
function backupModal() {
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Colar backup de personagem</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">No Códex do jogador: <b>Notas e backup → Copiar backup</b>. Cole o texto aqui.</p>
  <label class="f" for="mbk">Backup<textarea id="mbk" placeholder='{"nome": ...}' style="min-height:160px"></textarea></label>
  <div class="row"><button class="btn pri" data-a="mbackupok">Adicionar à campanha</button><span id="mbkmsg" class="small" role="status"></span></div>`);
}
function locaisModal() {
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
