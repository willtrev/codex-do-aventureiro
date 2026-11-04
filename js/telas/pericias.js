/* ================= Aba Perícias ================= */
function vPericias(c) {
  const pts = skillPts(c),
    L = +c.nivel || 1;
  return `<div class="grid"><section class="card c12">
    <div class="row"><h2>Perícias</h2><span class="spacer"></span>
      <span class="small">Pontos usados: <span class="pts ${pts.spent > pts.avail ? "over" : ""}">${pts.spent} de ${pts.avail}</span></span>
      <span class="small muted">Máx. de graduações: ${L + 3} (classe) / ${(L + 3) / 2} (outras)</span>
      ${inp("pontosExtras", { type: "number", label: "Pontos extras (ex.: humano)" })}</div>
    <p class="small muted" style="margin:0">Perícia de outra classe custa 2 pontos por graduação. Sinergias (+2 com 5 graduações) entram sozinhas no total. "Só treinada": sem graduação, não pode ser usada.</p>
    <div class="tbl"><table><thead><tr><th class="num">Classe</th><th>Perícia</th><th class="num">Hab.</th><th class="num">Total</th><th class="num">Mod.</th><th class="num">Grad.</th><th class="num">Outros</th><th>Notas</th></tr></thead><tbody>
    ${SKILLS.map(([k]) => {
      const d = SK[k],
        s = c.pericias[k] || {},
        r = skill(c, k);
      return `<tr class="${r.usable ? "" : "na"}">
       <td class="num"><input type="checkbox" id="cls_${k}" data-a="skcls" data-k="${k}" ${r.cls ? "checked" : ""} aria-label="${esc(d.nome)} é perícia de classe"></td>
       <td>${esc(d.nome)}${d.spec ? ` <input type="text" id="spec_${k}" data-b="pericias.${k}.spec" value="${esc(s.spec || "")}" placeholder="especialidade" style="width:110px">` : ""}${d.trained ? ' <span class="tag">só treinada</span>' : ""}</td>
       <td class="num small muted">${d.ab.toUpperCase()}</td>
       <td class="num total">${r.usable ? sg(r.total) : "—"}</td>
       <td class="num">${sg(r.abm)}</td>
       <td class="num"><input type="number" id="gr_${k}" data-b="pericias.${k}.grad" value="${s.grad || 0}" min="0" step="${r.cls ? 1 : 0.5}" style="width:58px"></td>
       <td class="num"><input type="number" id="ou_${k}" data-b="pericias.${k}.outros" value="${s.outros || 0}" style="width:58px">${r.syn.length ? `<div class="small muted">+${r.syn.length * 2} sinergia</div>` : ""}</td>
       <td><input type="text" id="nt_${k}" data-b="pericias.${k}.nota" value="${esc(s.nota || "")}" style="width:100%"></td></tr>`;
    }).join("")}
    </tbody></table></div></section></div>`;
}
