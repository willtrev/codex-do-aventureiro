/* ================= Importar ficha em PDF =================
   Lê a ficha editável de 4 páginas (o mesmo modelo usado em Exportar PDF),
   monta um personagem e lista o que não deu para trazer.

   Fluxo:
     1. lerPdfFicha(bytes)      → campos brutos do formulário { untitled7: "Volis", ... }
     2. montarDoPdf(F, classe)  → { c, avisos, resumo } (pode rodar de novo ao trocar a classe)
     3. modal de revisão        → a pessoa confere e confirma

   Os números dos campos são os mesmos de js/pdf/exportar.js (SHEET_ROWS, SPEC_FIELD...). */

/* ---------- Leitura do PDF ---------- */

async function lerPdfFicha(bytes) {
  const PDFLib = await loadPdfLib();
  let pdf;
  try {
    pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (e) {
    throw new Error("Não foi possível abrir o arquivo. Confira se é um PDF válido.");
  }
  let campos = [];
  try {
    campos = pdf.getForm().getFields();
  } catch (e) {}
  if (!campos.length)
    throw new Error(
      "Este PDF não tem campos editáveis. Pode ser uma ficha impressa e escaneada, ou um PDF “achatado” ao salvar. Use a ficha editável preenchida."
    );
  const F = {};
  for (const f of campos) {
    const n = f.getName();
    try {
      if (typeof f.getText === "function") F[n] = f.getText() || "";
      else if (typeof f.isChecked === "function") F[n] = f.isChecked();
      else if (typeof f.getSelected === "function") F[n] = (f.getSelected() || []).join(", ");
    } catch (e) {}
  }
  const daFicha = Object.keys(F).filter((k) => /^untitled\d+$/.test(k)).length;
  if (daFicha < 300)
    throw new Error(
      "Este PDF não parece ser a ficha de personagem de 4 páginas do D&D 3.5: os campos do formulário não batem com o modelo."
    );
  const preenchidos = [7, 8, 9, 13, 15, 17, 19, 21, 23].filter((n) => F["untitled" + n]);
  if (!preenchidos.length)
    throw new Error("A ficha está em branco: não há nome, classe, raça nem atributos preenchidos.");
  return F;
}

/* ---------- Conversões de texto ---------- */

const normTxt = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
/** "+2" → 2; "−1" → -1; "2,5" → 2.5; "" ou texto → NaN. */
function numPdf(s) {
  const t = String(s ?? "")
    .replace(/[−–—]/g, "-")
    .replace(/\s/g, "");
  const m = t.match(/^[+-]?\d+(?:[.,]\d+)?/);
  return m ? +m[0].replace(",", ".") : NaN;
}
/** "1.000" ou "1,000" → 1000 (XP). */
const inteiroPdf = (s) => {
  const t = String(s ?? "").replace(/[.,\s]/g, "");
  return /^\d+$/.test(t) ? +t : NaN;
};
/** Peso total: "1,5 kg" → 1.5; "3 lb." → 1.5; "—" → 0. Sem unidade, assume kg. */
function pesoPdf(s) {
  const n = numPdf(String(s ?? "").replace(/^[^\d+-]+/, ""));
  if (isNaN(n)) return 0;
  return /lb|libra/i.test(s) ? n / 2 : n;
}
/** Distâncias em pés viram metros; o resto fica como está. */
const distanciaPdf = (s) => (/\d\s*(ft|p[ée]s|')/i.test(s) ? trAlcance(String(s).replace(/'/g, " ft.")) : s);

function classeDoTexto(t) {
  const alias = [
    [/^barb/, "barbaro"],
    [/^bard|^brd/, "bardo"],
    [/^cler|^cleric|^clr/, "clerigo"],
    [/^drui|^drd/, "druida"],
    [/^guer|^fight|^ftr|^lutad/, "guerreiro"],
    [/^mon/, "monge"],
    [/^pal/, "paladino"],
    [/^rang|^rgr|^patrul/, "ranger"],
    [/^lad|^rog|^ladr/, "ladino"],
    [/^feit|^sorc|^sor\b/, "feiticeiro"],
    [/^mag|^wiz/, "mago"],
  ];
  const partes = String(t || "")
    .split(/[\/;,+&]| e | and /i)
    .map((p) => p.trim())
    .filter(Boolean);
  const achadas = [];
  for (const p of partes) {
    const m = p.match(/^(.*?)\s*(\d+)?(?:º|o|°)?\s*(?:n[ií]vel)?$/i);
    const nome = normTxt(m ? m[1] : p);
    const k = (alias.find(([re]) => re.test(nome)) || [])[1];
    if (k) achadas.push({ k, nivel: m && m[2] ? +m[2] : NaN, texto: p });
  }
  return achadas;
}
function tendenciaDoTexto(t) {
  const n = normTxt(t);
  if (!n) return "";
  const direto = ALIGNS.find(([k, nome]) => normTxt(nome) === n || k.toLowerCase() === n);
  if (direto) return direto[1];
  if (/^(true )?neutr(o|al)$|^nn$|^tn$/.test(n)) return "Neutro";
  const lei = /leal|lawful|^l/.test(n) ? "L" : /caot|chaotic|^c/.test(n) ? "C" : /neutr|^n/.test(n) ? "N" : "";
  const bem = /bom|good|bondoso|\bg$|b$/.test(n)
    ? "B"
    : /mau|mal|evil|\be$|m$/.test(n)
      ? "M"
      : /neutr|n$/.test(n)
        ? "N"
        : "";
  const cod = lei + bem === "NN" ? "N" : lei + bem;
  const f = ALIGNS.find(([k]) => k === cod);
  return f ? f[1] : "";
}
function tamanhoDoTexto(t) {
  const n = normTxt(t);
  if (/^(medio|medium|m)$/.test(n)) return "Médio";
  if (/^(pequeno|small|p|s)$/.test(n)) return "Pequeno";
  if (/^(grande|large|g|l)$/.test(n)) return "Grande";
  return "";
}
const KN_EN = {
  arcana: "c_arcano",
  "architecture and engineering": "c_arq",
  engineering: "c_arq",
  arquitetura: "c_arq",
  "arquitetura e engenharia": "c_arq",
  dungeoneering: "c_masm",
  geography: "c_geo",
  history: "c_hist",
  nature: "c_nat",
  "nobility and royalty": "c_nob",
  nobility: "c_nob",
  "nobreza e realeza": "c_nob",
  religion: "c_rel",
  "the planes": "c_planos",
  planes: "c_planos",
  "os planos": "c_planos",
};
function conhecimentoDoTexto(t) {
  const n = normTxt(
    String(t || "")
      .replace(/^(conhecimento|knowledge)\s*/i, "")
      .replace(/[()]/g, "")
  );
  if (!n) return null;
  const k = Object.keys(KN_SHORT).find((x) => normTxt(KN_SHORT[x]) === n);
  return k || KN_EN[n] || null;
}
function escolaDoTexto(t) {
  const n = normTxt(t);
  if (!n) return "";
  const pt = SCHOOLS.find((s) => n.startsWith(normTxt(s)) || normTxt(s) === n);
  if (pt) return pt;
  const en = Object.keys(TR_ESCOLAS).find((s) => n.startsWith(normTxt(s)));
  return en ? TR_ESCOLAS[en] : "";
}
function dominioDoTexto(t) {
  const n = normTxt(t);
  const pt = Object.keys(DOMAINS).find((d) => normTxt(d) === n);
  if (pt) return pt;
  const en = Object.keys(TR_DOMINIOS).find((d) => normTxt(d) === n);
  return en && DOMAINS[TR_DOMINIOS[en]] ? TR_DOMINIOS[en] : "";
}
/** Procura uma magia do catálogo pelo nome em português ou inglês. */
function magiaDoNome(nome) {
  const n = normTxt(nome);
  if (!n) return null;
  const k = CAT.find((s) => normTxt(s.nome) === n || normTxt(s.en) === n);
  if (k) return k;
  return magiaPorNomeSRD(nome);
}
function talentoDoNome(nome) {
  const n = normTxt(String(nome).replace(/\s*\(.*\)$/, ""));
  return TALENTOS_SRD.find((t) => normTxt(t.nome) === n || normTxt(t.en) === n) || null;
}
const listaPt = (xs) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);

/* ---------- Montagem do personagem ---------- */

/**
 * Monta o personagem a partir dos campos do PDF.
 * @param F campos lidos por lerPdfFicha
 * @param escolha { classeKey, nivel } escolhidos na revisão (opcional)
 */
function montarDoPdf(F, escolha) {
  const v = (n) => String(F["untitled" + n] ?? "").trim();
  const avisos = []; // { titulo, texto } — o que não entrou ou precisa de conferência
  const difs = []; // valores calculados que ficaram diferentes do PDF
  const notasExtras = [];
  const resumo = [];
  const c = blankChar();
  c.idiomas = "";

  // Identidade e classe
  const classes = classeDoTexto(v(8));
  const principal = classes.slice().sort((a, b) => (b.nivel || 0) - (a.nivel || 0))[0];
  let nivel = principal && principal.nivel ? principal.nivel : numPdf(v(585));
  if (escolha && escolha.nivel) nivel = escolha.nivel;
  c.classeKey = (escolha && escolha.classeKey) || (principal ? principal.k : "");
  c.classe = c.classeKey ? CLASSES[c.classeKey].nome : "";
  c.nivel = clamp(isNaN(nivel) ? 1 : nivel, 1, 20);
  if (classes.length > 1)
    avisos.push({
      titulo: "Multiclasse",
      texto: `A ficha tem ${listaPt(classes.map((x) => x.texto))}. O Códex trabalha com uma classe por personagem, então usamos ${CLASSES[c.classeKey || principal.k].nome} ${c.nivel}. Os níveis das outras classes ficaram de fora.`,
    });
  else if (!principal && v(8))
    avisos.push({ titulo: "Classe", texto: `Não reconhecemos a classe “${v(8)}”. Escolha a classe acima.` });

  c.nome = v(7) || "Personagem importado";
  if (!v(7))
    avisos.push({
      titulo: "Nome",
      texto: "O PDF não tinha nome de personagem. Usamos “Personagem importado”; troque na aba Ficha.",
    });
  c.jogador = v(1);
  c.raca = v(9);
  c.divindade = v(3);
  c.idade = v(5);
  c.sexo = v(6);
  c.altura = v(10);
  c.peso = v(11);
  if (v(2)) {
    c.tendencia = tendenciaDoTexto(v(2));
    if (!c.tendencia) {
      c.tendencia = v(2);
      avisos.push({ titulo: "Tendência", texto: `Não reconhecemos “${v(2)}”. Escolha a tendência na aba Ficha.` });
    }
  }
  if (v(4)) {
    c.tamanho = tamanhoDoTexto(v(4)) || "Médio";
    if (!tamanhoDoTexto(v(4)))
      avisos.push({ titulo: "Tamanho", texto: `“${v(4)}” não é um tamanho do Códex. Usamos Médio.` });
  }

  // Atributos
  const ruins = [];
  [
    ["for", 13, "Força"],
    ["des", 15, "Destreza"],
    ["con", 17, "Constituição"],
    ["int", 19, "Inteligência"],
    ["sab", 21, "Sabedoria"],
    ["car", 23, "Carisma"],
  ].forEach(([k, n, nome]) => {
    const x = numPdf(v(n));
    if (!isNaN(x)) c.attr[k] = x;
    else ruins.push(nome);
  });
  if (ruins.length)
    avisos.push({
      titulo: "Atributos",
      texto: `${listaPt(ruins)} ${ruins.length > 1 ? "estavam vazios ou ilegíveis e ficaram" : "estava vazio ou ilegível e ficou"} com 10. Ajuste na aba Ficha.`,
    });
  else resumo.push("atributos");

  // PV, CA, deslocamento e bônus diversos
  const pvMax = numPdf(v(47));
  if (!isNaN(pvMax)) {
    c.hp.max = pvMax;
    const at_ = numPdf(v(49));
    c.hp.atual = isNaN(at_) ? pvMax : at_;
  } else if (c.classeKey) {
    c.hp.max = c.hp.atual = hpSuggest(c);
    avisos.push({
      titulo: "Pontos de vida",
      texto: `O PDF não tinha PV máximos. Usamos ${c.hp.max}, a média alta da classe.`,
    });
  }
  c.hp.contusao = numPdf(v(48)) || 0;
  [
    ["armadura", 37],
    ["escudo", 38],
    ["natural", 41],
    ["deflexao", 42],
    ["outros", 43],
  ].forEach(([k, n]) => (c.ca[k] = numPdf(v(n)) || 0));
  c.outros.init = numPdf(v(53)) || 0;
  c.outros.fort = (numPdf(v(66)) || 0) + (numPdf(v(63)) || 0);
  c.outros.ref = (numPdf(v(67)) || 0) + (numPdf(v(64)) || 0);
  c.outros.von = (numPdf(v(68)) || 0) + (numPdf(v(65)) || 0);
  c.outros.agarrar = numPdf(v(81)) || 0;
  if (v(82)) c.deslocamento = distanciaPdf(v(82));
  // Humanos ganham 4 pontos de perícia no 1º nível e 1 por nível depois
  if (/humano|human/i.test(c.raca)) c.pontosExtras = 4 + (c.nivel - 1);
  c.resistCond = [72, 73, 74].map(v).filter(Boolean).join("; ");
  const xp = inteiroPdf(v(582));
  if (!isNaN(xp)) c.xp = xp;

  // Perícias (primeiro as graduações; "outros" depois, porque a sinergia depende de todas)
  const miscPorPericia = {};
  const periciasPerdidas = [];
  const usar = (k, grad, misc, spec) => {
    const atual = c.pericias[k] || {};
    if (atual.grad && atual.grad >= grad) return false;
    c.pericias[k] = { ...atual, grad };
    if (spec) c.pericias[k].spec = spec;
    if (!isNaN(misc)) miscPorPericia[k] = misc;
    return true;
  };
  const EXTRA_DE = { 6: "atuacao", 7: "atuacao", 32: "oficios", 33: "oficios", 39: "profissao" };
  let kRow = 0;
  SHEET_ROWS.forEach((key, idx) => {
    const n = idx + 1;
    const ids = n === 1 ? [133, 134, 135, 136] : [135 + n, 180 + n, 225 + n, 270 + n];
    const grad = numPdf(v(ids[2]));
    const misc = numPdf(v(ids[3]));
    if (!(grad > 0)) return;
    let k = key,
      spec = SPEC_FIELD[n] ? v(SPEC_FIELD[n]) : "";
    if (key === "K") {
      kRow++;
      k = conhecimentoDoTexto(spec);
      spec = "";
      if (!k) {
        periciasPerdidas.push(
          `Conhecimento${v(SPEC_FIELD[n]) ? " (" + v(SPEC_FIELD[n]) + ")" : " sem tipo"} com ${grad} graduações`
        );
        return;
      }
    } else if (key === "X") {
      const nome = v(n === 45 ? 330 : 331);
      k = conhecimentoDoTexto(nome);
      if (!k) {
        periciasPerdidas.push(`${nome || "perícia sem nome"} com ${grad} graduações`);
        return;
      }
    } else if (!key) {
      k = EXTRA_DE[n];
      if (!k) return;
      if (c.pericias[k] && c.pericias[k].grad) {
        periciasPerdidas.push(
          `${SK[k].nome} (${spec || "sem especialização"}) com ${grad} graduações: o Códex guarda só uma especialização`
        );
        return;
      }
    }
    if (!SK[k]) return;
    if (!usar(k, grad, misc, spec) && (k === "atuacao" || k === "oficios" || k === "profissao"))
      periciasPerdidas.push(
        `${SK[k].nome} (${spec || "sem especialização"}) com ${grad} graduações: o Códex guarda só uma especialização`
      );
  });
  for (const [k, misc] of Object.entries(miscPorPericia)) {
    const syn = skill(c, k).syn.length * 2;
    if (misc - syn) c.pericias[k].outros = misc - syn;
  }
  const nPer = Object.keys(c.pericias).length;
  if (nPer) resumo.push(`${nPer} perícia${nPer > 1 ? "s" : ""}`);
  if (periciasPerdidas.length)
    avisos.push({
      titulo: "Perícias",
      texto: `Não entraram: ${listaPt(periciasPerdidas)}. Adicione à mão na aba Perícias, se fizer sentido.`,
    });

  // Ataques
  const AT = [
    [83, 84, 85, 86, 87, 88, 89],
    [92, 93, 94, 95, 96, 97, 98],
    [103, 104, 105, 106, 107, 108, 109],
    [112, 113, 114, 115, 116, 117, 118],
    [121, 122, 123, 124, 125, 126, 127],
  ];
  const ataquesPdf = [];
  for (const f of AT) {
    const nome = v(f[0]);
    if (!nome) continue;
    const tipoTxt = normTxt(v(f[5]));
    const nn = normTxt(nome);
    const tipo = /arrem|thrown|lanc/.test(tipoTxt + " " + nn)
      ? "arremesso"
      : /dist|rang|arco|besta|bow|funda|sling|crossbow/.test(tipoTxt + " " + nn)
        ? "distancia"
        : "corpo";
    const danoTxt = v(f[2]).replace(/[−–]/g, "-").replace(/\s/g, "");
    const dado = (danoTxt.match(/\d*d\d+/i) || [""])[0] || "1d6";
    const modDano = numPdf((danoTxt.replace(/^\d*d\d+/i, "").match(/^[+-]\d+/) || ["0"])[0]) || 0;
    ataquesPdf.push({
      w: {
        nome,
        tipo,
        dado,
        acertoOutros: 0,
        danoOutros: 0,
        critico: v(f[3]) || "x2",
        alcance: v(f[4]) ? distanciaPdf(v(f[4])) : "—",
        obs: v(f[6]),
      },
      acerto: numPdf(v(f[1]).split("/")[0]),
      modDano,
    });
  }

  // Equipamento
  const slots = [];
  for (let k = 0; k < 14; k++) slots.push([334 + 4 * k, 335 + 4 * k, 337 + 4 * k]);
  for (let j = 0; j < 4; j++) slots.push([390 + 4 * j, 391 + 4 * j, 393 + 4 * j]);
  for (let j = 0; j < 9; j++) slots.push([406 + j, 415 + j, 433 + j]);
  for (const [a, b, p] of slots) {
    const txt = v(a);
    if (!txt) continue;
    const m = txt.match(/^(.*?)\s*\((\d+)\)$/);
    const nome = m ? m[1] : txt;
    const qtd = m ? +m[2] : 1;
    const total = pesoPdf(v(p));
    c.itens.push({ nome, qtd, peso: Math.round((total / qtd) * 1000) / 1000, local: v(b) });
  }
  if (c.itens.length) resumo.push(`${c.itens.length} ite${c.itens.length > 1 ? "ns" : "m"}`);
  c.idiomas = [480, 481, 482, 483, 484, 485, 486, 487, 488].map(v).filter(Boolean).join(", ");
  c.dinheiro = { pc: numPdf(v(464)) || 0, pp: numPdf(v(465)) || 0, po: numPdf(v(466)) || 0, pl: numPdf(v(467)) || 0 };

  // Talentos
  const TF = [
    [489, 491],
    [492, 494],
    [496, 497],
    [498, 500],
    [501, 503],
    [504, 506],
    [507, 509],
    [510, 512],
    [513, 515],
    [516, 518],
    [519, 521],
    [522, 524],
  ];
  for (const [a, b] of TF) {
    if (!v(a)) continue;
    const srd = talentoDoNome(v(a));
    c.talentos.push({ nome: v(a), en: srd ? srd.en : "", obs: v(b) || (srd ? srd.srd.beneficio || "" : "") });
  }
  if (c.talentos.length) resumo.push(`${c.talentos.length} talento${c.talentos.length > 1 ? "s" : ""}`);

  // Escola, domínios e escolas proibidas
  const esp = v(566);
  if (c.classeKey === "mago" && esp) {
    c.escola = escolaDoTexto(esp.split(":")[0]) || escolaDoTexto(esp);
    if (!c.escola)
      avisos.push({ titulo: "Escola", texto: `Não reconhecemos a especialização “${esp}”. Escolha na aba Magias.` });
    c.cdEscola = numPdf((v(567).match(/\+\s*\d+/) || [""])[0]) || 0;
    c.proibidas = [568, 569]
      .map((n) => escolaDoTexto(v(n)))
      .filter(Boolean)
      .join(", ");
  }
  if (c.classeKey === "clerigo") {
    const doms = esp
      .replace(/^(dom[ií]nios?|domains?)\s*:\s*/i, "")
      .split(/,| e | and /)
      .map(dominioDoTexto)
      .filter(Boolean);
    c.dominios = doms.slice(0, 2).join(", ");
    if (doms.length < 2)
      avisos.push({
        titulo: "Domínios",
        texto: "Não encontramos os 2 domínios do clérigo no PDF. Escolha na aba Magias.",
      });
  }

  // Magias e observações (linhas 570–581)
  const conhecidas = {},
    preparadas = {};
  let modo = null,
    nivelAtual = null,
    cortada = false;
  const nomes = (t) =>
    t
      .split(",")
      .map((x) => x.trim().replace(/\.$/, ""))
      .filter(Boolean);
  for (let i = 570; i <= 581; i++) {
    const bruto = String(F["untitled" + i] ?? "");
    const ln = bruto.trim();
    if (!ln) continue;
    let m;
    // Depois de "PREPARADAS", "Truques:" e "1º:" são as magias preparadas, não as conhecidas
    if (/^preparadas|^prepared/i.test(ln)) modo = "p";
    else if (modo === "p" && (m = ln.match(/^(truques|cantrips|orisons|(\d)\s*º?)\s*:\s*(.*)$/i))) {
      nivelAtual = m[2] ? +m[2] : 0;
      (preparadas[nivelAtual] = preparadas[nivelAtual] || []).push(...nomes(m[3]));
    } else if (
      (m = ln.match(
        /^(truques|cantrips|orisons|(\d)\s*º?\s*n[ií]vel|n[ií]vel\s*(\d)|(\d)(?:st|nd|rd|th)?\s*level)\s*:\s*(.*)$/i
      ))
    ) {
      modo = "c";
      nivelAtual = m[2] || m[3] || m[4] ? +(m[2] || m[3] || m[4]) : 0;
      (conhecidas[nivelAtual] = conhecidas[nivelAtual] || []).push(...nomes(m[5]));
    } else if ((m = ln.match(/^inspira[cç][aã]o\s*:\s*(\d+)/i))) c.inspiracao = +m[1];
    else if (/lista completa/i.test(ln)) cortada = true;
    // Continuação da linha anterior: começa com espaço (como na exportação) ou é uma lista com vírgulas
    else if (modo && nivelAtual !== null && (/^\s/.test(bruto) || (ln.includes(",") && !ln.includes(":")))) {
      const alvo = modo === "c" ? conhecidas : preparadas;
      (alvo[nivelAtual] = alvo[nivelAtual] || []).push(...nomes(ln));
    } else notasExtras.push(ln);
  }
  const semSRD = [];
  let nMag = 0;
  for (const [l, ns] of Object.entries(conhecidas))
    for (const nome of ns) {
      const k = magiaDoNome(nome);
      let s;
      if (k) {
        s = clone(k);
        delete s.cid;
        delete s.listas;
      } else {
        s = { nome, en: "", escola: "", alcance: "", duracao: "", ts: "", desc: "", ataque: "" };
        semSRD.push(nome);
      }
      s.id = uidGen();
      s.nivel = +l;
      if (!c.grimorio.some((x) => x.nome === s.nome)) {
        c.grimorio.push(s);
        nMag++;
      }
    }
  if (nMag) resumo.push(`${nMag} magia${nMag > 1 ? "s" : ""}`);
  if (semSRD.length)
    avisos.push({
      titulo: "Magias fora do SRD",
      texto: `Não encontramos ${listaPt(semSRD.map((x) => "“" + x + "”"))} no SRD. ${semSRD.length > 1 ? "Elas entraram" : "Ela entrou"} no grimório como magia personalizada, sem descrição, alcance nem teste de resistência: complete pelo botão Info.`,
    });
  if (cortada)
    avisos.push({
      titulo: "Lista de magias incompleta",
      texto:
        "A ficha em PDF só tinha espaço para parte da lista de magias. Confira o grimório e adicione as que faltarem.",
    });

  // Características de classe e traços raciais
  for (let i = 0; i < 10; i++) {
    const t = v(613 + i);
    if (!t) continue;
    const p = t.indexOf(":");
    c.tracos.push(p > 0 ? { nome: t.slice(0, p).trim(), obs: t.slice(p + 1).trim() } : { nome: t, obs: "" });
  }

  // Daqui em diante precisa da classe definida
  if (c.classeKey) {
    const calc = classFeatures(c);
    const automaticas = new Set([...calc.R, ...calc.I].map((x) => normTxt(String(x.nome).split(" ")[0])));
    for (let i = 0; i < 10; i++) {
      const nome = v(623 + 3 * i);
      if (nome && !automaticas.has(normTxt(nome.split(" ")[0]))) c.caracteristicas.push({ nome, obs: v(625 + 3 * i) });
    }
    // Ajusta "outros" das armas para bater com o acerto e o dano do PDF
    for (const { w, acerto, modDano } of ataquesPdf) {
      if (!isNaN(acerto)) w.acertoOutros = acerto - atkBonus(c, w);
      w.danoOutros = modDano - dmgMod(c, w);
      c.ataques.push(w);
    }
    if (c.ataques.length) resumo.push(`${c.ataques.length} arma${c.ataques.length > 1 ? "s" : ""}`);
    // Magias preparadas
    const semEspaco = [];
    if (!isSpont(c) && cls(c).magia) {
      const tabela = ensurePrep(c);
      for (const [l, ns] of Object.entries(preparadas)) {
        const p = c.prep[l];
        if (!p) {
          semEspaco.push(...ns);
          continue;
        }
        let i = 0;
        for (const raw of ns) {
          const extra = raw.endsWith("*");
          const alvo = normTxt(raw.replace(/\*$/, ""));
          const s = c.grimorio.find((x) => normTxt(x.nome) === alvo || normTxt(x.en) === alvo);
          if (!s) {
            semEspaco.push(raw);
            continue;
          }
          const r = tabela.find((x) => x.l === +l);
          if (extra && r && r.escola && !p.escola.sid) p.escola.sid = s.id;
          else if (i < p.slots.length) p.slots[i++].sid = s.id;
          else semEspaco.push(raw.replace(/\*$/, ""));
        }
      }
    }
    if (semEspaco.length)
      avisos.push({
        titulo: "Magias preparadas",
        texto: `Não deu para preparar ${listaPt(semEspaco.map((x) => "“" + x.replace(/\*$/, "") + "”"))}: a magia não está na lista de magias conhecidas da ficha ou não sobrou espaço desse nível. Prepare na aba Magias.`,
      });
    syncDomainSpells(c);
    // Tendência permitida?
    const blk = c.tendencia && alignBlock(c.classeKey, alignCode(c.tendencia));
    if (blk) avisos.push({ titulo: "Tendência", texto: `${c.tendencia} não é permitida: ${blk}` });
    // Confere os valores que o Códex calcula
    const a = ac(c),
      sv = saves(c);
    const cmp = (rotulo, pdf, aqui, fmt) => {
      const x = numPdf(pdf);
      if (!isNaN(x) && x !== aqui) difs.push(`${rotulo}: ${fmt ? sg(x) : x} no PDF, ${fmt ? sg(aqui) : aqui} aqui`);
    };
    cmp("CA", v(44), a.total);
    cmp("CA de toque", v(45), a.toque);
    cmp("CA surpresa", v(46), a.surpresa);
    cmp("Fortitude", v(54), sv.fort, true);
    cmp("Reflexos", v(55), sv.ref, true);
    cmp("Vontade", v(56), sv.von, true);
    cmp("BBA", v(75).split("/")[0], bba(c), true);
    cmp("Iniciativa", v(51), mod(at(c, "des")) + c.outros.init, true);
    const sp = skillPts(c);
    if (sp.spent > sp.avail)
      avisos.push({
        titulo: "Pontos de perícia",
        texto: `A ficha usa ${sp.spent} pontos de perícia, mas ${CLASSES[c.classeKey].nome} ${c.nivel} com Inteligência ${c.attr.int} tem ${sp.avail}. Pode ser multiclasse, um nível a mais ou um engano na ficha.`,
      });
  } else if (ataquesPdf.length) c.ataques = ataquesPdf.map((x) => x.w);

  if (notasExtras.length) {
    c.notas = "Observações de magia importadas do PDF:\n" + notasExtras.join("\n");
    avisos.push({
      titulo: "Observações",
      texto: `${notasExtras.length} linha${notasExtras.length > 1 ? "s" : ""} da área de magias não ${notasExtras.length > 1 ? "eram" : "era"} uma lista de magias. Guardamos o texto em Notas e backup.`,
    });
  }
  return { c, avisos, difs, resumo, classeDetectada: principal ? principal.k : "" };
}

/* ---------- Janela de importação ---------- */

let importacaoPdf = null; // { F, nomeArquivo, escolha }

function importPdfModal() {
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Importar ficha em PDF</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p style="margin:0;line-height:1.5">Escolha a ficha editável de 4 páginas do D&amp;D 3.5 já preenchida, inclusive uma exportada pelo Códex. Lemos os campos, montamos o personagem e mostramos o que não deu para trazer antes de salvar.</p>
  <div class="row"><label class="btn pri" for="pdfimport">Escolher PDF</label><input type="file" id="pdfimport" accept="application/pdf,.pdf" data-a="pdfimport" style="position:absolute;left:-9999px"><span id="pdfimpmsg" class="small muted" role="status"></span></div>`);
}
async function lerArquivoImportacao(file) {
  const msg = document.getElementById("pdfimpmsg");
  if (msg) msg.textContent = "Lendo a ficha…";
  try {
    const F = await lerPdfFicha(await file.arrayBuffer());
    importacaoPdf = { F, nomeArquivo: file.name, escolha: {} };
    revisaoImportacao();
  } catch (e) {
    const t =
      e && e.message === "lib"
        ? "Não foi possível carregar o leitor de PDF. Verifique a conexão e tente de novo."
        : (e && e.message) || "Não foi possível ler o PDF.";
    if (msg) {
      msg.textContent = t;
      msg.style.color = "var(--bad)";
    }
  }
}
function revisaoImportacao() {
  const imp = importacaoPdf;
  const r = montarDoPdf(imp.F, imp.escolha);
  const c = r.c;
  const k = c.classeKey;
  const lista = (xs) => `<ul style="margin:6px 0 0;padding-left:18px;line-height:1.5">${xs.join("")}</ul>`;
  const blocoAvisos = r.avisos.length
    ? `<div class="notice" style="border-color:var(--warn)"><b>O que não veio do PDF ou precisa de conferência</b>${lista(
        r.avisos.map((a) => `<li><b>${esc(a.titulo)}:</b> ${esc(a.texto)}</li>`)
      )}</div>`
    : "";
  const blocoDifs = r.difs.length
    ? `<div class="notice"><b>Valores calculados diferentes da ficha</b><p class="small" style="margin:4px 0 0">O Códex calcula estes valores a partir dos atributos, da classe e do equipamento. Se faltar algum bônus (item mágico, talento, magia ativa), ajuste em “Outros” na aba Ficha.</p>${lista(
        r.difs.map((d) => `<li>${esc(d)}</li>`)
      )}</div>`
    : "";
  const tudoCerto =
    !r.avisos.length && !r.difs.length
      ? `<p style="margin:0;color:var(--good)"><b>Tudo importado.</b> Confira a ficha antes da próxima sessão.</p>`
      : "";
  document.querySelector(".modal").innerHTML =
    `<div class="row"><h2 style="font-size:18px;color:var(--ink)">Revisar importação</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  <p class="small muted" style="margin:0">${esc(imp.nomeArquivo)}</p>
  <p class="inicio-titulo" style="font-size:22px">${esc(c.nome)}</p>
  <div class="fields">
    <label class="f" for="imp_cls">Classe<select id="imp_cls" data-a="impcls">${k ? "" : '<option value="" selected>Escolha a classe</option>'}${CLASS_ORDER.map(
      (x) => `<option value="${x}" ${x === k ? "selected" : ""}>${CLASSES[x].nome}</option>`
    ).join("")}</select></label>
    <label class="f" for="imp_nivel">Nível<input id="imp_nivel" type="number" min="1" max="20" value="${c.nivel}" data-a="impnivel"></label>
  </div>
  <p style="margin:0">${esc([c.raca, c.tendencia].filter(Boolean).join(" · "))}${r.resumo.length ? `<br><span class="small muted">Importado: ${esc(listaPt(r.resumo))}.</span>` : ""}</p>
  ${tudoCerto}${blocoAvisos}${blocoDifs}
  <div class="row"><button class="btn pri" data-a="impconfirmar" ${k ? "" : "disabled"}>Criar personagem</button><button class="btn" data-a="close">Cancelar</button>${k ? "" : '<span class="small" style="color:var(--bad)">Escolha a classe para continuar.</span>'}</div>`;
}
function confirmarImportacao() {
  if (!importacaoPdf) return;
  const { c } = montarDoPdf(importacaoPdf.F, importacaoPdf.escolha);
  if (!c.classeKey) return;
  state.chars[c.id] = c;
  state.active = c.id;
  importacaoPdf = null;
  touch(c.id);
  touch("__meta");
  closeModal();
  irPara("painel");
  render();
}
