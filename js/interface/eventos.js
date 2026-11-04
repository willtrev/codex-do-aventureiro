/* ================= Eventos ================= */
function readVal(el) {
  if (el.type === "checkbox") return el.checked;
  if (el.type === "number") return el.value === "" ? 0 : +el.value;
  return el.value;
}
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "busca_srd") {
    buscaSRD = el.value;
    filtrarSRD();
    return;
  }
  if (el.id === "busca_magia") {
    buscaMagia = el.value;
    filtrarCatalogo();
    return;
  }
  if (el.dataset && el.dataset.b && cur()) {
    setPath(cur(), el.dataset.b, readVal(el));
    touch();
  }
});
document.addEventListener("change", (e) => {
  const el = e.target,
    c = cur();
  if (!el.dataset) return;
  if (el.id === "filtro_equip") {
    filtroEquip = el.value;
    filtrarSRD();
    return;
  }
  if (el.dataset.b && c) {
    setPath(c, el.dataset.b, readVal(el));
    if (el.dataset.b === "classeKey") c.classe = cls(c).nome;
    if (el.dataset.b === "escola")
      c.proibidas = proibList(c)
        .filter((x) => x !== c.escola && x !== "Adivinhação")
        .join(", ");
    touch();
    render();
    return;
  }
  if (el.dataset.a === "switch") {
    state.active = el.value;
    touch("__meta");
    render();
    return;
  }
  if (el.dataset.a === "prepsel") {
    const p = c.prep[el.dataset.l];
    const v = el.value || null;
    if (el.dataset.k === "e") p.escola = { sid: v, used: false };
    else p.slots[+el.dataset.k] = { sid: v, used: false };
    touch();
    render();
    return;
  }
  if (el.dataset.a === "sheetfile" && el.files && el.files[0]) {
    el.files[0].arrayBuffer().then((b) => {
      SHEET_BYTES = b;
      exportPdf(cur());
    });
    return;
  }
  if (el.dataset.a === "skcls") {
    const k = el.dataset.k;
    c.pericias[k] = c.pericias[k] || {};
    c.pericias[k].classe = el.checked;
    touch();
    render();
    return;
  }
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a,
    c = cur();
  if (a === "closebg") {
    if (e.target === b) closeModal();
    return;
  }
  if (b.tagName === "SELECT" || b.type === "checkbox") return;
  switch (a) {
    case "close":
      closeModal();
      break;
    case "dmg":
    case "heal": {
      const v = Math.max(0, +document.getElementById("hpamt").value || 0);
      if (a === "dmg") {
        let d = v;
        const t = Math.min(+c.hp.temp || 0, d);
        c.hp.temp = (+c.hp.temp || 0) - t;
        d -= t;
        c.hp.atual -= d;
      } else c.hp.atual = Math.min(+c.hp.max, +c.hp.atual + v);
      touch();
      render();
      break;
    }
    case "ef":
      c.ef[b.dataset.k] = !c.ef[b.dataset.k];
      touch();
      render();
      break;
    case "cast": {
      const p = c.prep[b.dataset.l];
      const s = b.dataset.k === "e" ? p.escola : p.slots[+b.dataset.k];
      s.used = !s.used;
      touch();
      render();
      break;
    }
    case "info":
      spellInfo(c, spell(c, b.dataset.id));
      break;
    case "rest":
      restModal(c);
      break;
    case "dorest": {
      if (document.getElementById("r_slots").checked) {
        Object.values(c.prep || {}).forEach((p) => {
          if (p.escola) p.escola.used = false;
          p.slots.forEach((s) => (s.used = false));
        });
        c.usados = {};
        c.usos = {};
      }
      if (document.getElementById("r_hp").checked) c.hp.atual = Math.min(+c.hp.max, +c.hp.atual + (+c.nivel || 1));
      if (document.getElementById("r_nl").checked) c.hp.contusao = 0;
      if (document.getElementById("r_ef").checked)
        c.ef = { armaduraArcana: false, escudoArcano: false, resistencia: false, furia: false };
      closeModal();
      touch();
      render();
      break;
    }
    case "clearused":
      Object.values(c.prep || {}).forEach((p) => {
        if (p.escola) p.escola.used = false;
        p.slots.forEach((s) => (s.used = false));
      });
      c.usados = {};
      touch();
      render();
      break;
    case "spcast": {
      c.usados = c.usados || {};
      const l = b.dataset.l,
        r = slotTable(c).find((x) => String(x.l) === l);
      if (r && (+c.usados[l] || 0) < r.normal) c.usados[l] = (+c.usados[l] || 0) + 1;
      touch();
      render();
      break;
    }
    case "spundo": {
      c.usados = c.usados || {};
      const l = b.dataset.l;
      c.usados[l] = Math.max(0, (+c.usados[l] || 0) - 1);
      touch();
      render();
      break;
    }
    case "uso": {
      c.usos = c.usos || {};
      const kk = b.dataset.k,
        f = classFeatures(c).R.find((x) => x.key === kk);
      if (!f) break;
      c.usos[kk] = clamp((+c.usos[kk] || 0) + +b.dataset.v, 0, f.max);
      touch();
      render();
      break;
    }
    case "pickclass": {
      const n = newCharOf(b.dataset.k);
      const nm = (document.getElementById("nc_nome") || {}).value;
      if (nm && nm.trim()) n.nome = nm.trim();
      state.chars[n.id] = n;
      state.active = n.id;
      touch(n.id);
      touch("__meta");
      closeModal();
      location.hash = "ficha";
      readHash();
      render();
      break;
    }
    case "addspell":
      addSpellModal(c);
      break;
    case "addcat": {
      const s = clone(CAT.find((x) => x.cid === b.dataset.id));
      const lk = (cls(c).magia || {}).lista || "mago";
      if (s.listas[lk] !== undefined) s.nivel = s.listas[lk];
      delete s.cid;
      delete s.listas;
      s.id = uidGen();
      c.grimorio.push(s);
      touch();
      render();
      addSpellModal(c);
      break;
    }
    case "addcustom": {
      const nome = document.getElementById("nm_nome").value.trim();
      if (!nome) {
        document.getElementById("nm_msg").textContent = "Dê um nome à magia.";
        return;
      }
      c.grimorio.push({
        id: uidGen(),
        nome,
        en: "",
        nivel: clamp(+document.getElementById("nm_nivel").value || 0, 0, 9),
        escola: document.getElementById("nm_escola").value,
        alcance: document.getElementById("nm_alc").value,
        duracao: document.getElementById("nm_dur").value,
        ts: document.getElementById("nm_ts").value,
        desc: document.getElementById("nm_desc").value,
        ataque: document.getElementById("nm_atk").value,
      });
      closeModal();
      touch();
      render();
      break;
    }
    case "delspell": {
      const id = b.dataset.id;
      c.grimorio = c.grimorio.filter((s) => s.id !== id);
      Object.values(c.prep).forEach((p) => {
        if (p.escola && p.escola.sid === id) p.escola = { sid: null, used: false };
        p.slots.forEach((s, i) => {
          if (s.sid === id) p.slots[i] = { sid: null, used: false };
        });
      });
      touch();
      render();
      break;
    }
    case "add": {
      const arr = getPath(c, b.dataset.p) || [];
      arr.push({});
      setPath(c, b.dataset.p, arr);
      touch();
      render();
      break;
    }
    case "rm": {
      const arr = getPath(c, b.dataset.p);
      arr.splice(+b.dataset.i, 1);
      touch();
      render();
      break;
    }
    case "srdfeat":
      featModal(c);
      break;
    case "srdequip":
      equipModal(c);
      break;
    case "addfeat":
      addFeat(c, +b.dataset.i);
      touch();
      render();
      b.disabled = true;
      b.textContent = "Adicionado";
      break;
    case "addequip":
    case "buyequip": {
      const msg = addEquip(c, +b.dataset.i, a === "buyequip");
      touch();
      render();
      const el = document.getElementById("srdmsg");
      if (el) {
        el.textContent = msg;
        el.style.color = /insuficiente/.test(msg) ? "var(--bad)" : "var(--good)";
      }
      break;
    }
    case "addweapon":
      c.ataques.push({
        nome: "Nova arma",
        tipo: "corpo",
        dado: "1d6",
        acertoOutros: 0,
        danoOutros: 0,
        critico: "x2",
        alcance: "—",
        obs: "",
      });
      touch();
      render();
      break;
    case "insp":
      c.inspiracao = Math.max(0, (+c.inspiracao || 0) + +b.dataset.v);
      touch();
      render();
      break;
    case "exportpdf":
      exportPdf(c);
      break;
    case "proib": {
      const cur_ = proibList(c),
        x = b.dataset.s;
      const nx = cur_.includes(x) ? cur_.filter((y) => y !== x) : cur_.concat([x]);
      c.proibidas = SCHOOLS.filter((y) => nx.includes(y)).join(", ");
      touch();
      render();
      break;
    }
    case "lang":
      setIdioma(b.dataset.l);
      render();
      break;
    case "theme":
      theme = b.dataset.t;
      try {
        localStorage.setItem("grimorio-tema", theme);
      } catch (e) {}
      applyTheme();
      render();
      break;
    case "ammo": {
      const w = c.ataques[+b.dataset.w],
        am = ammoFor(c, w);
      if (!am) break;
      let idx = am.idx;
      if (idx < 0) {
        const A = AMMO[am.kind];
        c.itens.push({ nome: A.nome, qtd: 0, peso: c.tamanho === "Pequeno" ? A.peso / 2 : A.peso, local: "Aljava" });
        idx = c.itens.length - 1;
      }
      c.itens[idx].qtd = Math.max(0, (+c.itens[idx].qtd || 0) + +b.dataset.v);
      touch();
      render();
      break;
    }
    case "dom": {
      const d = b.dataset.d,
        cur_ = domList(c);
      const nx = cur_.includes(d) ? cur_.filter((x) => x !== d) : cur_.concat([d]).slice(0, 2);
      c.dominios = nx.join(", ");
      syncDomainSpells(c);
      touch();
      render();
      break;
    }
    case "usehp":
      c.hp.max = +b.dataset.v;
      touch();
      render();
      break;
    case "newchar":
      newCharModal();
      break;
    case "dupchar": {
      const n = clone(c);
      n.id = uidGen();
      n.nome = c.nome + " (cópia nível " + c.nivel + ")";
      state.chars[n.id] = n;
      touch(n.id);
      render();
      setStatus("Cópia criada: escolha no seletor de personagem", "pend");
      break;
    }
    case "loadexamples": {
      const v = volis(1);
      for (const n of [v, ...testChars()]) {
        state.chars[n.id] = n;
        touch(n.id);
      }
      state.active = v.id;
      touch("__meta");
      render();
      break;
    }
    case "loadvolis": {
      const n = volis(1);
      state.chars[n.id] = n;
      state.active = n.id;
      touch(n.id);
      touch("__meta");
      render();
      break;
    }
    case "delchar":
      confirmModal(`Excluir ${c.nome} de vez? Faça um backup antes, se quiser guardar.`, "dodel");
      break;
    case "dodel": {
      const id = c.id;
      delete state.chars[id];
      touch(id);
      // Sem personagens, volta para a tela inicial.
      state.active = Object.keys(state.chars)[0] || null;
      touch("__meta");
      closeModal();
      render();
      break;
    }
    case "export": {
      const txt = JSON.stringify(c, null, 1);
      const m = document.getElementById("expmsg");
      try {
        await navigator.clipboard.writeText(txt);
        m.textContent = "Backup copiado.";
      } catch (err) {
        document.getElementById("impbox").value = txt;
        m.textContent = "Não deu para copiar: o backup foi posto na caixa abaixo para você copiar à mão.";
      }
      break;
    }
    case "import": {
      const m = document.getElementById("impmsg");
      try {
        const o = JSON.parse(document.getElementById("impbox").value);
        if (!o || typeof o !== "object" || !o.attr) throw 0;
        const n = Object.assign(blankChar(), o);
        n.id = uidGen();
        state.chars[n.id] = n;
        state.active = n.id;
        touch(n.id);
        touch("__meta");
        render();
      } catch (err) {
        m.textContent = "Esse texto não é um backup válido.";
      }
      break;
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
window.addEventListener("hashchange", () => {
  readHash();
  render();
  window.scrollTo(0, 0);
});
