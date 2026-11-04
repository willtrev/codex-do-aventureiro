/* ================= Classes básicas (Livro do Jogador 3.5) ================= */
/*
  Classes básicas do Livro do Jogador.
  Aqui ficam só as escolhas do app (nome em português, ouro inicial e como cada classe lança magias).
  Dado de vida, BBA, testes de resistência, perícias de classe, pontos de perícia e as tabelas de
  magias por dia e magias conhecidas vêm do SRD (js/dados/srd-classes.js) em aplicarSRDClasses(), logo abaixo.
*/
const CLASSES = {
  barbaro: { nome: "Bárbaro", ouro: "4d4 × 10 (média 100 PO)" },
  bardo: {
    nome: "Bardo",
    ouro: "4d4 × 10 (média 100 PO)",
    magia: { tipo: "espontanea", attr: "car", lista: "bardo", arcana: true },
  },
  clerigo: {
    nome: "Clérigo",
    ouro: "5d4 × 10 (média 125 PO)",
    magia: { tipo: "preparada", attr: "sab", lista: "clerigo", extra: "Domínio" },
  },
  druida: {
    nome: "Druida",
    ouro: "2d4 × 10 (média 50 PO)",
    magia: { tipo: "preparada", attr: "sab", lista: "druida" },
  },
  guerreiro: { nome: "Guerreiro", ouro: "6d4 × 10 (média 150 PO)" },
  monge: { nome: "Monge", ouro: "5d4 (média 12 PO e 5 PP)" },
  paladino: {
    nome: "Paladino",
    ouro: "6d4 × 10 (média 150 PO)",
    magia: { tipo: "preparada", attr: "sab", lista: "paladino", desde: 4, clMeio: true },
  },
  ranger: {
    nome: "Ranger",
    ouro: "6d4 × 10 (média 150 PO)",
    magia: { tipo: "preparada", attr: "sab", lista: "ranger", desde: 4, clMeio: true },
  },
  ladino: { nome: "Ladino", ouro: "5d4 × 10 (média 125 PO)" },
  feiticeiro: {
    nome: "Feiticeiro",
    ouro: "3d4 × 10 (média 75 PO)",
    magia: { tipo: "espontanea", attr: "car", lista: "mago", arcana: true },
  },
  mago: {
    nome: "Mago",
    ouro: "3d4 × 10 (média 75 PO)",
    magia: { tipo: "grimorio", attr: "int", lista: "mago", arcana: true, extra: "Escola" },
  },
};

/* Converte a lista de perícias de classe do SRD para as chaves do app */
function periciasDoSRD(lista) {
  const out = new Set();
  for (const p of lista) {
    if (/^Knowledge \(all/.test(p))
      Object.keys(SK)
        .filter((k) => k.startsWith("c_"))
        .forEach((k) => out.add(k));
    else if (TR_PERICIAS[p]) out.add(TR_PERICIAS[p]);
  }
  return [...out];
}
/* Linha da tabela de magias: espaços base por nível (null = não lança aquele nível ainda) */
const linhaEspacos = (r) => {
  const v = r.espacos.map((e) => (e ? e[0] : null));
  while (v.length && v[v.length - 1] === null) v.pop();
  return v.length ? v : null;
};
const linhaConhecidas = (r) => {
  const v = r.conhecidas.slice();
  while (v.length && v[v.length - 1] === null) v.pop();
  return v;
};
function aplicarSRDClasses() {
  for (const [en, chave] of Object.entries(TR_CLASSES)) {
    const S = window.SRD.classes[en],
      C = CLASSES[chave];
    C.srd = S.tabela;
    C.dv = S.dado_vida;
    C.pts = S.pericias_por_nivel;
    C.pericias = periciasDoSRD(S.pericias_classe);
    const bba20 = S.tabela[19].bba;
    C.bab = bba20 >= 20 ? "boa" : bba20 >= 15 ? "media" : "fraca";
    C.tr = ["fort", "ref", "von"].filter((t) => S.tabela[0][t] >= 2);
    if (C.magia) {
      C.magia.tabela = S.tabela.map(linhaEspacos);
      if (C.magia.tipo === "espontanea") C.magia.conhecidas = S.tabela.map(linhaConhecidas);
    }
  }
}
aplicarSRDClasses();

const CLASS_ORDER = [
  "barbaro",
  "bardo",
  "clerigo",
  "druida",
  "guerreiro",
  "monge",
  "paladino",
  "ranger",
  "ladino",
  "feiticeiro",
  "mago",
];
const ATTR_NAME = { for: "For", des: "Des", con: "Con", int: "Int", sab: "Sab", car: "Car" };
function classKeyFromName(n) {
  n = String(n || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return (
    CLASS_ORDER.find((k) => n.includes(k)) ||
    (n.includes("clerig") ? "clerigo" : n.includes("feitic") ? "feiticeiro" : "mago")
  );
}
const cls = (c) => CLASSES[c.classeKey] || CLASSES.mago;
const lvlOf = (c) => clamp(+c.nivel || 1, 1, 20);
function at(c, k) {
  let v = +c.attr[k] || 0;
  if (c.ef && c.ef.furia && c.classeKey === "barbaro" && (k === "for" || k === "con")) v += 4;
  return v;
}
/* BBA e testes de resistência base vêm da tabela do SRD da classe */
function babOf(c) {
  return cls(c).srd[lvlOf(c) - 1].bba;
}
function saveBase(c, k) {
  return cls(c).srd[lvlOf(c) - 1][k];
}
function spellAttr(c) {
  const m = cls(c).magia;
  return m ? m.attr : "int";
}
function casterLevel(c) {
  const m = cls(c).magia;
  if (!m) return 0;
  return m.clMeio ? Math.floor(lvlOf(c) / 2) : lvlOf(c);
}
function bonusSpells(score, l) {
  const am = Math.floor((score - 10) / 2);
  return l > 0 && am >= l ? Math.floor((am - l) / 4) + 1 : 0;
}
function knownTable(c) {
  const m = cls(c).magia;
  if (!m || !m.conhecidas) return null;
  return m.conhecidas[lvlOf(c) - 1] || [];
}
/* Recursos e habilidades por classe */
function classFeatures(c) {
  const k = c.classeKey,
    L = lvlOf(c),
    mod_ = (a) => mod(at(c, a)),
    R = [],
    I = [],
    T = [];
  const usosExtra = (key) => +((c.usosBonus || {})[key] || 0);
  if (k === "barbaro") {
    R.push({
      key: "furia",
      nome: "Fúria",
      max: 1 + Math.floor(L / 4) + usosExtra("furia"),
      desc: `Dura ${3 + mod(c.attr.con + 4)} rodadas. Depois fica fatigado até o fim do encontro.`,
    });
    T.push({
      key: "furia",
      nome: "Em fúria",
      desc: "+4 For, +4 Con, +2 Vontade, –2 CA. Não pode usar perícias que exigem paciência nem lançar magias.",
    });
    I.push({ nome: "Movimento rápido", valor: "+3 m", desc: "Com armadura leve ou média e sem carga pesada." });
    if (L >= 2)
      I.push({ nome: "Esquiva sobrenatural", valor: "", desc: "Mantém a Destreza na CA mesmo surpreendido." });
    if (L >= 3)
      I.push({
        nome: "Sentir armadilhas",
        valor: "+" + Math.floor(L / 3),
        desc: "Em Reflexos e na CA contra armadilhas.",
      });
    I.push({ nome: "Analfabetismo", valor: "", desc: "Não sabe ler nem escrever até gastar 2 pontos de perícia." });
  }
  if (k === "bardo") {
    R.push({
      key: "musica",
      nome: "Música de bardo",
      max: L + usosExtra("musica"),
      desc: "Precisa de graduações em Atuação. Fascinar, Contramelodia e Inspirar Coragem.",
    });
    I.push({
      nome: "Inspirar coragem",
      valor: "+" + (L >= 20 ? 4 : L >= 14 ? 3 : L >= 8 ? 2 : 1),
      desc: "Aliados que ouvem: bônus em ataque, dano e testes contra medo e enfeitiçar.",
    });
    I.push({
      nome: "Conhecimento de bardo",
      valor: sg(L + mod_("int")),
      desc: "1d20 + nível + Int para saber algo sobre pessoas, lendas e itens.",
    });
  }
  if (k === "clerigo") {
    const neg = energiaNegativa(c);
    R.push({
      key: "expulsar",
      nome: neg ? "Fascinar mortos-vivos" : "Expulsar mortos-vivos",
      max: Math.max(0, 3 + mod_("car")) + usosExtra("expulsar"),
      desc:
        "Teste: 1d20 " +
        sg(mod_("car")) +
        " (Car). Dano de " +
        (neg ? "fascinação" : "expulsão") +
        ": 2d6 " +
        sg(L + mod_("car")) +
        "." +
        (neg
          ? " Mortos-vivos afetados ficam encolhidos de medo; com o dobro do seu nível em DV, passam a obedecer."
          : ""),
    });
    I.push({
      nome: "Conversão espontânea",
      valor: "",
      desc:
        "Troca qualquer magia preparada (exceto de domínio) por " +
        (neg ? "Infligir" : "Curar") +
        " Ferimentos do mesmo nível.",
    });
    const ds = domList(c);
    if (!ds.length) I.push({ nome: "Domínios", valor: "—", desc: "Escolha 2 domínios na aba Magias." });
    for (const d of ds) {
      const D = DOMAINS[d];
      if (D.rec)
        R.push({
          key: D.rec.key,
          nome: D.rec.nome + " (" + d + ")",
          max: D.rec.max(c),
          pool: !!D.rec.pool,
          desc: D.rec.desc(c),
        });
      I.push({ nome: "Domínio: " + d, valor: "", desc: D.poder });
    }
  }
  if (k === "druida") {
    I.push({
      nome: "Companheiro animal",
      valor: esc(c.familiar.tipo || "—"),
      desc: "Animal leal que luta e cresce com você.",
    });
    I.push({
      nome: "Empatia selvagem",
      valor: sg(L + mod_("car")),
      desc: "1d20 + nível + Car para mudar a atitude de um animal.",
    });
    I.push({
      nome: "Restrições",
      valor: "",
      desc: "Não usa armadura nem escudo de metal; não pode lançar magias de tendência oposta.",
    });
    if (L >= 2)
      I.push({ nome: "Caminho da floresta", valor: "", desc: "Atravessa vegetação rasteira sem penalidade." });
    if (L >= 5)
      R.push({
        key: "forma",
        nome: "Forma selvagem",
        max: (L >= 18 ? 6 : L >= 14 ? 5 : L >= 10 ? 4 : L >= 7 ? 3 : L >= 6 ? 2 : 1) + usosExtra("forma"),
        desc: "Transforma-se em um animal por 1 hora/nível.",
      });
  }
  if (k === "guerreiro") {
    I.push({
      nome: "Talentos adicionais",
      valor: String(1 + Math.floor(L / 2)),
      desc: "Talentos de guerreiro ganhos até o nível atual.",
    });
  }
  if (k === "monge") {
    const sab = Math.max(0, mod_("sab"));
    R.push({
      key: "atordoante",
      nome: "Ataque atordoante",
      max: L + usosExtra("atordoante"),
      desc: `Declarar antes de rolar. Fortitude CD ${10 + Math.floor(L / 2) + mod_("sab")} ou fica atordoado 1 rodada. Uma vez por rodada.`,
    });
    I.push({
      nome: "Rajada de golpes",
      valor: L >= 9 ? "+0/+0" : L >= 5 ? "–1/–1" : "–2/–2",
      desc:
        "Ataque total: um ataque extra" + (L >= 11 ? " (dois a partir do 11º)" : "") + " com essa penalidade em todos.",
    });
    I.push({
      nome: "Ataque desarmado",
      valor: L >= 20 ? "2d10" : L >= 16 ? "2d8" : L >= 12 ? "2d6" : L >= 8 ? "1d10" : L >= 4 ? "1d8" : "1d6",
      desc: "Dano letal, conta como arma natural e manufaturada.",
    });
    I.push({
      nome: "Bônus na CA",
      valor: "+" + (sab + Math.floor(L / 5)),
      desc: "Sab + 1 a cada 5 níveis, sem armadura. Já somado na CA.",
    });
    if (L >= 2) I.push({ nome: "Evasão", valor: "", desc: "Passou em Reflexos contra área: nenhum dano." });
    if (L >= 3)
      I.push({
        nome: "Movimento rápido",
        valor: "+" + 3 * Math.floor(L / 3) + " m",
        desc: "Sem armadura e sem carga.",
      });
  }
  if (k === "paladino") {
    R.push({
      key: "destruir",
      nome: "Destruir o mal",
      max: 1 + Math.floor(L / 5) + usosExtra("destruir"),
      desc: `Contra alvo maligno: ${sg(Math.max(0, mod_("car")))} no ataque e +${L} no dano.`,
    });
    I.push({ nome: "Detectar o mal", valor: "à vontade", desc: "Como a magia, como ação de movimento." });
    if (L >= 2) {
      R.push({
        key: "maos",
        nome: "Cura pelas mãos (PV)",
        max: Math.max(0, L * mod_("car")),
        pool: true,
        desc: "Cura PV por toque, ou causa dano a mortos-vivos. Ação padrão.",
      });
      I.push({
        nome: "Graça divina",
        valor: sg(Math.max(0, mod_("car"))),
        desc: "Carisma somado a todos os testes de resistência. Já incluído.",
      });
    }
    if (L >= 3)
      I.push({
        nome: "Aura de coragem e saúde divina",
        valor: "",
        desc: "Imune a medo e doenças; aliados a 3 m ganham +4 contra medo.",
      });
    if (L >= 4)
      R.push({
        key: "expulsar",
        nome: "Expulsar mortos-vivos",
        max: Math.max(0, 3 + mod_("car")) + usosExtra("expulsar"),
        desc: "Como um clérigo de 3 níveis a menos.",
      });
  }
  if (k === "ranger") {
    I.push({
      nome: "Inimigo predileto",
      valor: esc(c.inimigo || "—") + " +" + (2 + 2 * Math.floor(L / 5)),
      desc: "Bônus em dano e em Blefar, Ouvir, Sentir Motivação, Observar e Sobrevivência contra esse tipo.",
    });
    I.push({ nome: "Rastrear", valor: "", desc: "Usa Sobrevivência para seguir rastros." });
    I.push({
      nome: "Empatia selvagem",
      valor: sg(L + mod_("car")),
      desc: "1d20 + nível + Car para mudar a atitude de um animal.",
    });
    if (L >= 2)
      I.push({
        nome: "Estilo de combate",
        valor: esc(c.estilo || "—"),
        desc: "Arquearia ou duas armas, só com armadura leve ou sem armadura.",
      });
    if (L >= 4)
      I.push({
        nome: "Companheiro animal",
        valor: esc(c.familiar.tipo || "—"),
        desc: "Como um druida de metade do nível.",
      });
  }
  if (k === "ladino") {
    I.push({
      nome: "Ataque furtivo",
      valor: "+" + Math.ceil(L / 2) + "d6",
      desc: "Quando o alvo perde a Destreza na CA ou está flanqueado. Até 9 m à distância.",
    });
    I.push({
      nome: "Encontrar armadilhas",
      valor: "",
      desc: "Procura e desarma armadilhas mágicas e de CD acima de 20.",
    });
    if (L >= 2) I.push({ nome: "Evasão", valor: "", desc: "Passou em Reflexos contra área: nenhum dano." });
    if (L >= 3)
      I.push({
        nome: "Sentir armadilhas",
        valor: "+" + Math.floor(L / 3),
        desc: "Em Reflexos e na CA contra armadilhas.",
      });
    if (L >= 4)
      I.push({ nome: "Esquiva sobrenatural", valor: "", desc: "Mantém a Destreza na CA mesmo surpreendido." });
  }
  if (k === "feiticeiro" || k === "mago") {
    I.push({
      nome: "Familiar",
      valor: esc(c.familiar.tipo || "—"),
      desc: "Dá Prontidão quando está ao alcance da mão; compartilha magias.",
    });
  }
  if (k === "mago") I.push({ nome: "Escrever Pergaminho", valor: "", desc: "Talento grátis do 1º nível." });
  return { R, I, T };
}
