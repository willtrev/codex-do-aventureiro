/* ================= Ler PDFs sem os campos da ficha =================
   Quando o PDF não tem o formulário da ficha oficial, o texto é extraído com o pdf.js e
   convertido para o mesmo formato de campos { untitled7: "...", ... } que montarDoPdf entende.

   Dois casos:
     - "posicao": a ficha oficial achatada (impressa em PDF, salva sem formulário). Cada texto vai
       para o campo da ficha em cuja área ele caiu (posições em js/dados/ficha-campos.js).
     - "texto": qualquer outro PDF com texto (outra ficha, um documento, uma exportação de outro site).
       Procuramos rótulos como "Nome:", "Classe:", "For 16", "PV 18" e seções "Magias", "Talentos"... */

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
let pdfjsPromise = null;
function loadPdfJs() {
  if (!pdfjsPromise)
    pdfjsPromise = import(PDFJS_URL)
      .then((m) => {
        m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        return m;
      })
      .catch((e) => {
        pdfjsPromise = null;
        throw new Error("lib");
      });
  return pdfjsPromise;
}

/** Extrai os pedaços de texto com posição: [{ p, x, y, w, h, s }] e o tamanho das páginas. */
async function extrairTextoPdf(bytes) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false }).promise;
  const itens = [],
    paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const vp = pg.getViewport({ scale: 1 });
    paginas.push({ largura: vp.width, altura: vp.height });
    const tc = await pg.getTextContent();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const [a, , , d, x, y] = it.transform;
      itens.push({
        p: p - 1,
        x,
        y,
        w: it.width,
        h: Math.abs(d) || Math.abs(a) || it.height || 8,
        s: it.str,
        eol: it.hasEOL,
      });
    }
  }
  return { itens, paginas };
}

/** Agrupa os pedaços em linhas de texto, na ordem de leitura. */
function linhasDoTexto(itens) {
  const ord = itens.slice().sort((a, b) => a.p - b.p || b.y - a.y || a.x - b.x);
  const linhas = [];
  let atual = null;
  for (const it of ord) {
    if (atual && atual.p === it.p && Math.abs(atual.y - it.y) < Math.max(2, it.h * 0.5)) atual.partes.push(it);
    else linhas.push((atual = { p: it.p, y: it.y, partes: [it] }));
  }
  return linhas.map((l) => {
    l.partes.sort((a, b) => a.x - b.x);
    let t = "",
      fim = null;
    for (const it of l.partes) {
      if (fim !== null) {
        const gap = it.x - fim;
        t += gap > it.h * 1.5 ? "   " : gap > it.h * 0.15 && !t.endsWith(" ") && !it.s.startsWith(" ") ? " " : "";
      }
      t += it.s;
      fim = it.x + it.w;
    }
    return t.replace(/\s+$/, "");
  });
}

/* ---------- Caso 1: ficha oficial achatada ---------- */

function camposPorPosicao({ itens, paginas }) {
  if (paginas.length < 3 || paginas.length > 5) return null;
  const sx = paginas[0].largura / FICHA_PAGINA.largura,
    sy = paginas[0].altura / FICHA_PAGINA.altura;
  if (Math.abs(sx - sy) > 0.08) return null;
  const porPagina = {};
  for (const [n, [p, x, y, w, h]] of Object.entries(FICHA_CAMPOS))
    (porPagina[p] = porPagina[p] || []).push({ n, x: x * sx, y: y * sy, w: w * sx, h: h * sy });
  const caiu = {};
  let dentro = 0;
  for (const it of itens) {
    const px = it.x + Math.min(it.w, 4) / 2,
      py = it.y + it.h * 0.3;
    const campo = (porPagina[it.p] || []).find(
      (r) => px >= r.x - 1.5 && px <= r.x + r.w + 1.5 && py >= r.y - 1.5 && py <= r.y + r.h + 1.5
    );
    if (!campo) continue;
    dentro++;
    (caiu[campo.n] = caiu[campo.n] || []).push(it);
  }
  // Na ficha oficial o próprio modelo não tem texto: quase tudo deve cair dentro dos campos
  if (dentro < 10 || dentro < itens.length * 0.7) return null;
  const F = {};
  for (const [n, its] of Object.entries(caiu)) {
    its.sort((a, b) => b.y - a.y || a.x - b.x);
    // Linhas de continuação da área de magias começam com recuo; mantemos isso
    const recuo = its[0].x - FICHA_CAMPOS[n][1] * sx > 6 ? "  " : "";
    F["untitled" + n] =
      recuo +
      its
        .map((i) => i.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
  }
  return F;
}

/* ---------- Caso 2: texto livre ---------- */

const ROTULOS = [
  [7, ["nome do personagem", "character name", "nome", "name", "personagem", "character"]],
  [1, ["jogador", "player"]],
  [
    8,
    [
      "classe e nível",
      "classe e nivel",
      "classe/nível",
      "class & level",
      "class and level",
      "classes",
      "classe",
      "class",
    ],
  ],
  [585, ["nível do personagem", "nível", "nivel", "character level", "level"]],
  [9, ["raça", "raca", "race"]],
  [2, ["tendência", "tendencia", "alignment"]],
  [3, ["divindade", "deity", "deus"]],
  [4, ["tamanho", "size"]],
  [5, ["idade", "age"]],
  [6, ["sexo", "gênero", "genero", "gender", "sex"]],
  [10, ["altura", "height"]],
  [11, ["peso", "weight"]],
  [82, ["deslocamento", "movimento", "speed"]],
  [582, ["pontos de experiência", "experiência", "experiencia", "experience points", "experience", "xp"]],
  [480, ["idiomas", "línguas", "linguas", "languages"]],
  [
    566,
    [
      "escola especializada",
      "especialização",
      "especializacao",
      "domínios",
      "dominios",
      "domains",
      "escola",
      "school",
      "specialization",
    ],
  ],
  [568, ["escolas proibidas", "proibidas", "prohibited schools", "prohibited"]],
];
const ROT_NUM = [
  [13, ["força", "forca", "strength", "for", "str"]],
  [15, ["destreza", "dexterity", "des", "dex"]],
  [17, ["constituição", "constituicao", "constitution", "con"]],
  [19, ["inteligência", "inteligencia", "intelligence", "int"]],
  [21, ["sabedoria", "wisdom", "sab", "wis"]],
  [23, ["carisma", "charisma", "car", "cha"]],
  [47, ["pontos de vida", "pv máximos", "pv maximos", "hit points", "pv", "hp"]],
  [44, ["classe de armadura", "armor class", "ca", "ac"]],
  [54, ["fortitude", "fort"]],
  [55, ["reflexos", "reflex", "ref"]],
  [56, ["vontade", "will", "von"]],
  [51, ["iniciativa", "initiative", "init"]],
  [75, ["bônus base de ataque", "bonus base de ataque", "base attack bonus", "bba", "bab"]],
  [466, ["peças de ouro", "pecas de ouro", "gold pieces", "po", "gp"]],
];
const SECOES = [
  [
    "magias",
    /^(magias|spells|grim[óo]rio|spellbook|lista de magias|magias conhecidas|spells known|magias preparadas|spells prepared)\b/i,
  ],
  ["talentos", /^(talentos|feats|talentos e habilidades)\b/i],
  ["itens", /^(equipamento|equipment|invent[áa]rio|inventory|itens|items|gear)\b/i],
  ["pericias", /^(per[íi]cias|skills)\b/i],
  [
    "fim",
    /^(habilidades|caracter[íi]sticas|class features|tra[çc]os|traits|notas|notes|hist[óo]ria|background|descri[çc][ãa]o|ataques|attacks|armas|weapons|dinheiro|money|idiomas|languages)\b/i,
  ],
];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SEM_LETRA_ANTES = "(?<![\\p{L}\\p{N}])",
  SEM_LETRA_DEPOIS = "(?![\\p{L}])";

function camposDeTextoLivre(linhas) {
  const F = {};
  const achados = new Set();
  const texto = linhas.join("\n");

  // Rótulos com valor de texto: "Nome: Thorin   Raça: Anão"
  const todos = ROTULOS.flatMap(([n, rs]) => rs.map((r) => [n, r])).sort((a, b) => b[1].length - a[1].length);
  const reRot = new RegExp(SEM_LETRA_ANTES + "(" + todos.map(([, r]) => escRe(r)).join("|") + ")\\s*[:：]\\s*", "giu");
  for (const ln of linhas) {
    const ms = [...ln.matchAll(reRot)];
    ms.forEach((m, i) => {
      const fim = i + 1 < ms.length ? ms[i + 1].index : ln.length;
      // O valor vai até o próximo rótulo ou até um espaço largo (outra coluna)
      const valor = ln
        .slice(m.index + m[0].length, fim)
        .split(/\s{3,}/)[0]
        .trim()
        .replace(/[;,|]+$/, "");
      const rot = normTxt(m[1]);
      const n = todos.find(([, r]) => normTxt(r) === rot)[0];
      if (valor && !F["untitled" + n]) {
        F["untitled" + n] = valor;
        achados.add(n);
      }
    });
  }
  // "Escolas proibidas: Evocação, Necromancia" ocupa dois campos na ficha oficial
  if (F.untitled568 && /,| e | and /.test(F.untitled568)) {
    const [a, b] = F.untitled568.split(/,| e | and /).map((x) => x.trim());
    F.untitled568 = a;
    F.untitled569 = b || "";
  }
  // Rótulos numéricos: "For 16", "FOR: 16 (+3)", "PV 18", "CA 15"
  for (const [n, rs] of ROT_NUM) {
    for (const r of rs) {
      const m = texto.match(
        new RegExp(SEM_LETRA_ANTES + escRe(r) + SEM_LETRA_DEPOIS + "\\.?\\s*[:=]?\\s*([+\\-−]?\\d{1,3})(?!\\d)", "iu")
      );
      if (m) {
        F["untitled" + n] = m[1];
        achados.add(n);
        break;
      }
    }
  }
  // Classe sem rótulo: "Mago 3", "Wizard 5"
  if (!F.untitled8) {
    const m = texto.match(
      /(?<![\p{L}])(b[áa]rbaro|barbarian|bardo|bard|cl[ée]rigo|cleric|druida|druid|guerreiro|fighter|monge|monk|paladino|paladin|ranger|patrulheiro|ladino|rogue|feiticeiro|sorcerer|mago|wizard)\s+(\d{1,2})(?!\d)/iu
    );
    if (m) F.untitled8 = m[1] + " " + m[2];
  }

  // Seções em lista: magias, talentos, equipamento
  const magias = [],
    talentos = [],
    itens = [];
  let secao = null,
    nivel = null,
    temPericias = false;
  for (const bruto of linhas) {
    const ln = bruto.trim();
    if (!ln) continue;
    // Uma linha "Rótulo: valor" conhecido encerra a lista anterior
    reRot.lastIndex = 0;
    const comeca = reRot.exec(ln);
    if (comeca && comeca.index === 0 && !SECOES.some(([, re]) => re.test(ln))) {
      secao = null;
      continue;
    }
    const s = SECOES.find(([, re]) => re.test(ln));
    let resto = ln;
    if (s) {
      secao = s[0];
      nivel = null;
      if (secao === "pericias") temPericias = true;
      resto = ln.replace(s[1], "").replace(/^[\s:\-–]+/, "");
      if (!resto) continue;
    }
    if (!secao || secao === "fim" || secao === "pericias") continue;
    if (secao === "magias") {
      const mn = resto.match(
        /^(truques|cantrips|orisons|n[íi]vel\s*(\d)|(\d)\s*º?\s*(?:n[íi]vel)?|(\d)(?:st|nd|rd|th)\s*level|level\s*(\d))\s*[:\-–]\s*/i
      );
      if (mn) {
        nivel = +(mn[2] || mn[3] || mn[4] || mn[5] || 0);
        resto = resto.slice(mn[0].length);
      }
      for (const nome of resto.split(/[,;•·]|\s{3,}/)) {
        const t = nome
          .trim()
          .replace(/[.*]$/, "")
          .replace(/\s*\(.*\)$/, "");
        if (t) magias.push({ nome: t, nivel });
      }
    } else
      for (const nome of resto.split(/[,;•·]|\s{3,}/)) {
        const t = nome.trim().replace(/\.$/, "");
        if (t && t.length < 60) (secao === "talentos" ? talentos : itens).push(t);
      }
  }
  if (magias.length) F.__magias = magias;
  if (talentos.length) F.__talentos = talentos;
  if (itens.length) F.__itens = itens;
  F.__temPericias = temPericias;
  F.__achados = [...achados];
  return F;
}

/** Converte os campos de um formulário que não é a ficha oficial em linhas "rótulo: valor". */
function linhasDeOutroFormulario(F) {
  return Object.entries(F)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `${k.replace(/[_\-.]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}: ${v.trim()}`);
}
