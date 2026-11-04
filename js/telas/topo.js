/* ================= Render ================= */
function render() {
  const c = cur();
  if (!c) {
    document.getElementById("main").innerHTML = vInicio();
    return;
  }
  ensurePrep(c);
  const opts = Object.values(state.chars)
    .map((x) => `<option value="${x.id}" ${x.id === state.active ? "selected" : ""}>${esc(x.nome)}</option>`)
    .join("");
  document.getElementById("top").innerHTML = `
   <div class="idrow">
     <h1>${esc(c.nome)}</h1>
     <span class="sub">${esc(cls(c).nome)} ${c.nivel} · ${esc(c.raca)} · ${esc(c.tendencia)}${c.tendencia && alignBlock(c.classeKey, alignCode(c.tendencia)) ? ` <span class="tag" style="color:var(--bad);border-color:var(--bad)" title="${esc(alignBlock(c.classeKey, alignCode(c.tendencia)))}">tendência inválida</span>` : ""}</span>
     <span class="spacer"></span>
     <label class="sr" for="charsel" style="position:absolute;left:-9999px">Personagem</label>
     <select id="charsel" data-a="switch">${opts}</select>
     <button class="btn sm" data-a="newchar">Novo</button>
     <button class="btn sm" data-a="dupchar" title="Cria uma cópia, útil para guardar o nível anterior">Duplicar</button>
     <button class="btn sm pri" data-a="exportpdf">Exportar PDF</button>
   </div>
   <div class="row"><span class="status" id="st">${statusHTML()}</span><span class="spacer"></span>
     <span class="theme" role="group" aria-label="Idioma do conteúdo" title="Idioma de magias, talentos, equipamento e domínios">${IDIOMAS.map(
       ([k, n]) => `<button data-a="lang" data-l="${k}" aria-pressed="${idioma === k}">${n}</button>`
     ).join("")}</span>
     <span class="theme" role="group" aria-label="Tema">${[
       ["light", "Claro"],
       ["dark", "Escuro"],
       ["auto", "Automático"],
     ]
       .map(([k, n]) => `<button data-a="theme" data-t="${k}" aria-pressed="${theme === k}">${n}</button>`)
       .join("")}</span></div>
   <nav class="tabs" aria-label="Seções">${TABS.map(([k, n]) => `<a href="#${k}" ${k === tab ? 'aria-current="page"' : ""}>${n}</a>`).join("")}</nav>`;
  const m = document.getElementById("main");
  m.innerHTML = {
    painel: vPainel,
    magias: vMagias,
    pericias: vPericias,
    ficha: vFicha,
    inventario: vInv,
    notas: vNotas,
  }[tab](c);
}
