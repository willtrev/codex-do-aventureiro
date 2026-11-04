/* Atualiza dados salvos por versões anteriores do app. */
function syncCat(c) {
  let ch = false;
  for (const s of c.grimorio || []) {
    const k =
      (s.en &&
        CAT_POR_EN.get(
          String(s.en)
            .toLowerCase()
            .replace(/^(tasha's|melf's) /, "")
        )) ||
      CAT.find((x) => x.nome === s.nome);
    if (!k) continue;
    for (const f of [
      "nome",
      "en",
      "escola",
      "subescola",
      "descritor",
      "tempo",
      "comp",
      "alcance",
      "alvo",
      "duracao",
      "ts",
      "rm",
      "desc",
      "descPt",
      "ataque",
    ])
      if (s[f] !== k[f]) {
        s[f] = k[f];
        ch = true;
      }
  }
  return ch;
}
function migrate() {
  for (const c of Object.values(state.chars)) {
    let ch = syncCat(c);
    for (const t of c.tracos || [])
      if (t.obs && t.obs.includes("nos TR")) {
        t.obs = t.obs.replace("nos TR", "nos testes de resistência");
        ch = true;
      }
    if (ch) touch(c.id);
  }
  if ((state.mig || 0) < 1) {
    const old = Object.values(state.chars).find((c) => c.nome === "Volis E'gurar" && +c.nivel === 2);
    if (old) {
      old.nome = "Volis E'gurar (nível 2)";
      const n = volis(1);
      state.chars[n.id] = n;
      state.active = n.id;
      touch(old.id);
      touch(n.id);
    }
    state.mig = 1;
    touch("__meta");
  }
  if ((state.mig || 0) < 2) {
    for (const c of Object.values(state.chars)) {
      if (!(c.nome || "").startsWith("Volis E'gurar")) continue;
      if (c.dinheiro && +c.dinheiro.po === 27) c.dinheiro.po = 21;
      for (const it of c.itens || []) {
        if (it.nome === "Virotes") {
          if (+it.qtd === 10) it.qtd = 20;
          if (+it.peso === 0.5) it.peso = 0.05;
        }
        if (it.nome === "Rações de viagem (dias)" && +it.peso === 1) it.peso = 0.5;
      }
      touch(c.id);
    }
    state.mig = 2;
    touch("__meta");
  }
  if ((state.mig || 0) < 3) {
    for (const c of Object.values(state.chars)) {
      let ch = false;
      for (const a of c.ataques || []) {
        if (a.dado !== undefined) continue;
        ch = true;
        const m = String(a.dano || "").match(/^\s*(\d+d\d+)/);
        a.dado = m ? m[1] : a.dano || "";
        a.tipo = a.tipo === "corpo" ? "corpo" : /arremess/i.test(a.nome || "") ? "arremesso" : "distancia";
        if (/^Adaga \(arremesso\)$/.test(a.nome)) a.nome = "Adaga (arremessada)";
        if (/^Adaga \(corpo a corpo\)$/.test(a.nome)) a.nome = "Adaga";
        a.acertoOutros = +a.outros || 0;
        a.danoOutros = 0;
        delete a.outros;
        delete a.dano;
      }
      if (ch) touch(c.id);
    }
    state.mig = 3;
    touch("__meta");
  }
  if ((state.mig || 0) < 4) {
    for (const c of Object.values(state.chars))
      if (c.inspiracao === undefined) {
        c.inspiracao = (c.nome || "").startsWith("Volis E'gurar") ? 1 : 0;
        touch(c.id);
      }
    state.mig = 4;
    touch("__meta");
  }
  if ((state.mig || 0) < 5) {
    for (const c of Object.values(state.chars)) {
      let ch = false;
      if (!c.classeKey) {
        c.classeKey = classKeyFromName(c.classe);
        ch = true;
      }
      if (!c.usos) {
        c.usos = {};
        ch = true;
      }
      if (!c.usados) {
        c.usados = {};
        ch = true;
      }
      if (ch) touch(c.id);
    }
    if (!Object.values(state.chars).some((c) => c.testChar))
      for (const t of testChars()) {
        state.chars[t.id] = t;
        touch(t.id);
      }
    state.mig = 5;
    touch("__meta");
  }
  if ((state.mig || 0) < 6) {
    for (const c of Object.values(state.chars))
      if ("retrato" in c) {
        delete c.retrato;
        touch(c.id);
      }
    state.mig = 6;
    touch("__meta");
  }
}
