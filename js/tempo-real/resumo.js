/* ================= Resumo ao vivo da ficha =================
   O que o mestre vê no card: PV, CA, números de combate e efeitos ativos.
   É pequeno (~1 KB) para poder ser enviado a cada mudança. */
import { mod, sizeGrap } from "../util.js";
import { at, classFeatures, cls } from "../regras/classes.js";
import { ac, bba, saves } from "../regras/calculos.js";

export const iniciativa = (c) => mod(at(c, "des")) + (+c.outros.init || 0);
export const agarrar = (c) => bba(c) + mod(at(c, "for")) + sizeGrap(c.tamanho) + (+c.outros.agarrar || 0);

/** Nomes dos efeitos ligados no Painel (Armadura Arcana, Escudo Arcano, Fúria...). */
const EFEITOS_FIXOS = { armaduraArcana: "Armadura Arcana", escudoArcano: "Escudo Arcano", resistencia: "Resistência" };
export function efeitosAtivos(c) {
  const nomes = { ...EFEITOS_FIXOS };
  for (const t of classFeatures(c).T) nomes[t.key] = t.nome;
  return Object.entries(c.ef || {})
    .filter(([k, ligado]) => ligado && nomes[k])
    .map(([k]) => nomes[k]);
}

export function resumoAoVivo(c) {
  const a = ac(c),
    s = saves(c);
  return {
    nome: c.nome,
    classe: cls(c).nome,
    nivel: +c.nivel || 1,
    raca: c.raca || "",
    tendencia: c.tendencia || "",
    jogador: c.jogador || "",
    hp: { atual: +c.hp.atual, max: +c.hp.max || 0, temp: +c.hp.temp || 0, contusao: +c.hp.contusao || 0 },
    ca: { total: a.total, toque: a.toque, surpresa: a.surpresa },
    iniciativa: iniciativa(c),
    fort: s.fort,
    ref: s.ref,
    von: s.von,
    bba: bba(c),
    agarrar: agarrar(c),
    deslocamento: c.deslocamento || "",
    inspiracao: +c.inspiracao || 0,
    resistCond: c.resistCond || "",
    efeitos: efeitosAtivos(c),
  };
}
