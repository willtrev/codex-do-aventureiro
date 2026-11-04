/* ================= Abas Inventário e Notas ================= */
function vInv(c) {
  const tot = c.itens.reduce((a, x) => a + (+x.peso || 0) * (+x.qtd || 1), 0);
  const light = lightLoadKg(c);
  const tag =
    tot <= light
      ? `<span class="tag" style="color:var(--good)">carga leve</span>`
      : tot <= light * 2
        ? `<span class="tag" style="color:var(--warn)">carga média</span>`
        : `<span class="tag" style="color:var(--bad)">carga pesada ou mais</span>`;
  return `<div class="grid">
  <section class="card c8"><div class="row"><h2>Equipamento</h2><button class="btn sm pri" data-a="srdequip">Adicionar do SRD</button><span class="spacer"></span><span>Total: <b>${String(Math.round(tot * 10) / 10).replace(".", ",")} kg</b> de ${String(light).replace(".", ",")} kg (leve)</span>${tag}</div>
    <p class="small muted" style="margin:0">Peso é por unidade, em kg. Carga leve calculada pela Força ${c.attr.for}${c.tamanho === "Pequeno" ? " e tamanho Pequeno" : ""}.</p>
    ${listEditor("itens", "item", [
      ["nome", "Item", "1.6fr"],
      ["qtd", "Qtd.", "56px", "number"],
      ["peso", "Peso (kg)", "72px", "number"],
      ["local", "Onde", "1fr"],
    ])}
  </section>
  <section class="card c4"><h2>Dinheiro</h2><div class="fields">${["pl", "po", "pp", "pc"].map((k) => inp("dinheiro." + k, { type: "number", label: { pl: "Platina", po: "Ouro", pp: "Prata", pc: "Cobre" }[k] })).join("")}</div>
    <p class="small muted" style="margin:0">Valor total em ouro: ${(c.dinheiro.pl * 10 + +c.dinheiro.po + c.dinheiro.pp / 10 + c.dinheiro.pc / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} PO</p></section>
  </div>`;
}

function vNotas(c) {
  return `<div class="grid">
  <section class="card c7"><h2>Notas da campanha</h2><textarea id="f_notas" data-b="notas" style="min-height:320px">${esc(c.notas)}</textarea></section>
  <section class="card c5"><h2>Backup</h2>
    <p class="small muted" style="margin:0">Copie o texto para guardar o personagem em outro lugar. Para restaurar, cole um backup e clique em Importar: ele entra como um personagem novo.</p>
    <div class="row"><button class="btn pri" data-a="exportpdf">Exportar ficha em PDF</button></div>
    <div class="row"><button class="btn" data-a="export">Copiar backup</button><span id="expmsg" class="small muted"></span></div>
    <label class="f" for="impbox">Colar backup<textarea id="impbox" placeholder='{"nome": ...}'></textarea></label>
    <div class="row"><button class="btn" data-a="import">Importar</button><span id="impmsg" class="small muted"></span></div>
    <h2>Personagens</h2>
    <div class="row"><button class="btn" data-a="loadvolis">Criar Volis (exemplo)</button><button class="btn danger" data-a="delchar">Excluir ${esc(c.nome)}</button></div>
  </section></div>`;
}
