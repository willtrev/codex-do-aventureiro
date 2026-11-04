/* ================= Aba Ficha ================= */
function listEditor(path, label, fields) {
  const arr = getPath(cur(), path) || [];
  return `<div class="list">${arr
    .map(
      (x, i) => `<div class="li" style="grid-template-columns:${fields.map((f) => f[2] || "1fr").join(" ")} auto">
    ${fields.map((f) => `<input type="${f[3] || "text"}" id="${path}_${i}_${f[0]}" data-b="${path}.${i}.${f[0]}" value="${esc(x[f[0]] ?? "")}" placeholder="${esc(f[1])}" aria-label="${esc(f[1])}" ${f[3] === "number" ? 'step="any" style="width:100%"' : ""}>`).join("")}
    <button class="btn sm ghost" data-a="rm" data-p="${path}" data-i="${i}" aria-label="Remover">Remover</button></div>`
    )
    .join("")}
    <button class="btn sm" data-a="add" data-p="${path}" style="align-self:flex-start">Adicionar ${label}</button></div>`;
}

function vFicha(c) {
  const sug = hpSuggest(c);
  return `<div class="grid">
  <section class="card c12"><h2>Identidade</h2><div class="fields">
    ${inp("nome", { label: "Nome do personagem" })}${inp("jogador", { label: "Jogador" })}${inp("raca", { label: "Raça" })}<label class="f" for="f_classe">Classe<select id="f_classe" data-b="classeKey">${CLASS_ORDER.map((k) => `<option value="${k}" ${k === c.classeKey ? "selected" : ""}>${CLASSES[k].nome}</option>`).join("")}</select></label>
    ${inp("nivel", { type: "number", label: "Nível" })}${inp("xp", { type: "number", label: `XP (próximo: ${((((+c.nivel || 1) * ((+c.nivel || 1) + 1)) / 2) * 1000).toLocaleString("pt-BR")})` })}
    ${(() => {
      const ak = alignCode(c.tendencia);
      const blk = c.tendencia ? alignBlock(c.classeKey, ak) : "";
      return `<label class="f" for="f_tend">Tendência<select id="f_tend" data-b="tendencia">${c.tendencia && !ALIGNS.some((a) => a[1] === c.tendencia) ? `<option selected>${esc(c.tendencia)}</option>` : ""}${ALIGNS.map(
        ([k, n]) => {
          const r = alignBlock(c.classeKey, k);
          return `<option value="${n}" ${n === c.tendencia ? "selected" : ""} ${r && n !== c.tendencia ? "disabled" : ""}>${n}${r ? " (indisponível)" : ""}</option>`;
        }
      ).join("")}</select>${blk ? `<span style="color:var(--bad);font-weight:400">${esc(blk)}</span>` : ""}</label>`;
    })()}${inp("divindade", { label: "Divindade" })}
    <label class="f" for="f_tam">Tamanho<select id="f_tam" data-b="tamanho">${["Pequeno", "Médio", "Grande"].map((s) => `<option ${s === c.tamanho ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    ${inp("idade", { label: "Idade" })}${inp("sexo", { label: "Sexo" })}${inp("altura", { label: "Altura" })}${inp("peso", { label: "Peso" })}${inp("deslocamento", { label: "Deslocamento" })}
  </div></section>
  <section class="card c12"><h2>Atributos (valores finais, já com ajustes raciais)</h2>
    <div class="attrs">${ATTRS.map(([k, ab, n]) => `<div class="attr"><span class="ab" title="${n}">${ab}</span><span class="m">${sg(mod(c.attr[k]))}</span><input type="number" id="at_${k}" data-b="attr.${k}" value="${c.attr[k]}" aria-label="${n}"></div>`).join("")}</div>
  </section>
  <section class="card c6"><h2>Vida e defesa</h2>
    <div class="fields">${inp("hp.max", { type: "number", label: "PV máximos" })}${inp("hp.atual", { type: "number", label: "PV atuais" })}</div>
    <div class="row small"><span class="muted">Média alta da mesa: ${sug} PV (d${cls(c).dv}: ${cls(c).dv} + Con no 1º nível, ${cls(c).dv / 2 + 1} + Con depois).</span>${sug !== +c.hp.max ? `<button class="btn sm" data-a="usehp" data-v="${sug}">Usar ${sug}</button>` : ""}</div>
    <div class="fields">${inp("ca.armadura", { type: "number", label: "Armadura" })}${inp("ca.escudo", { type: "number", label: "Escudo" })}${inp("ca.natural", { type: "number", label: "Armadura natural" })}${inp("ca.deflexao", { type: "number", label: "Deflexão" })}${inp("ca.outros", { type: "number", label: "Outros (CA)" })}</div>
    <div class="fields">${inp("outros.fort", { type: "number", label: "Fortitude: outros" })}${inp("outros.ref", { type: "number", label: "Reflexos: outros" })}${inp("outros.von", { type: "number", label: "Vontade: outros" })}${inp("outros.init", { type: "number", label: "Iniciativa: outros" })}${inp("outros.bba", { type: "number", label: "BBA: outros" })}${inp("outros.agarrar", { type: "number", label: "Agarrar: outros" })}</div>
    ${inp("resistCond", { label: "Modificadores condicionais de resistência" })}
  </section>
  <section class="card c6"><h2>Minhas armas</h2>
    <p class="small muted" style="margin:0">Acerto: BBA + For (corpo a corpo) ou Des (arremesso e distância) + tamanho + bônus extra. Dano: dado + For (corpo a corpo e arremesso; bestas não somam Força) + bônus extra. Use os bônus extras para arma obra-prima (+1 acerto), mágica (+1/+1) ou magias como Aumentar Pessoa.</p>
    <div class="list">${c.ataques
      .map(
        (x, i) => `<div class="weapon">
      <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">
        <label class="f" for="w_${i}_nome">Arma<input id="w_${i}_nome" type="text" data-b="ataques.${i}.nome" value="${esc(x.nome || "")}"></label>
        <label class="f" for="w_${i}_tipo">Tipo<select id="w_${i}_tipo" data-b="ataques.${i}.tipo">${Object.entries(
          WTYPE
        )
          .map(([k, n]) => `<option value="${k}" ${k === x.tipo ? "selected" : ""}>${n}</option>`)
          .join("")}</select></label>
        <label class="f" for="w_${i}_dado">Dado de dano<input id="w_${i}_dado" type="text" data-b="ataques.${i}.dado" value="${esc(x.dado || "")}" placeholder="1d8"></label>
        <label class="f" for="w_${i}_ac">Bônus extra no acerto<input id="w_${i}_ac" type="number" data-b="ataques.${i}.acertoOutros" value="${+x.acertoOutros || 0}"></label>
        <label class="f" for="w_${i}_dm">Bônus extra no dano<input id="w_${i}_dm" type="number" data-b="ataques.${i}.danoOutros" value="${+x.danoOutros || 0}"></label>
        <label class="f" for="w_${i}_cr">Crítico<input id="w_${i}_cr" type="text" data-b="ataques.${i}.critico" value="${esc(x.critico || "")}" placeholder="19-20/x2"></label>
        <label class="f" for="w_${i}_al">Alcance<input id="w_${i}_al" type="text" data-b="ataques.${i}.alcance" value="${esc(x.alcance || "")}"></label>
      </div>
      <label class="f" for="w_${i}_obs">Observação<input id="w_${i}_obs" type="text" data-b="ataques.${i}.obs" value="${esc(x.obs || "")}"></label>
      <div class="row"><span class="small">Resultado: acerto <b>${sg(atkBonus(c, x))}</b>, dano <b>${esc(dmgTxt(c, x))}</b></span><span class="spacer"></span><button class="btn sm ghost" data-a="rm" data-p="ataques" data-i="${i}">Remover</button></div>
    </div>`
      )
      .join("")}
    <button class="btn sm" data-a="addweapon" style="align-self:flex-start">Adicionar arma</button></div>
  </section>
  <section class="card c6"><div class="row"><h2>Talentos</h2><span class="spacer"></span><button class="btn sm pri" data-a="srdfeat">Adicionar do SRD</button></div>${listEditor(
    "talentos",
    "talento",
    [
      ["nome", "Talento", "1fr"],
      ["obs", "Observação", "1.5fr"],
    ]
  )}</section>
  <section class="card c6"><h2>Características de classe</h2>${listEditor("caracteristicas", "característica", [
    ["nome", "Característica", "1fr"],
    ["obs", "Observação", "1.5fr"],
  ])}</section>
  <section class="card c6"><h2>Traços raciais</h2>${listEditor("tracos", "traço", [
    ["nome", "Traço", "1fr"],
    ["obs", "Observação", "1.5fr"],
  ])}</section>
  <section class="card c6"><h2>Classe</h2>
    <dl class="kv"><dt>Dado de vida</dt><dd>d${cls(c).dv}</dd><dt>Bônus base de ataque</dt><dd>${cls(c).bab === "boa" ? "bom (= nível)" : cls(c).bab === "media" ? "médio (3/4 do nível)" : "fraco (1/2 do nível)"}: ${sg(babOf(c))}</dd>
    <dt>Testes bons</dt><dd>${cls(c)
      .tr.map((t) => ({ fort: "Fortitude", ref: "Reflexos", von: "Vontade" })[t])
      .join(
        ", "
      )}</dd><dt>Perícias por nível</dt><dd>${cls(c).pts} + Int</dd><dt>Ouro inicial</dt><dd>${esc(cls(c).ouro)}</dd></dl>
    ${c.classeKey === "ranger" ? `<div class="fields">${inp("inimigo", { label: "Inimigo predileto" })}${inp("estilo", { label: "Estilo de combate" })}</div>` : ""}
    ${c.classeKey === "clerigo" && geNeutral(alignCode(c.tendencia)) ? `<label class="f" for="f_energia">Energia canalizada<select id="f_energia" data-b="energia"><option value="positiva" ${c.energia !== "negativa" ? "selected" : ""}>Positiva: expulsar mortos-vivos, Curar espontâneo</option><option value="negativa" ${c.energia === "negativa" ? "selected" : ""}>Negativa: fascinar mortos-vivos, Infligir espontâneo</option></select></label>` : ""}
    <h2>Tendência e classe</h2>
    <ul class="small" style="margin:0;padding-left:18px">${[
      "Tendências permitidas: " +
        ALIGNS.filter(([k]) => !alignBlock(c.classeKey, k))
          .map((a) => a[1])
          .join(", ") +
        ".",
      ...alignNotes(c),
    ]
      .map((t) => `<li>${esc(t)}</li>`)
      .join("")}</ul>
    ${c.classeKey === "clerigo" ? `<p class="small" style="margin:0">Domínios: <b>${esc(domList(c).join(", ") || "nenhum")}</b>. <a href="#magias">Escolher na aba Magias</a></p>` : ""}
  </section>
  <section class="card c6"><h2>Idiomas e ${["druida", "ranger"].includes(c.classeKey) ? "companheiro animal" : "familiar"}</h2>${inp("idiomas", { label: "Idiomas" })}
    <div class="fields">${inp("familiar.tipo", { label: ["druida", "ranger"].includes(c.classeKey) ? "Companheiro animal" : "Familiar" })}${inp("familiar.nome", { label: "Nome" })}${inp("familiar.pv", { type: "number", label: "PV" })}</div></section>
  </div>`;
}
