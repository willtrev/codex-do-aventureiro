/* ================= Aba Painel ================= */
function vPainel(c) {
  const a = ac(c),
    s = saves(c),
    hpPct = c.hp.max ? clamp((c.hp.atual / c.hp.max) * 100, 0, 100) : 0;
  const hpColor =
    c.hp.atual <= 0 ? "var(--bad)" : hpPct < 34 ? "var(--bad)" : hpPct < 67 ? "var(--warn)" : "var(--good)";
  const hpState =
    c.hp.atual < -9
      ? "Morto"
      : c.hp.atual < 0
        ? "Morrendo"
        : c.hp.atual === 0
          ? "Inconsciente / incapacitado"
          : c.hp.contusao >= c.hp.atual && c.hp.contusao > 0
            ? "Atordoado por dano por contusão"
            : "";
  const t = slotTable(c);
  const famMax = Math.floor((+c.hp.max || 0) / 2);
  return `<div class="grid">
  <section class="card c4" aria-labelledby="hph"><h2 id="hph">Pontos de vida</h2>
    <div class="row" style="align-items:baseline"><span class="big">${c.hp.atual}</span><span class="muted">/ ${c.hp.max}</span>
      ${c.hp.temp ? `<span class="tag">+${c.hp.temp} temp.</span>` : ""}${c.hp.contusao ? `<span class="tag">${c.hp.contusao} contusão</span>` : ""}</div>
    <div class="hpbar" role="img" aria-label="${Math.round(hpPct)}% dos PV"><i style="width:${hpPct}%;background:${hpColor}"></i></div>
    ${hpState ? `<div class="notice">${hpState}</div>` : ""}
    <div class="row"><label for="hpamt" class="muted small">Valor</label><input id="hpamt" type="number" value="1" min="0" style="width:64px">
      <button class="btn" data-a="dmg">Dano</button><button class="btn" data-a="heal">Cura</button></div>
    <div class="row">${inp("hp.temp", { type: "number", label: "PV temporários" })}${inp("hp.contusao", { type: "number", label: "Dano por contusão" })}</div>
  </section>
  <section class="card c4"><h2>Defesa</h2>
    <div class="stats">
      <div class="stat"><span>CA</span><b>${a.total}</b></div><div class="stat"><span>Toque</span><b>${a.toque}</b></div><div class="stat"><span>Surpresa</span><b>${a.surpresa}</b></div>
    </div>
    <div class="row">
      ${
        ["mago", "feiticeiro"].includes(c.classeKey)
          ? `<button class="toggle" data-a="ef" data-k="armaduraArcana" aria-pressed="${!!c.ef.armaduraArcana}">Armadura Arcana +4</button>
      <button class="toggle" data-a="ef" data-k="escudoArcano" aria-pressed="${!!c.ef.escudoArcano}">Escudo Arcano +4</button>`
          : ""
      }

      <button class="toggle" data-a="ef" data-k="resistencia" aria-pressed="${!!c.ef.resistencia}">Resistência +1 nos testes</button>
    </div>
  </section>
  <section class="card c4"><h2>Combate</h2>
    <div class="stats">
      <div class="stat"><span>Iniciativa</span><b>${sg(mod(at(c, "des")) + (+c.outros.init || 0))}</b></div>
      <div class="stat"><span>Fortitude</span><b>${sg(s.fort)}</b></div><div class="stat"><span>Reflexos</span><b>${sg(s.ref)}</b></div><div class="stat"><span>Vontade</span><b>${sg(s.von)}</b></div>
      <div class="stat"><span>BBA</span><b>${sg(bba(c))}</b></div><div class="stat"><span>Agarrar</span><b>${sg(bba(c) + mod(at(c, "for")) + sizeGrap(c.tamanho) + (+c.outros.agarrar || 0))}</b></div>
      <div class="stat"><span>Desloc.</span><b style="font-size:18px">${esc(c.deslocamento)}</b></div>
      <div class="stat insp"><span>Inspiração</span><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" data-a="insp" data-v="-1" aria-label="Tirar um ponto de inspiração" ${(+c.inspiracao || 0) <= 0 ? "disabled" : ""}>−</button><b>${+c.inspiracao || 0}</b><button class="btn sm" data-a="insp" data-v="1" aria-label="Adicionar um ponto de inspiração">+</button></div></div>
    </div>
    ${c.resistCond ? `<div class="small muted">${esc(c.resistCond)}</div>` : ""}
  </section>
  ${
    t.length
      ? `<section class="card c7"><div class="row"><h2>Magias de hoje</h2><span class="spacer"></span>
     <a class="btn sm" href="#magias">${isSpont(c) ? "Magias conhecidas" : "Preparar"}</a><button class="btn sm pri" data-a="rest">Descansar 8 h</button></div>
     ${t.map((r) => (isSpont(c) ? spontLevel(c, r) : slotLevel(c, r, true))).join("")}
  </section>`
      : classCard(c, "c7")
  }
  <section class="card c5"><div class="row"><h2>Minhas armas</h2><span class="spacer"></span><a class="btn sm" href="#ficha">Editar</a></div>
    <div class="list">${
      c.ataques
        .map(
          (x) => `<div class="weapon">
      <div class="wtop"><b>${esc(x.nome || "Arma")}</b><span class="tag">${esc({ corpo: "Corpo a corpo", acuidade: "Acuidade", arremesso: "Arremesso", distancia: "Distância" }[x.tipo] || "")}</span></div>
      <div class="wnums">
        <div class="wnum"><span>Acerto</span><b>${sg(atkBonus(c, x))}</b><small>${esc(partsTxt(atkParts(c, x)))}</small></div>
        <div class="wnum"><span>Dano</span><b>${esc(dmgTxt(c, x))}</b><small>${esc(dmgParts(c, x).length ? partsTxt(dmgParts(c, x)) : "sem modificador")}</small></div>
        <div class="wnum"><span>Crítico</span><b class="mid">${esc(x.critico || "—")}</b><small>${esc(x.alcance && x.alcance !== "—" ? "alcance " + x.alcance : "")}</small></div>
      </div>${(() => {
        const am = ammoFor(c, x);
        if (!am) return "";
        const i = c.ataques.indexOf(x);
        const low = am.qtd <= 5;
        return `<div class="ammo"><span class="small muted">${AMMO[am.kind].nome}</span><b style="color:${am.qtd === 0 ? "var(--bad)" : low ? "var(--warn)" : "var(--ink)"}" aria-live="polite">${am.qtd}</b>
        <button class="btn sm pri" data-a="ammo" data-w="${i}" data-v="-1" ${am.qtd <= 0 ? "disabled" : ""} aria-label="Gastar 1 de ${AMMO[am.kind].nome.toLowerCase()}">Atirar −1</button>
        <button class="btn sm" data-a="ammo" data-w="${i}" data-v="1" aria-label="Adicionar 1">+1</button>
        <button class="btn sm" data-a="ammo" data-w="${i}" data-v="10" aria-label="Adicionar 10">+10</button>
        ${am.qtd === 0 ? `<span class="small" style="color:var(--bad)">Sem munição</span>` : low ? `<span class="small" style="color:var(--warn)">Pouca munição</span>` : ""}</div>`;
      })()}
      ${x.obs ? `<div class="small muted">${esc(x.obs)}</div>` : ""}</div>`
        )
        .join("") || '<p class="muted">Nenhuma arma. Adicione na aba Ficha.</p>'
    }</div>
    ${
      c.familiar.tipo
        ? `<h2>${["druida", "ranger"].includes(c.classeKey) ? "Companheiro animal" : "Familiar"}</h2>
    <div class="row"><b>${esc(c.familiar.tipo)}</b>${c.familiar.nome ? `<span class="muted">${esc(c.familiar.nome)}</span>` : ""}<span class="spacer"></span>
      ${inp("familiar.pv", { type: "number", label: ["mago", "feiticeiro"].includes(c.classeKey) ? `PV (máx. ${famMax})` : "PV" })}</div>`
        : ""
    }
    <h2>Dinheiro</h2>
    <div class="row">${["pl", "po", "pp", "pc"].map((k) => inp("dinheiro." + k, { type: "number", label: k.toUpperCase() })).join("")}</div>
    <label class="f" for="f_rapido">Anotações rápidas e efeitos ativos<textarea id="f_rapido" data-b="rapido">${esc(c.rapido)}</textarea></label>
  </section>
  ${t.length ? classCard(c, "c12") : ""}
  </div>`;
}
function classCard(c, span) {
  const f = classFeatures(c);
  const u = c.usos || {};
  return `<section class="card ${span}"><div class="row"><h2>Habilidades de ${esc(cls(c).nome.toLowerCase())}</h2><span class="spacer"></span>${!slotTable(c).length ? '<button class="btn sm pri" data-a="rest">Descansar 8 h</button>' : ""}</div>
  ${
    f.R.length
      ? `<div class="list">${f.R.map((r) => {
          const used = +u[r.key] || 0,
            left = Math.max(0, r.max - used);
          return `<div class="weapon"><div class="wtop"><b>${esc(r.nome)}</b><span class="small muted">${left} de ${r.max} ${r.pool ? "restantes" : "usos restantes"}</span></div>
      ${r.pool ? "" : `<span class="pips" aria-hidden="true">${Array.from({ length: r.max }, (_, i) => `<i class="pip ${i < left ? "on" : ""}"></i>`).join("")}</span>`}
      <div class="small muted">${esc(r.desc)}</div>
      <div class="row"><button class="btn sm pri" data-a="uso" data-k="${r.key}" data-v="1" ${left <= 0 ? "disabled" : ""}>${r.pool ? "Gastar 1" : "Usar"}</button>
      ${r.pool ? `<button class="btn sm" data-a="uso" data-k="${r.key}" data-v="5" ${left < 5 ? "disabled" : ""}>Gastar 5</button>` : ""}
      <button class="btn sm ghost" data-a="uso" data-k="${r.key}" data-v="-1" ${used <= 0 ? "disabled" : ""}>Desfazer</button></div></div>`;
        }).join("")}</div>`
      : ""
  }
  ${f.T.map((t) => `<div class="row"><button class="toggle" data-a="ef" data-k="${t.key}" aria-pressed="${!!c.ef[t.key]}">${esc(t.nome)}</button><span class="small muted">${esc(t.desc)}</span></div>`).join("")}
  ${f.I.length ? `<dl class="kv">${f.I.map((i) => `<dt>${esc(i.nome)}${i.valor ? ` <b style="color:var(--ink)">${i.valor}</b>` : ""}</dt><dd class="small muted">${esc(i.desc)}</dd>`).join("")}</dl>` : ""}
  </section>`;
}
function spontLevel(c, r) {
  const used = +(c.usados || {})[r.l] || 0,
    left = Math.max(0, r.normal - used);
  const known = c.grimorio.filter((s) => s.nivel === r.l).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<div class="lvl"><div class="lvlhead"><h3>${lvlName(r.l)}</h3><span class="small muted">CD ${10 + r.l + mod(at(c, spellAttr(c)))}</span>
    <span class="spacer"></span><span class="small muted">${left} de ${r.normal} disponíveis</span>
    <span class="pips" aria-hidden="true">${Array.from({ length: r.normal }, (_, i) => `<i class="pip ${i < left ? "on" : ""}"></i>`).join("")}</span>
    <button class="btn sm ghost" data-a="spundo" data-l="${r.l}" ${used <= 0 ? "disabled" : ""}>Recuperar 1</button></div>
    ${
      known
        .map(
          (
            s
          ) => `<div class="slot"><div class="sbody"><button class="sname" data-a="info" data-id="${s.id}">${nomeHTML(s)}</button><div class="sdesc">${esc(spellLine(c, s))}</div></div>
      <button class="btn sm" data-a="info" data-id="${s.id}">Info</button><button class="btn sm pri" data-a="spcast" data-l="${r.l}" ${left <= 0 ? "disabled" : ""}>Lançar</button></div>`
        )
        .join("") || '<p class="small muted" style="margin:0">Nenhuma magia conhecida deste nível.</p>'
    }
  </div>`;
}
function slotLevel(c, r, play) {
  const p = c.prep[r.l];
  const all = [
    ...(r.escola ? [{ ...p.escola, school: true, key: "e" }] : []),
    ...p.slots.map((x, i) => ({ ...x, key: i })),
  ];
  const avail = all.filter((x) => x.sid && !x.used).length;
  const sampleDC = 10 + r.l + mod(at(c, spellAttr(c)));
  return `<div class="lvl"><div class="lvlhead"><h3>${lvlName(r.l)}</h3>
    <span class="small muted">CD ${sampleDC}${c.cdEscola && c.escola ? ` (${esc(c.escola)} ${sampleDC + +c.cdEscola})` : ""}</span>
    <span class="spacer"></span><span class="small muted">${avail} de ${all.length} disponíveis</span>
    <span class="pips" aria-hidden="true">${all.map((x) => `<i class="pip ${x.school ? "school" : ""} ${x.sid && !x.used ? "on" : ""}"></i>`).join("")}</span></div>
    ${all
      .map((x) => {
        const s = x.sid && spell(c, x.sid);
        return `<div class="slot ${x.school ? "school" : ""} ${x.used ? "used" : ""}">
        ${x.school ? `<span class="tag gold">${esc(r.extraNome || "Extra")}</span>` : ""}
        ${s ? `<div class="sbody"><button class="sname" data-a="info" data-id="${s.id}">${nomeHTML(s)}</button><div class="sdesc">${esc(spellLine(c, s))}</div></div>` : `<span class="sname empty">Espaço vazio</span>`}
        ${s ? `<button class="btn sm" data-a="info" data-id="${s.id}" aria-label="Descrição completa de ${esc(nomeTxt(s))}">Info</button>` : ""}
        ${play && s ? `<button class="btn sm ${x.used ? "ghost" : "pri"}" data-a="cast" data-l="${r.l}" data-k="${x.key}">${x.used ? "Desfazer" : "Lançar"}</button>` : ""}
      </div>`;
      })
      .join("")}
  </div>`;
}
