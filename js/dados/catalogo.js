/*
  Catálogo de magias usado pelo app.
  Junta os dados do SRD (js/dados/srd-magias.js) com os nomes e resumos em português (js/dados/traducoes-magias.js)
  e traduz os campos de regra com js/regras/traduzir.js.
*/
import { TR_ESCOLAS, TR_SUBESCOLAS } from "./traducoes.js";
import { TR_MAGIAS } from "./traducoes-magias.js";
import { trAlcance, trComponentes, trDescritores, trDuracao, trExecucao, trRM, trTeste } from "../regras/traduzir.js";
import { SRD_MAGIAS } from "./srd-magias.js";

/* Ajustes da rolagem de ataque detectada no texto do SRD: "dist", "corpo" ou "" (sem ataque) */
export const ATAQUE_AJUSTES = {
  Fireball: "",
  "Meteor Swarm": "",
  "Animate Rope": "",
  "Spectral Hand": "",
  "Produce Flame": "corpo",
  "Inflict Minor Wounds": "corpo",
  "Inflict Light Wounds": "corpo",
  "Inflict Moderate Wounds": "corpo",
  "Inflict Serious Wounds": "corpo",
  "Inflict Critical Wounds": "corpo",
  Harm: "corpo",
  "Bestow Curse": "corpo",
  Contagion: "corpo",
  "Touch of Fatigue": "corpo",
};

export function nivelPrincipal(m) {
  const ls = Object.values(m.listas);
  if (m.listas.mago !== undefined) return m.listas.mago;
  if (ls.length) return Math.min(...ls);
  const ds = Object.values(m.dominios);
  return ds.length ? Math.min(...ds) : 0;
}

export const CAT = SRD_MAGIAS.map((m, i) => {
  const pt = TR_MAGIAS[m.nome] || {};
  const alvoOriginal = m.alvo || m.area || m.efeito || "";
  return {
    cid: "cat" + i,
    nome: pt.nome || m.nome,
    en: m.nome,
    nivel: nivelPrincipal(m),
    listas: m.listas,
    dominios: m.dominios,
    escola: TR_ESCOLAS[m.escola] || m.escola,
    subescola: TR_SUBESCOLAS[m.subescola] || m.subescola || "",
    descritor: trDescritores(m.descritor),
    tempo: trExecucao(m.execucao),
    comp: trComponentes(m.componentes),
    alcance: trAlcance(m.alcance),
    alvo: pt.alvo || alvoOriginal,
    duracao: trDuracao(m.duracao),
    ts: trTeste(m.resistencia),
    rm: trRM(m.rm),
    desc: pt.descricao || m.resumo || "",
    descPt: !!pt.descricao,
    ataque: m.nome in ATAQUE_AJUSTES ? ATAQUE_AJUSTES[m.nome] : m.ataque || "",
  };
});
export const CAT_POR_EN = new Map(CAT.map((c) => [c.en.toLowerCase(), c]));
export const SRD_MAGIA_POR_EN = new Map(SRD_MAGIAS.map((m) => [m.nome.toLowerCase(), m]));

/* Encontra a magia do catálogo a partir do nome usado nas listas de domínio do SRD (ex.: "mass cure light wounds") */
export function magiaPorNomeSRD(n) {
  n = String(n || "")
    .toLowerCase()
    .trim();
  const direto = CAT_POR_EN.get(n);
  if (direto) return direto;
  let m;
  if ((m = n.match(/^(mass|greater|lesser) (.+)$/))) {
    const c = CAT_POR_EN.get(`${m[2]}, ${m[1]}`);
    if (c) return c;
  }
  for (const c of CAT) if (c.en.toLowerCase().replace(/^[^ ]+'s /, "") === n) return c;
  return null;
}
export const temTeste = (ts) => !!ts && ts !== "—" && !/^nenhum\b/.test(ts);
