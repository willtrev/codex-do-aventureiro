/* ================= Modal ================= */
function modal(html) {
  document.getElementById("modal").innerHTML =
    `<div class="modal-bg" data-a="closebg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const f = document.querySelector(".modal button, .modal input");
  if (f) f.focus();
}
function closeModal() {
  document.getElementById("modal").innerHTML = "";
}
const LISTA_NOME = {
  mago: "Mago/Feiticeiro",
  clerigo: "Clérigo",
  druida: "Druida",
  bardo: "Bardo",
  ranger: "Ranger",
  paladino: "Paladino",
};
const LISTA_EN = { mago: "Sor/Wiz", clerigo: "Clr", druida: "Drd", bardo: "Brd", ranger: "Rgr", paladino: "Pal" };
/** Registro original do SRD para uma magia (ou null para magias personalizadas). */
const srdDe = (s) => (s && s.en ? SRD_MAGIA_POR_EN.get(String(s.en).toLowerCase()) || null : null);
/** Texto do SRD em parágrafos HTML. */
const paragrafos = (t) =>
  String(t || "")
    .split(/\n+/)
    .filter((x) => x.trim())
    .map((x) => `<p style="margin:0 0 8px;line-height:1.5">${esc(x)}</p>`)
    .join("");
function listasTxt(m) {
  const en = idioma === "en";
  const cl = Object.entries(m.listas).map(([k, n]) => `${en ? LISTA_EN[k] : LISTA_NOME[k]} ${n}`);
  const dm = Object.entries(m.dominios).map(([k, n]) => `${en ? k : TR_DOMINIOS[k] || k} ${n}`);
  return [...cl, ...dm].join(", ");
}
function spellInfo(c, s) {
  const m = srdDe(s);
  const en = idioma === "en" && m;
  const atk = spellAtk(c, s);
  const linha = (rot, v) => (v ? `<dt>${rot}</dt><dd>${esc(v)}</dd>` : "");
  const escola = en
    ? m.escola + (m.subescola ? ` (${m.subescola})` : "") + (m.descritor ? ` [${m.descritor}]` : "")
    : s.escola + (s.subescola ? ` (${s.subescola})` : "") + (s.descritor ? ` [${s.descritor}]` : "");
  const alvo = en ? [m.alvo, m.area, m.efeito].filter(Boolean).join("; ") : s.alvo;
  const sub = idioma === "ambos" && s.en && s.en !== s.nome ? s.en : idioma === "en" && s.en ? s.nome : "";
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">${esc(nomeDe(s))}</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  ${sub ? `<div class="small muted">${esc(sub)}</div>` : ""}
  <dl class="kv"><dt>Nível</dt><dd>${s.nivel === 0 ? "Truque" : s.nivel + "º"}</dd>${m ? linha("Listas", listasTxt(m)) : ""}${linha("Escola", escola)}
  ${linha("Execução", en ? m.execucao : s.tempo)}${linha("Componentes", en ? m.componentes : s.comp)}${linha("Alcance", en ? m.alcance : rangeTxt(c, s.alcance))}
  ${linha("Alvo / área", alvo)}${linha("Duração", en ? m.duracao : s.duracao)}
  ${atk ? `<dt>Ataque</dt><dd><b>${esc(atk.nome)} ${sg(atk.total)}</b> (${esc(partsTxt(atk.parts))})</dd>` : ""}
  <dt>Teste de resistência</dt><dd>${esc(en ? m.resistencia || "None" : temTeste(s.ts) ? s.ts : "Nenhum")}</dd>${temTeste(s.ts) ? `<dt>CD</dt><dd>${dc(c, s)}</dd>` : ""}
  ${linha("Resistência à magia", en ? m.rm : s.rm)}
  ${m ? linha("Material", m.material) + linha("Foco", m.foco) + linha("Custo em XP", m.xp) : ""}</dl>
  ${
    en
      ? paragrafos(m.descricao || m.resumo)
      : `${s.desc ? `<p style="margin:0;line-height:1.5">${esc(s.desc)}</p>` : ""}
  ${m && m.descricao ? `<details${!s.descPt ? " open" : ""}><summary class="small" style="cursor:pointer">Texto completo do SRD (inglês)</summary><div style="margin-top:8px">${paragrafos(m.descricao)}</div></details>` : ""}`
  }
  ${
    atk
      ? `<div class="notice"><b>Como rolar o ataque:</b> 1d20 ${sg(atk.total)} contra a <b>CA de toque</b> do alvo, que ignora armadura, escudo e armadura natural.<ul style="margin:6px 0 0;padding-left:18px">${
          s.ataque === "dist"
            ? "<li>Alvo em combate corpo a corpo com um aliado: −4 no ataque.</li><li>Dentro do alcance da magia não há penalidade por distância.</li>"
            : `<li>Você lança e toca na mesma rodada. Se errar, pode segurar a carga e tentar de novo nas rodadas seguintes.</li><li>Lançar com inimigo adjacente provoca ataque de oportunidade; para evitar, lance na defensiva com Concentração CD ${15 + s.nivel}.</li>`
        }<li>20 natural ameaça crítico: confirme com outra rolagem de ataque; o dano do acerto é dobrado.</li><li>Ataque Certeiro dá +20 no próximo ataque.</li></ul></div>`
      : ""
  }`);
}
let buscaMagia = "";
/** Filtra as linhas do catálogo sem redesenhar a janela. */
function filtrarCatalogo() {
  const q = buscaMagia.trim().toLowerCase();
  let n = 0;
  document.querySelectorAll("#catlist .spellrow").forEach((r) => {
    const ok = !q || r.dataset.busca.includes(q);
    r.hidden = !ok;
    r.style.display = ok ? "" : "none";
    if (ok) n++;
  });
  const info = document.getElementById("catcount");
  if (info) info.textContent = `${n} magia${n === 1 ? "" : "s"}`;
}
function addSpellModal(c) {
  const have = new Set(c.grimorio.map((s) => (s.en || s.nome).toLowerCase()));
  const lk = (cls(c).magia || {}).lista || "mago";
  const rows = CAT.filter((s) => !have.has((s.en || s.nome).toLowerCase()) && s.listas[lk] !== undefined)
    .sort((a, b) => a.listas[lk] - b.listas[lk] || nomeDe(a).localeCompare(nomeDe(b)))
    .map((s) => {
      const m = srdDe(s);
      const resumo = idioma === "en" && m ? m.resumo || "" : s.desc;
      const busca = [s.nome, s.en, s.escola, m && m.escola].filter(Boolean).join(" ").toLowerCase();
      return `<div class="spellrow" data-busca="${esc(busca)}"><span class="small muted" style="width:44px">${s.listas[lk] === 0 ? "truque" : s.listas[lk] + "º"}</span><div style="flex:1"><b>${nomeHTML(s)}</b> <span class="tag">${esc(idioma === "en" && m ? m.escola : s.escola)}</span><div class="small muted">${esc(resumo)}</div></div><button class="btn sm" data-a="addcat" data-id="${s.cid}">Adicionar</button></div>`;
    })
    .join("");
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Adicionar magia (lista de ${esc(cls(c).nome.toLowerCase())})</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <h2>Do SRD</h2>
  <div class="row"><label class="f" for="busca_magia" style="flex:1">Buscar (português ou inglês)<input id="busca_magia" type="search" value="${esc(buscaMagia)}" placeholder="ex.: sono, sleep, encantamento"></label><span id="catcount" class="small muted"></span></div>
  <div id="catlist">${rows || '<p class="muted">Você já tem todas da lista.</p>'}</div>
  <h2>Magia personalizada</h2>
  <div class="fields"><label class="f" for="nm_nome">Nome<input id="nm_nome" type="text"></label><label class="f" for="nm_nivel">Nível<input id="nm_nivel" type="number" value="1" min="0" max="9"></label>
  <label class="f" for="nm_escola">Escola<select id="nm_escola">${SCHOOLS.map((s) => `<option>${s}</option>`).join("")}</select></label>
  <label class="f" for="nm_alc">Alcance<input id="nm_alc" type="text" placeholder="curto, médio, longo, toque…"></label><label class="f" for="nm_dur">Duração<input id="nm_dur" type="text"></label><label class="f" for="nm_ts">Teste de resistência<input id="nm_ts" type="text"></label><label class="f" for="nm_atk">Rolagem de ataque<select id="nm_atk"><option value="">Nenhuma</option><option value="dist">Toque à distância</option><option value="corpo">Toque corpo a corpo</option></select></label></div>
  <label class="f" for="nm_desc">Descrição<textarea id="nm_desc"></textarea></label>
  <div class="row"><button class="btn pri" data-a="addcustom">Adicionar magia</button><span id="nm_msg" class="small" style="color:var(--bad)"></span></div>`);
  filtrarCatalogo();
  const bi = document.getElementById("busca_magia");
  if (bi) bi.focus();
}
function restModal(c) {
  modal(`<h2 style="font-size:18px;color:var(--ink)">Descanso de 8 horas</h2>
  <label class="row"><input type="checkbox" id="r_slots" checked> Recuperar magias e usos diários de habilidades${isSpont(c) ? "" : " (mantém as mesmas magias preparadas)"}</label>
  <label class="row"><input type="checkbox" id="r_hp" checked> Curar ${c.nivel} PV (cura natural: 1 por nível)</label>
  <label class="row"><input type="checkbox" id="r_nl" checked> Zerar dano por contusão</label>
  <label class="row"><input type="checkbox" id="r_ef"> Encerrar efeitos ativos</label>
  <div class="row"><button class="btn pri" data-a="dorest">Descansar</button><button class="btn" data-a="close">Cancelar</button></div>`);
}
function newCharModal() {
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Novo personagem</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <label class="f" for="nc_nome">Nome<input id="nc_nome" type="text" placeholder="Nome do personagem"></label>
  <p class="small muted" style="margin:0">Escolha a classe. Ela define a ficha: dado de vida, bônus base de ataque, testes de resistência, perícias de classe, magias e habilidades.</p>
  <div class="list">${CLASS_ORDER.map((k) => {
    const x = CLASSES[k];
    const m = x.magia;
    return `<button class="btn" data-a="pickclass" data-k="${k}" style="justify-content:space-between;text-align:left;padding:10px 12px"><span><b>${x.nome}</b><br><span class="small muted" style="font-weight:400">d${x.dv} · BBA ${x.bab === "boa" ? "bom" : x.bab === "media" ? "médio" : "fraco"} · TR bons: ${x.tr.map((t) => ({ fort: "Fortitude", ref: "Reflexos", von: "Vontade" })[t]).join(", ")} · ${x.pts} perícias/nível · ${{ barbaro: "não leal", bardo: "não leal", monge: "só leal", paladino: "só Leal e Bom", druida: "neutro em um eixo" }[k] || "qualquer tendência"}${m ? ` · magias ${m.tipo === "espontanea" ? "espontâneas" : "preparadas"} (${ATTR_NAME[m.attr]})${m.desde ? " a partir do " + m.desde + "º" : ""}` : ""}</span></span></button>`;
  }).join("")}</div>`);
}
function newCharOf(k) {
  const n = blankChar();
  n.classeKey = k;
  n.classe = CLASSES[k].nome;
  n.hp.max = n.hp.atual = hpSuggest(n);
  if (k !== "mago") n.idiomas = "Comum";
  n.nome = "Novo " + CLASSES[k].nome.toLowerCase();
  n.tendencia =
    k === "paladino"
      ? "Leal e Bom"
      : k === "monge"
        ? "Leal e Neutro"
        : k === "barbaro" || k === "bardo"
          ? "Caótico e Neutro"
          : "Neutro";
  return n;
}
function confirmModal(text, action) {
  modal(
    `<p style="margin:0">${esc(text)}</p><div class="row"><button class="btn danger" data-a="${action}">Confirmar</button><button class="btn" data-a="close">Cancelar</button></div>`
  );
}
