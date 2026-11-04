/* ================= Escolher talentos e equipamento do SRD =================
   Janelas com busca para adicionar à ficha itens vindos de js/dados/srd-*.js.
   Os nomes em português vêm de TR_TALENTOS e TR_EQUIPAMENTO (js/dados/traducoes.js);
   quando falta tradução, aparece o nome original em inglês. */

/* ---------- Conversões ---------- */

/** "1-1/2 lb." → 0,75 kg. Segue a convenção dos livros em português: 1 lb = 0,5 kg. */
function libraParaKg(t) {
  const m = String(t || "").match(/(\d+)(?:-(\d+)\/(\d+)|\/(\d+))?/);
  if (!m) return 0;
  let lb = +m[1];
  if (m[2]) lb += +m[2] / +m[3];
  if (m[4]) lb = +m[1] / +m[4];
  return Math.round((lb / 2) * 1000) / 1000;
}
/** "35 gp" → 35; "5 sp" → 0,5; "1 cp" → 0,01 (em PO). */
function precoEmPO(t) {
  const m = String(t || "")
    .replace(/,/g, "")
    .match(/([\d.]+)\s*(pp|gp|sp|cp)/);
  if (!m) return null;
  return +m[1] * { pp: 10, gp: 1, sp: 0.1, cp: 0.01 }[m[2]];
}
const precoTxt = (t) =>
  String(t || "—")
    .replace(/(\d),(\d{3})/g, "$1.$2")
    .replace(/\bgp\b/g, "PO")
    .replace(/\bsp\b/g, "PP")
    .replace(/\bcp\b/g, "PC")
    .replace(/\bpp\b/g, "PL");
const TR_CATEG_EQUIP = {
  "Simple Weapons": "Armas simples",
  "Martial Weapons": "Armas comuns",
  "Exotic Weapons": "Armas exóticas",
  Armor: "Armaduras e escudos",
  Item: "Itens",
  Service: "Serviços",
};
const TR_SUBCAT_EQUIP = {
  "Light Melee Weapons": "corpo a corpo leve",
  "One-Handed Melee Weapons": "corpo a corpo de uma mão",
  "Two-Handed Melee Weapons": "corpo a corpo de duas mãos",
  "Ranged Weapons": "à distância",
  Ammunition: "munição",
  "Unarmed Attacks": "desarmado",
  "Light armor": "leve",
  "Medium armor": "média",
  "Heavy armor": "pesada",
  Shields: "escudo",
  Extras: "extras",
  "Adventuring Gear": "equipamento de aventura",
  "Special Substances and Items": "substâncias especiais",
  "Tools and Skill Kits": "ferramentas e kits",
  Clothing: "roupas",
  "Food, Drink, and Lodging": "comida e hospedagem",
  "Mounts and Related Gear": "montarias",
  Transport: "transporte",
  "Spellcasting and Services": "serviços",
};
const TR_TIPO_DANO = { Piercing: "perfurante", Slashing: "cortante", Bludgeoning: "contusão" };
const trTipoDano = (t) =>
  String(t || "")
    .replace(/Piercing|Slashing|Bludgeoning/g, (x) => TR_TIPO_DANO[x])
    .replace(/ or /g, " ou ")
    .replace(/ and /g, " e ");

/* ---------- Catálogos com nome PT + EN ---------- */

const TALENTOS_SRD = window.SRD.talentos.map((t, i) => ({
  i,
  nome: TR_TALENTOS[t.nome] || t.nome,
  en: t.nome,
  srd: t,
}));
const EQUIP_SRD = window.SRD.equipamento.map((e, i) => ({
  i,
  nome: TR_EQUIPAMENTO[e.nome] || e.nome,
  en: e.nome,
  srd: e,
}));

/* ---------- Busca compartilhada ---------- */

let buscaSRD = "",
  filtroEquip = "";
function filtrarSRD() {
  const q = buscaSRD.trim().toLowerCase();
  let n = 0;
  document.querySelectorAll("#srdlist .spellrow").forEach((r) => {
    const ok = (!q || r.dataset.busca.includes(q)) && (!filtroEquip || r.dataset.cat === filtroEquip);
    r.hidden = !ok;
    r.style.display = ok ? "" : "none";
    if (ok) n++;
  });
  const info = document.getElementById("srdcount");
  if (info) info.textContent = `${n} resultado${n === 1 ? "" : "s"}`;
}
const buscaDe = (x, extra) => [x.nome, x.en, ...(extra || [])].filter(Boolean).join(" ").toLowerCase();
const caixaBusca = (ph) =>
  `<div class="row"><label class="f" for="busca_srd" style="flex:1">Buscar (português ou inglês)<input id="busca_srd" type="search" value="${esc(buscaSRD)}" placeholder="${esc(ph)}"></label><span id="srdcount" class="small muted"></span></div>`;
function abrirSRD(html) {
  modal(html);
  filtrarSRD();
  const bi = document.getElementById("busca_srd");
  if (bi) bi.focus();
}

/* ---------- Talentos ---------- */

function featModal(c) {
  const tem = new Set((c.talentos || []).map((t) => String(t.en || t.nome).toLowerCase()));
  const rows = TALENTOS_SRD.slice()
    .sort((a, b) => nomeDe(a).localeCompare(nomeDe(b)))
    .map((t) => {
      const s = t.srd;
      const ja = tem.has(t.en.toLowerCase());
      return `<div class="spellrow" data-busca="${esc(buscaDe(t, [s.tipo]))}"><div style="flex:1"><b>${nomeHTML(t)}</b> <span class="tag">${esc(s.tipo || "")}</span>
      ${s.pre_requisito ? `<div class="small"><b>Pré-requisito:</b> ${esc(s.pre_requisito)}</div>` : ""}
      <div class="small muted">${esc(s.beneficio || "")}</div>
      ${s.normal || s.especial ? `<details><summary class="small" style="cursor:pointer">Mais detalhes (inglês)</summary>${s.normal ? `<p class="small" style="margin:6px 0 0"><b>Normal:</b> ${esc(s.normal)}</p>` : ""}${s.especial ? `<p class="small" style="margin:6px 0 0"><b>Especial:</b> ${esc(s.especial)}</p>` : ""}</details>` : ""}
      </div><button class="btn sm" data-a="addfeat" data-i="${t.i}" ${ja ? "disabled" : ""}>${ja ? "Já tem" : "Adicionar"}</button></div>`;
    })
    .join("");
  abrirSRD(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Adicionar talento do SRD</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">O texto das regras está no original em inglês do SRD. Confira os pré-requisitos antes de escolher.</p>
  ${caixaBusca("ex.: magia em combate, combat casting, metamagic")}
  <div id="srdlist">${rows}</div>`);
}
function addFeat(c, i) {
  const t = TALENTOS_SRD[i];
  if (!t) return;
  c.talentos = c.talentos || [];
  c.talentos.push({ nome: idioma === "en" ? t.en : t.nome, en: t.en, obs: t.srd.beneficio || "" });
}

/* ---------- Equipamento ---------- */

function equipModal(c) {
  const cats = [...new Set(EQUIP_SRD.map((e) => e.srd.categoria))];
  const rows = EQUIP_SRD.filter((e) => e.srd.categoria !== "Service")
    .map((e) => {
      const s = e.srd;
      const sub = idioma === "en" ? s.subcategoria : TR_SUBCAT_EQUIP[s.subcategoria] || s.subcategoria;
      const det = [];
      if (s.dano_m) det.push(`dano ${s.dano_m} (Pequeno ${s.dano_p || "—"})`);
      if (s.critico && s.dano_m) det.push(`crítico ${s.critico}`);
      if (s.incremento) det.push(`incremento ${trAlcance(s.incremento)}`);
      if (s.tipo && s.dano_m) det.push(trTipoDano(s.tipo));
      if (s.bonus_ca) det.push(`CA ${s.bonus_ca}`);
      if (s.des_max) det.push(`Des máx. ${s.des_max}`);
      if (s.penalidade) det.push(`penalidade ${s.penalidade}`);
      if (s.falha_arcana) det.push(`falha arcana ${s.falha_arcana}`);
      const kg = libraParaKg(s.peso);
      const po = precoEmPO(s.custo);
      return `<div class="spellrow" data-cat="${esc(s.categoria)}" data-busca="${esc(buscaDe(e, [s.subcategoria, sub]))}"><div style="flex:1"><b>${nomeHTML(e)}</b> ${sub ? `<span class="tag">${esc(sub)}</span>` : ""}
      <div class="small muted">${esc(precoTxt(s.custo))} · ${kg ? String(kg).replace(".", ",") + " kg" : "peso —"}${det.length ? " · " + esc(det.join(" · ")) : ""}</div></div>
      <button class="btn sm" data-a="addequip" data-i="${e.i}">Adicionar</button>${po != null ? `<button class="btn sm pri" data-a="buyequip" data-i="${e.i}" title="Adiciona e desconta ${String(po).replace(".", ",")} PO">Comprar</button>` : ""}</div>`;
    })
    .join("");
  abrirSRD(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Adicionar equipamento do SRD</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">Peso convertido para kg (1 lb = 0,5 kg). "Comprar" desconta o preço do dinheiro. Armas entram também em Minhas armas; armaduras e escudos ajustam a CA.</p>
  <div class="row">${caixaBusca("ex.: espada longa, rope, mochila")}<label class="f" for="filtro_equip">Categoria<select id="filtro_equip"><option value="">Todas</option>${cats
    .filter((k) => k !== "Service")
    .map(
      (k) =>
        `<option value="${esc(k)}" ${k === filtroEquip ? "selected" : ""}>${esc(idioma === "en" ? k : TR_CATEG_EQUIP[k] || k)}</option>`
    )
    .join("")}</select></label></div>
  <div id="srdlist">${rows}</div>
  <p id="srdmsg" class="small" style="margin:0;color:var(--good)" role="status"></p>`);
}
/** Adiciona o item; com comprar=true, desconta o preço (em PO, usando PP e PC se precisar). */
function addEquip(c, i, comprar) {
  const e = EQUIP_SRD[i];
  if (!e) return "";
  const s = e.srd;
  const pac = e.en.match(/\((\d+)\)$/);
  const qtd = pac ? +pac[1] : 1;
  const kg = libraParaKg(s.peso);
  const nome = (idioma === "en" ? e.en : e.nome).replace(/\s*\(\d+\)$/, "");
  if (comprar) {
    const po = precoEmPO(s.custo) || 0;
    const d = c.dinheiro;
    const total = d.pl * 10 + +d.po + d.pp / 10 + d.pc / 100;
    if (total + 1e-9 < po) return `Dinheiro insuficiente: custa ${String(po).replace(".", ",")} PO.`;
    let resto = Math.round((total - po) * 100);
    d.pl = Math.min(+d.pl || 0, Math.floor(resto / 1000));
    resto -= d.pl * 1000;
    d.po = Math.floor(resto / 100);
    resto -= d.po * 100;
    d.pp = Math.floor(resto / 10);
    d.pc = resto - d.pp * 10;
  }
  const ja = c.itens.find((x) => x.en === e.en || x.nome === nome);
  if (ja && pac) ja.qtd = (+ja.qtd || 0) + qtd;
  else c.itens.push({ nome, en: e.en, qtd, peso: Math.round((kg / qtd) * 1000) / 1000, local: "" });
  if (s.familia === "Weapons" && s.dano_m) {
    const dist = s.subcategoria === "Ranged Weapons";
    const base = {
      dado: s.dano_m,
      acertoOutros: 0,
      danoOutros: 0,
      critico: s.critico || "x2",
      obs: trTipoDano(s.tipo),
    };
    c.ataques.push({
      nome,
      en: e.en,
      tipo: dist ? "distancia" : "corpo",
      alcance: dist && s.incremento ? trAlcance(s.incremento) : "—",
      ...base,
    });
    if (!dist && s.incremento)
      c.ataques.push({
        nome: nome + " (arremessada)",
        en: e.en,
        tipo: "arremesso",
        alcance: trAlcance(s.incremento),
        ...base,
      });
  }
  if (s.categoria === "Armor" && s.bonus_ca) {
    const v = parseInt(s.bonus_ca, 10) || 0;
    if (s.subcategoria === "Shields") c.ca.escudo = v;
    else c.ca.armadura = v;
  }
  return `${nome} adicionado${comprar ? " e pago" : ""}.`;
}
