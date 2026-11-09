/* ================= Eventos ================= */
import { clamp, clone, esc, uidGen } from "../util.js";
import { SCHOOLS } from "../regras/basicas.js";
import { CAT } from "../dados/catalogo.js";
import { classFeatures, cls } from "../regras/classes.js";
import { blankChar, volis } from "../personagens/modelos.js";
import { domList, syncDomainSpells } from "../regras/dominios.js";
import { testChars } from "../personagens/testes.js";
import { AMMO, ammoFor, proibList, slotTable, spell } from "../regras/calculos.js";
import { setStatus, state, touch } from "../armazenamento/armazenamento.js";
import { applyTheme, setTheme, theme } from "./tema.js";
import { setIdioma } from "./idioma.js";
import { convite, cur, getPath, irPara, readHash, setConvite, setPath } from "./estado.js";
import { entrarMesaModal, atualizarSelo } from "../telas/mesa-jogador.js";
import { entrarComGoogle, sairDaConta } from "../tempo-real/conta.js";
import { desligarConta, ligarConta } from "../armazenamento/nuvem-conta.js";
import { pecaATirar, setPapelPreferido, setPecaATirar } from "../telas/combate.js";
import {
  adicionarMonstros,
  encerrarCombate,
  iniciarCombate,
  definirValor,
  moverParticipante,
  ordenarCombate,
  mesaCombate,
  mudarPVMonstro,
  passarVez,
  reduzirImagem,
  removerToken,
  salvarConfig,
  salvarFundo,
} from "../tempo-real/combate.js";
import { entrarNaMesa, fecharMesa, mensagemDeErro, reconectar, sairDaMesa, tirarDaMesa } from "../tempo-real/mesa.js";
import { render } from "../telas/topo.js";
import {
  adicionarNaCampanha,
  backupModal,
  campanha,
  detalheMembro,
  locaisModal,
  membroARemover,
  salvarCampanha,
  setMembroARemover,
  topoMestre,
  abrirMesaDaCampanha,
  conviteDaCampanha,
} from "../telas/mestre.js";
import { exportPdf, setSHEET_BYTES } from "../pdf/exportar.js";
import {
  confirmarImportacao,
  importPdfModal,
  importacaoPdf,
  lerArquivoImportacao,
  revisaoImportacao,
} from "../pdf/importar.js";
import {
  addSpellModal,
  closeModal,
  confirmModal,
  filtrarCatalogo,
  modal,
  newCharModal,
  newCharOf,
  restModal,
  setBuscaMagia,
  spellInfo,
} from "./modais.js";
import { addEquip, addFeat, equipModal, featModal, filtrarSRD, setBuscaSRD, setFiltroEquip } from "./srd-escolha.js";

export function readVal(el) {
  if (el.type === "checkbox") return el.checked;
  if (el.type === "number") return el.value === "" ? 0 : +el.value;
  return el.value;
}
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "busca_srd") {
    setBuscaSRD(el.value);
    filtrarSRD();
    return;
  }
  if (el.id === "busca_magia") {
    setBuscaMagia(el.value);
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
    setFiltroEquip(el.value);
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
    reconectar(cur()).then(atualizarSelo);
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
  if (el.dataset.a === "campsel") {
    state.campanhaAtiva = el.value;
    touch("__meta");
    render();
    return;
  }
  if (el.dataset.a === "campord" && campanha()) {
    campanha().ordem = el.value;
    salvarCampanha(campanha());
    render();
    return;
  }
  if (el.dataset.a === "campren" && campanha()) {
    const n = el.value.trim();
    if (n) {
      campanha().nome = n;
      salvarCampanha(campanha());
      topoMestre();
    }
    return;
  }
  if (el.dataset.a === "cbvalor") {
    definirValor(el.dataset.id, el.value).catch((err) => modal_erro(mensagemDeErro(err), "Não foi possível concluir"));
    return;
  }
  if (el.dataset.a === "cbfundo" && el.files && el.files[0]) {
    const msg = document.getElementById("cbc_msg");
    msg.textContent = "Reduzindo e enviando a imagem…";
    reduzirImagem(el.files[0])
      .then(async (img) => {
        // Mantém os quadrados quadrados: as linhas acompanham a proporção da imagem
        const colunas = mesaCombate.config.colunas;
        await salvarConfig({ colunas, linhas: Math.max(5, Math.round((colunas * img.altura) / img.largura)) });
        await salvarFundo(img.dados);
        // O painel pode ter sido redesenhado com a imagem nova: busca a mensagem de novo
        const m = document.getElementById("cbc_msg");
        if (m) m.textContent = `Imagem enviada (${Math.round(img.dados.length / 1024)} KB).`;
      })
      .catch((err) => {
        const m = document.getElementById("cbc_msg");
        if (m) m.textContent = err.message;
      });
    return;
  }
  if (el.dataset.a === "pdfimport" && el.files && el.files[0]) {
    lerArquivoImportacao(el.files[0]);
    return;
  }
  if (el.dataset.a === "impcls" && importacaoPdf) {
    importacaoPdf.escolha.classeKey = el.value;
    revisaoImportacao();
    return;
  }
  if (el.dataset.a === "impnivel" && importacaoPdf) {
    importacaoPdf.escolha.nivel = clamp(+el.value || 1, 1, 20);
    revisaoImportacao();
    return;
  }
  if (el.dataset.a === "sheetfile" && el.files && el.files[0]) {
    el.files[0].arrayBuffer().then((b) => {
      setSHEET_BYTES(b);
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
/* Erros dos cliques (por exemplo, o banco da mesa recusando uma gravação) viram uma janela
   explicando o problema, em vez de o botão simplesmente não fazer nada. */
document.addEventListener("click", (e) =>
  aoClicar(e).catch((err) => modal_erro(mensagemDeErro(err), "Não foi possível concluir"))
);
async function aoClicar(e) {
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
      setTheme(b.dataset.t);
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
    case "importpdf":
      importPdfModal();
      break;
    /* ----- Conta Google ----- */
    case "contaentrar": {
      const u = await entrarComGoogle().catch((err) => {
        modal_erro(err.message, "Não foi possível entrar com o Google");
        return null;
      });
      if (!u) break;
      await ligarConta(u);
      // O uid pode ter mudado: volta para a mesa com a identidade nova
      reconectar(cur(), true).then(atualizarSelo);
      break;
    }
    case "contasair":
      confirmModal(
        "Sair da conta Google? As fichas continuam neste aparelho, mas deixam de ser salvas na conta e de aparecer nos outros aparelhos.",
        "contasairok"
      );
      break;
    case "contasairok":
      closeModal();
      desligarConta();
      await sairDaConta();
      render();
      reconectar(cur(), true).then(atualizarSelo);
      break;
    /* ----- Mesa de combate ----- */
    case "abrircombate":
      setPapelPreferido(b.dataset.p);
      location.hash = "combate";
      break;
    case "cbrolar":
      await iniciarCombate();
      break;
    case "cbsubir":
    case "cbdescer":
      await moverParticipante(b.dataset.id, a === "cbsubir" ? -1 : 1);
      break;
    case "cbordenar":
      await ordenarCombate();
      break;
    case "cbproximo":
      await passarVez(1);
      break;
    case "cbanterior":
      await passarVez(-1);
      break;
    case "cbencerrar":
      await encerrarCombate();
      break;
    case "cbaddmonstro": {
      const v = (id) => document.getElementById(id).value;
      const nome = v("cbm_nome").trim();
      const msg = document.getElementById("cbm_msg");
      if (!nome) {
        msg.textContent = "Dê um nome ao monstro.";
        break;
      }
      msg.textContent = "";
      await adicionarMonstros({
        nome,
        pv: Math.max(1, +v("cbm_pv") || 1),
        ca: +v("cbm_ca") || 10,
        ini: 0,
        quantidade: clamp(+v("cbm_qtd") || 1, 1, 20),
      });
      document.getElementById("cbm_nome").value = "";
      break;
    }
    case "cbdano":
    case "cbcura": {
      const valor = Math.max(0, +document.getElementById("cbm_valor").value || 0);
      await mudarPVMonstro(b.dataset.id, a === "cbdano" ? -valor : valor);
      break;
    }
    case "cbremover":
      await removerToken(b.dataset.id);
      break;
    case "cbtirar": {
      // Personagem de jogador: sai da mesa (ficha, peça e conexão do jogador)
      const t = mesaCombate.tokens[b.dataset.id];
      if (t)
        confirmModal(
          `Tirar ${t.nome} da mesa? O jogador é desconectado e a peça sai do mapa. A ficha dele não é afetada.`,
          "cbtirarok"
        );
      setPecaATirar(b.dataset.id);
      break;
    }
    case "cbtirarok": {
      const t = mesaCombate.tokens[pecaATirar];
      closeModal();
      if (!t) break;
      await removerToken(pecaATirar);
      if (t.ficha) await tirarDaMesa(mesaCombate.codigo, t.ficha);
      break;
    }
    case "cbcfg":
      await salvarConfig({
        colunas: clamp(+document.getElementById("cbc_col").value || 20, 5, 60),
        linhas: clamp(+document.getElementById("cbc_lin").value || 14, 5, 60),
      });
      break;
    case "cblink": {
      const link = document.getElementById("cbc_link").value.trim();
      if (/^https?:\/\//.test(link)) await salvarFundo(link);
      else document.getElementById("cbc_msg").textContent = "Cole um link que comece com https://";
      break;
    }
    case "cblimpar":
      await salvarFundo(null);
      break;
    /* ----- Mesa online: jogador ----- */
    case "mesaentrar":
      entrarMesaModal(c);
      break;
    case "mesaentrarok": {
      const msg = document.getElementById("mesa_msg");
      const codigo = document.getElementById("mesa_cod").value;
      b.disabled = true;
      msg.style.color = "";
      msg.textContent = "Conectando…";
      try {
        await entrarNaMesa(codigo, c);
        closeModal();
        render();
      } catch (err) {
        msg.style.color = "var(--bad)";
        msg.textContent = err.message;
        b.disabled = false;
      }
      break;
    }
    case "mesareconectar":
      reconectar(c).then(atualizarSelo);
      break;
    case "mesasair":
      confirmModal(`Sair da mesa ${c.mesa.codigo}? O mestre deixa de receber as mudanças desta ficha.`, "mesasairok");
      break;
    case "mesasairok":
      closeModal();
      await sairDaMesa(c);
      render();
      break;
    /* ----- Mesa online: mestre ----- */
    case "mesaabrir": {
      const g = campanha();
      b.disabled = true;
      try {
        await abrirMesaDaCampanha(g);
      } catch (err) {
        b.disabled = false;
        modal_erro(mensagemDeErro(err));
        break;
      }
      render();
      break;
    }
    case "mesacopiar": {
      const link = conviteDaCampanha(campanha());
      const m = document.getElementById("mesa_cp");
      try {
        await navigator.clipboard.writeText(link);
        m.textContent = "Link copiado. Mande para os jogadores: " + link;
      } catch (err) {
        m.textContent = "Copie e mande para os jogadores: " + link;
      }
      break;
    }
    case "mesafechar":
      confirmModal(
        "Fechar a mesa online? Os jogadores saem da mesa e os cards deixam de se atualizar (a última versão de cada ficha continua na campanha).",
        "mesafecharok"
      );
      break;
    case "mesafecharok": {
      const g = campanha();
      closeModal();
      await fecharMesa(g);
      g.membros.forEach((m) => delete m.uid);
      salvarCampanha(g);
      render();
      break;
    }
    /* ----- Hub do mestre ----- */
    case "campcriar":
    case "campnova": {
      if (a === "campnova") {
        state.campanhaAtiva = null;
        render();
        break;
      }
      const nome = (document.getElementById("camp_nome") || {}).value || "";
      if (!nome.trim()) {
        document.getElementById("camp_msg").textContent = "Dê um nome à campanha.";
        break;
      }
      const g = { id: uidGen(), nome: nome.trim(), criada: new Date().toISOString(), ordem: "chegada", membros: [] };
      state.campanhas[g.id] = g;
      state.campanhaAtiva = g.id;
      salvarCampanha(g);
      render();
      break;
    }
    case "campvoltar":
      state.campanhaAtiva = Object.keys(state.campanhas)[0] || null;
      render();
      break;
    case "campexcluir":
      confirmModal(
        `Excluir a campanha “${campanha().nome}” e os ${campanha().membros.length} cards dela? As fichas dos jogadores não são afetadas.`,
        "campexcluirok"
      );
      break;
    case "campexcluirok": {
      const id = state.campanhaAtiva;
      delete state.campanhas[id];
      touch("g:" + id);
      state.campanhaAtiva = Object.keys(state.campanhas)[0] || null;
      touch("__meta");
      closeModal();
      render();
      break;
    }
    case "mimportpdf":
      importPdfModal("campanha");
      break;
    case "mbackup":
      backupModal();
      break;
    case "mbackupok": {
      const msg = document.getElementById("mbkmsg");
      try {
        const o = JSON.parse(document.getElementById("mbk").value);
        if (!o || typeof o !== "object" || !o.attr) throw 0;
        const r = adicionarNaCampanha(o, "backup");
        msg.style.color = "var(--good)";
        msg.textContent = `${o.nome || "Personagem"} ${r === "atualizado" ? "atualizado" : "adicionado"}. Cole outro backup ou feche.`;
        document.getElementById("mbk").value = "";
        render();
      } catch (err) {
        msg.style.color = "var(--bad)";
        msg.textContent = "Esse texto não é um backup válido do Códex.";
      }
      break;
    }
    case "mlocais":
      locaisModal();
      break;
    case "mlocaisok": {
      document.querySelectorAll(".mloc:checked").forEach((x) => adicionarNaCampanha(state.chars[x.value], "local"));
      closeModal();
      render();
      break;
    }
    case "mdetalhe":
      detalheMembro(b.dataset.m);
      break;
    case "mremover": {
      const m = campanha().membros.find((x) => x.mid === b.dataset.m);
      const naMesa = m && m.uid && m.origem === "mesa" && campanha().mesa;
      if (m)
        confirmModal(
          `Tirar ${m.c.nome} da campanha? ${naMesa ? "O personagem também sai da mesa online e o jogador é desconectado. " : ""}A ficha do jogador não é afetada.`,
          "mremoverok"
        );
      setMembroARemover(b.dataset.m);
      break;
    }
    case "mremoverok": {
      const g = campanha();
      const m = g.membros.find((x) => x.mid === membroARemover);
      // Personagem que veio pela mesa: também sai da mesa (o jogador é desconectado)
      if (m && m.uid && g.mesa && m.origem === "mesa") await tirarDaMesa(g.mesa.codigo, m.uid);
      g.membros = g.membros.filter((x) => x.mid !== membroARemover);
      salvarCampanha(g);
      closeModal();
      render();
      break;
    }
    case "impconfirmar":
      confirmarImportacao();
      break;
    case "loadexamples": {
      const v = volis(1);
      for (const n of [v, ...testChars()]) {
        state.chars[n.id] = n;
        touch(n.id);
      }
      state.active = v.id;
      touch("__meta");
      irPara("painel");
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
      // Personagem numa mesa: sai dela antes, para o card e a peça sumirem para o mestre
      if (c.mesa) sairDaMesa(c, false);
      delete state.chars[id];
      touch(id);
      // Vai para o painel do próximo personagem; sem nenhum, mostra a tela inicial.
      state.active = Object.keys(state.chars)[0] || null;
      touch("__meta");
      closeModal();
      irPara("painel");
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
        irPara("painel");
        render();
      } catch (err) {
        m.textContent = "Esse texto não é um backup válido.";
      }
      break;
    }
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
window.addEventListener("hashchange", () => {
  readHash();
  render();
  window.scrollTo(0, 0);
  abrirConvitePendente();
});

/** Link de convite (#entrar=CÓDIGO): abre a janela de entrar na mesa já com o código. */
export function abrirConvitePendente() {
  if (!convite) return;
  const codigo = convite;
  setConvite(null);
  entrarMesaModal(cur(), codigo);
}

/** Janela de aviso de erro, com um botão só. */
function modal_erro(texto, titulo = "Não foi possível abrir a mesa") {
  console.error(texto);
  modal(
    `<h2 style="font-size:18px;color:var(--ink)">${esc(titulo)}</h2><p style="margin:0;line-height:1.5">${esc(texto)}</p><div class="row"><button class="btn pri" data-a="close">Entendi</button></div>`
  );
}
