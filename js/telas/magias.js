/* ================= Aba Magias ================= */
function domainAllowed(d, ak) {
  return d === "Bem"
    ? isGood(ak)
    : d === "Mal"
      ? isEvil(ak)
      : d === "Lei"
        ? isLawful(ak)
        : d === "Caos"
          ? isChaotic(ak)
          : true;
}
function domainPicker(c) {
  const sel = domList(c);
  const ak = alignCode(c.tendencia);
  const bad = sel.filter((d) => !domainAllowed(d, ak));
  return `<div class="f" role="group" aria-labelledby="dom_lbl"><span id="dom_lbl" style="font-size:12px;font-weight:600;color:var(--muted)">Domínios <span style="font-weight:400">(escolha 2; Bem, Caos, Lei e Mal exigem a tendência correspondente)</span></span>
    <div class="row">${DOMAIN_NAMES.map((d) => {
      const D = DOMAINS[d];
      const on = sel.includes(d);
      const dis = !on && (D.bloq || sel.length >= 2 || !domainAllowed(d, ak));
      return `<button class="toggle" data-a="dom" data-d="${esc(d)}" aria-pressed="${on}" ${dis ? "disabled" : ""} title="${esc(D.poder)}">${esc(d)}</button>`;
    }).join("")}</div>
    ${sel.length < 2 ? `<span class="small" style="color:var(--warn)">Falta escolher ${2 - sel.length} domínio${sel.length === 1 ? "" : "s"}.</span>` : ""}
    ${bad.length ? `<span class="small" style="color:var(--bad)">${esc(bad.join(" e "))} não combina com a tendência ${esc(alignName(ak))}. Troque o domínio ou a tendência.</span>` : ""}
  </div>
  ${sel.length ? `<div class="tbl"><table><thead><tr><th>Domínio</th><th>Poder concedido</th><th>Magias por nível (1º a 9º)</th></tr></thead><tbody>${sel.map((d) => `<tr><td><b>${esc(d)}</b></td><td class="small">${esc(DOMAINS[d].poder)}</td><td class="small">${DOMAINS[d].m.map((n, i) => `<span style="white-space:nowrap">${i + 1}º ${esc(n)}</span>`).join(" · ")}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}
function vMagias(c) {
  const k = cls(c),
    m = k.magia,
    L = lvlOf(c);
  if (!m)
    return `<div class="grid"><section class="card c12"><h2>Magias</h2><p style="margin:0">${esc(k.nome)} não lança magias.</p></section></div>`;
  const t = ensurePrep(c),
    spont = m.tipo === "espontanea",
    isMago = m.tipo === "grimorio";
  const known = c.grimorio.slice().sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome));
  const maxL = t.length ? t[t.length - 1].l : -1;
  const forbidden = isMago ? String(c.proibidas || "").toLowerCase() : "";
  const levels = [...new Set(known.map((s) => s.nivel))];
  const attrN = ATTR_NAME[m.attr];
  const listTitle = isMago ? "Grimório" : spont ? "Magias conhecidas" : "Magias da lista";
  const kt = knownTable(c);
  const notStarted = m.desde && L < m.desde;
  const head = `<section class="card c12"><h2>${isMago ? "Especialização" : "Conjuração"}</h2>
    ${
      isMago
        ? `<div class="specrow">
      <label class="f" for="f_escola">Escola especializada<select id="f_escola" data-b="escola"><option value="">Nenhuma (universalista)</option>${SCHOOLS.filter(
        (s) => s !== "Universal"
      )
        .map((s) => `<option ${s === c.escola ? "selected" : ""}>${s}</option>`)
        .join("")}</select></label>
      <label class="f" for="f_cdEscola">Bônus de CD na escola<input id="f_cdEscola" type="number" data-b="cdEscola" value="${+c.cdEscola || 0}"></label>
    </div>
    ${(() => {
      const sel = proibList(c);
      const need = c.escola === "Adivinhação" ? 1 : 2;
      return `<div class="f" role="group" aria-labelledby="proib_lbl"><span id="proib_lbl" style="font-size:12px;font-weight:600;color:var(--muted)">Escolas proibidas <span style="font-weight:400">(${c.escola ? `escolha ${need}` : "universalista não proíbe escolas"}; Adivinhação nunca pode ser proibida)</span></span>
      <div class="row">${SCHOOLS.filter((x) => x !== "Universal")
        .map((x) => {
          const dis = !c.escola || x === c.escola || x === "Adivinhação";
          return `<button class="toggle" data-a="proib" data-s="${x}" aria-pressed="${sel.includes(x)}" ${dis ? "disabled" : ""}>${x}</button>`;
        })
        .join("")}</div>
      ${c.escola && sel.length < need ? `<span class="small" style="color:var(--warn)">Falta escolher ${need - sel.length} escola${need - sel.length > 1 ? "s" : ""}.</span>` : c.escola && sel.length > need ? `<span class="small" style="color:var(--warn)">O especialista proíbe só ${need}. Desmarque ${sel.length - need}.</span>` : ""}</div>`;
    })()}`
        : `<div class="specrow">

      <label class="f" for="f_esc2">Escola com Foco em Magia<select id="f_esc2" data-b="escola"><option value="">Nenhuma</option>${SCHOOLS.filter(
        (s) => s !== "Universal"
      )
        .map((s) => `<option ${s === c.escola ? "selected" : ""}>${s}</option>`)
        .join("")}</select></label>
      <label class="f" for="f_cdEscola">Bônus de CD nessa escola<input id="f_cdEscola" type="number" data-b="cdEscola" value="${+c.cdEscola || 0}"></label></div>`
    }
    ${c.classeKey === "clerigo" ? domainPicker(c) : ""}
    <p class="small muted" style="margin:0">${notStarted ? `${esc(k.nome)} só começa a lançar magias no ${m.desde}º nível. ` : ""}CD = 10 + nível da magia + mod. de ${attrN} (${sg(mod(at(c, m.attr)))})${c.escola ? " + bônus de escola" : ""}. ${maxL >= 0 ? `Maior nível de magia: ${maxL === 0 ? "truques" : maxL + "º"}.` : ""} ${m.clMeio ? `Nível de conjurador: ${casterLevel(c)}.` : ""} ${spont ? "Você lança qualquer magia conhecida gastando um espaço do nível dela; não precisa preparar." : isMago ? "Magias de mago gastam o espaço quando lançadas, inclusive truques." : "Você prepara magias da lista da classe após 8 horas de descanso e 1 hora de oração ou meditação."}${c.classeKey === "clerigo" ? " O espaço de domínio aceita só magias dos seus domínios." : ""}</p>
  </section>`;
  const perDay = `<section class="card c6"><h2>Magias por dia</h2>
    ${
      t.length
        ? `<div class="tbl"><table><thead><tr><th>Nível</th><th class="num">Da classe</th><th class="num">Bônus (${attrN})</th>${t.some((r) => r.escola) ? `<th class="num">${esc(t.find((r) => r.escola).extraNome)}</th>` : ""}<th class="num">Total</th>${kt ? '<th class="num">Conhecidas</th>' : ""}<th class="num">CD</th></tr></thead><tbody>
    ${t.map((r) => `<tr><td>${lvlName(r.l)}</td><td class="num">${r.base}</td><td class="num">${r.bonus || "—"}</td>${t.some((x) => x.escola) ? `<td class="num">${r.escola || "—"}</td>` : ""}<td class="num total">${r.normal + r.escola}</td>${kt ? `<td class="num">${c.grimorio.filter((s) => s.nivel === r.l).length} de ${kt[r.l] ?? 0}</td>` : ""}<td class="num">${10 + r.l + mod(at(c, m.attr))}</td></tr>`).join("")}
    </tbody></table></div>`
        : '<p class="muted" style="margin:0">Nenhuma magia por dia neste nível.</p>'
    }
    ${spont ? `<button class="btn sm" data-a="clearused" style="align-self:flex-start">Recuperar todas</button>` : ""}
  </section>`;
  const prep = spont
    ? perDay
    : `<section class="card c6"><div class="row"><h2>Preparação</h2><span class="spacer"></span><button class="btn sm" data-a="clearused">Recuperar todas</button></div>
    <p class="small muted" style="margin:0">Escolha uma magia para cada espaço. Repetir a mesma magia em vários espaços é permitido.${isMago ? ` O espaço dourado só aceita magias de ${esc(c.escola || "—")}.` : ""}</p>
    ${
      t
        .map((r) => {
          const p = c.prep[r.l];
          const isCl = c.classeKey === "clerigo";
          const okFor = (s, school) => {
            if (isCl) {
              if (school) {
                const dl = domainSpellLevel(c, s.nome);
                return dl !== null && dl <= r.l;
              }
              return !s.soDominio && s.nivel <= r.l;
            }
            return s.nivel <= r.l && (!school || !isMago || s.escola === c.escola);
          };
          const optsFor = (school, sel) =>
            `<option value="">— vazio —</option>` +
            known
              .filter((s) => okFor(s, school))
              .map(
                (s) =>
                  `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc(nomeDe(s))}${s.nivel < r.l ? ` (${s.nivel === 0 ? "truque" : s.nivel + "º"})` : ""}${s.soDominio ? " (domínio)" : ""}</option>`
              )
              .join("");
          return `<div class="lvl"><div class="lvlhead"><h3>${lvlName(r.l)}</h3><span class="small muted">${r.base} da classe${r.bonus ? ` + ${r.bonus} ${attrN}` : ""}${r.escola ? ` + 1 ${r.extraNome.toLowerCase()}` : ""} = ${r.normal + r.escola}</span></div>
      ${r.escola ? `<div class="slot school"><span class="tag gold">${esc(r.extraNome)}</span><select id="ps_${r.l}_e" data-a="prepsel" data-l="${r.l}" data-k="e" style="flex:1" aria-label="Espaço de ${esc(r.extraNome)}, ${lvlName(r.l)}">${optsFor(true, p.escola.sid)}</select>${p.escola.sid ? `<button class="btn sm" data-a="info" data-id="${p.escola.sid}">Info</button>` : ""}</div>` : ""}
      ${p.slots.map((x, i) => `<div class="slot"><select id="ps_${r.l}_${i}" data-a="prepsel" data-l="${r.l}" data-k="${i}" style="flex:1" aria-label="Espaço ${i + 1}, ${lvlName(r.l)}">${optsFor(false, x.sid)}</select>${x.sid ? `<button class="btn sm" data-a="info" data-id="${x.sid}">Info</button>` : ""}</div>`).join("")}
      </div>`;
        })
        .join("") || '<p class="muted" style="margin:0">Nenhum espaço de magia neste nível.</p>'
    }
  </section>`;
  const listHelp = isMago
    ? "Mago ganha 2 magias grátis por nível. Copiar de pergaminho ou grimório: 100 PO por página (1 página por nível da magia) e teste de Identificar Magias."
    : spont
      ? "Você conhece um número limitado de magias (veja a tabela). Ao subir de nível, escolha as novas aqui."
      : "Você pode preparar qualquer magia da lista da classe. Adicione aqui as que costuma usar para tê-las à mão.";
  return `<div class="grid">${head}<div class="stack c6">${prep}${spont ? "" : perDay}</div>
  <section class="card c6" style="align-self:start"><div class="row"><h2>${listTitle} (${known.length})</h2><span class="spacer"></span><button class="btn sm pri" data-a="addspell">Adicionar magia</button></div>
    <p class="small muted" style="margin:0">${listHelp}</p>
    ${
      levels
        .map(
          (l) =>
            `<div class="lvl"><h3 style="font-size:15px">${lvlName(l)}${kt ? ` <span class="small muted" style="font-weight:400">${known.filter((s) => s.nivel === l).length} de ${kt[l] ?? 0}</span>` : ""}</h3>${known
              .filter((s) => s.nivel === l)
              .map(
                (s) => `
      <div class="spellrow"><div class="sbody"><button class="sname" data-a="info" data-id="${s.id}">${nomeHTML(s)}</button><div class="sdesc">${esc(spellLine(c, s))}</div></div>
      <span class="tag ${s.escola === c.escola ? "gold" : ""}">${esc(s.escola)}</span>
      ${s.nivel <= maxL && temTeste(s.ts) ? `<span class="small muted">CD ${dc(c, s)}</span>` : ""}
      ${forbidden && forbidden.includes(String(s.escola).toLowerCase()) ? '<span class="tag" style="color:var(--bad)">proibida</span>' : ""}
      <button class="btn sm" data-a="info" data-id="${s.id}" aria-label="Descrição completa de ${esc(nomeTxt(s))}">Info</button>
      <button class="btn sm ghost" data-a="delspell" data-id="${s.id}" aria-label="Remover ${esc(s.nome)}">Remover</button></div>`
              )
              .join("")}</div>`
        )
        .join("") || '<p class="muted">Nenhuma magia ainda.</p>'
    }
  </section></div>`;
}
