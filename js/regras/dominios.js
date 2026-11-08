/* ================= Domínios de clérigo (Livro do Jogador 3.5) =================
  Para cada domínio: poder (resumo em português), per (perícias que viram de classe),
  rec (habilidade com usos por dia, mostrada no painel), tend (tendência exigida) e restricoes (observações por nível).
*/
import { clone, uidGen } from "../util.js";
import { TR_DOMINIOS } from "../dados/traducoes.js";
import { SRD_DOMINIOS } from "../dados/srd-dominios.js";
import { CAT, magiaPorNomeSRD } from "../dados/catalogo.js";
import { lvlOf } from "./classes.js";
import { alignCode, geNeutral, isEvil } from "./tendencias.js";
import { slotTable } from "./calculos.js";

export const DOMAINS = {
  Água: {
    poder:
      "Expulsa ou destrói criaturas do fogo e fascina ou comanda criaturas da água, como um clérigo bom expulsa mortos-vivos.",
    restricoes: { 9: "só água" },
  },
  Animal: {
    poder:
      "Falar com Animais 1 vez por dia (habilidade similar a magia). Conhecimento (natureza) vira perícia de classe.",
    restricoes: { 4: "só animais", 8: "só animais" },
    per: ["c_nat"],
  },
  Ar: {
    poder:
      "Expulsa ou destrói criaturas da terra e fascina ou comanda criaturas do ar, como um clérigo bom expulsa mortos-vivos.",
    restricoes: { 9: "só ar" },
  },
  Bem: {
    poder: "Lança magias do bem com +1 nível de conjurador. Exige tendência boa.",
    restricoes: { 9: "só bem" },
    tend: "Bom",
  },
  Caos: {
    poder: "Lança magias do caos com +1 nível de conjurador. Exige tendência caótica.",
    restricoes: { 9: "só caos" },
    tend: "Caótico",
  },
  Conhecimento: {
    poder: "Todas as perícias de Conhecimento viram perícias de classe. Lança adivinhações com +1 nível de conjurador.",
    per: ["c_arcano", "c_arq", "c_masm", "c_geo", "c_hist", "c_local", "c_nat", "c_nob", "c_rel", "c_planos"],
  },
  Cura: {
    poder: "Lança magias de cura com +1 nível de conjurador.",
  },
  Destruição: {
    poder: "Golpe destruidor 1 vez por dia: +4 no ataque e + nível de clérigo no dano de um ataque corpo a corpo.",
    rec: {
      key: "d_destr",
      nome: "Golpe destruidor",
      max: () => 1,
      desc: (c) => "+4 no ataque e +" + lvlOf(c) + " no dano de um ataque corpo a corpo. Declarar antes de rolar.",
    },
  },
  Enganação: {
    poder: "Blefar, Disfarce e Esconder-se viram perícias de classe.",
    per: ["blefar", "disfarce", "esconder"],
  },
  Força: {
    poder: "Feito de força 1 vez por dia: + nível de clérigo em Força por 1 rodada.",
    rec: {
      key: "d_forca",
      nome: "Feito de força",
      max: () => 1,
      desc: (c) => "+" + lvlOf(c) + " de melhoria em Força por 1 rodada. Ação livre.",
    },
  },
  Fogo: {
    poder:
      "Expulsa ou destrói criaturas da água e fascina ou comanda criaturas do fogo, como um clérigo bom expulsa mortos-vivos.",
    restricoes: { 3: "frio ou fogo", 9: "só fogo" },
  },
  Guerra: {
    poder: "Usar Arma Comum e Foco em Arma grátis com a arma predileta da sua divindade.",
  },
  Lei: {
    poder: "Lança magias da lei com +1 nível de conjurador. Exige tendência leal.",
    restricoes: { 9: "só lei" },
    tend: "Leal",
  },
  Magia: {
    poder: "Usa pergaminhos, varinhas e outros itens de magia arcana como um mago de metade do seu nível de clérigo.",
  },
  Mal: {
    poder: "Lança magias do mal com +1 nível de conjurador. Exige tendência maligna.",
    restricoes: { 9: "só mal" },
    tend: "Mau",
  },
  Morte: {
    poder:
      "Toque da morte 1 vez por dia: ataque de toque corpo a corpo; role 1d6 por nível de clérigo. Se o total for maior ou igual aos PV atuais do alvo, ele morre.",
    rec: {
      key: "d_morte",
      nome: "Toque da morte",
      max: () => 1,
      desc: (c) =>
        "Ataque de toque corpo a corpo. Role " +
        lvlOf(c) +
        "d6: se for maior ou igual aos PV atuais do alvo, ele morre.",
    },
  },
  Proteção: {
    poder:
      "Proteção 1 vez por dia: toque que dá + nível de clérigo de resistência no próximo teste de resistência do alvo (dura 1 hora).",
    rec: {
      key: "d_prot",
      nome: "Escudo protetor",
      max: () => 1,
      desc: (c) => "Toque: +" + lvlOf(c) + " de resistência no próximo teste de resistência do alvo. Dura 1 hora.",
    },
  },
  Sol: {
    poder: "Expulsão maior 1 vez por dia: mortos-vivos que seriam expulsos são destruídos.",
    rec: {
      key: "d_sol",
      nome: "Expulsão maior",
      max: () => 1,
      desc: () => "Use no lugar de uma expulsão comum: mortos-vivos que seriam expulsos são destruídos.",
    },
  },
  Sorte: {
    poder: "Boa sorte 1 vez por dia: rola de novo uma jogada que acabou de fazer e fica com o novo resultado.",
    rec: {
      key: "d_sorte",
      nome: "Boa sorte",
      max: () => 1,
      desc: () => "Role de novo uma jogada que acabou de fazer, antes de saber o resultado, e fique com a nova.",
    },
  },
  Terra: {
    poder:
      "Expulsa ou destrói criaturas do ar e fascina ou comanda criaturas da terra, como um clérigo bom expulsa mortos-vivos.",
    restricoes: { 9: "só terra" },
  },
  Vegetal: {
    poder:
      "Expulsa ou destrói criaturas planta e fascina ou comanda criaturas planta. Conhecimento (natureza) vira perícia de classe.",
    per: ["c_nat"],
  },
  Viagem: {
    poder:
      "Liberdade de movimento por 1 rodada por nível de clérigo por dia (como a magia). Sobrevivência vira perícia de classe.",
    per: ["sobrevivencia"],
    rec: {
      key: "d_viagem",
      nome: "Liberdade de movimento (rodadas)",
      max: (c) => lvlOf(c),
      pool: true,
      desc: () => "Move-se normalmente mesmo sob magias e efeitos que impedem o movimento. Gaste em rodadas.",
    },
  },
};
/*
  Completa cada domínio com os dados do SRD (js/dados/srd-dominios.js):
  - m: magias do 1º ao 9º nível, com o nome em português quando houver tradução
  - en e poderSRD: nome e poder concedido originais, em inglês
  O texto "poder" acima é o resumo em português mostrado no app.
*/
export function aplicarSRDDominios() {
  for (const d of SRD_DOMINIOS) {
    const D = DOMAINS[TR_DOMINIOS[d.nome]];
    if (!D) continue;
    D.en = d.nome;
    D.poderSRD = d.poder;
    D.m = d.magias.map((n, i) => {
      const c = magiaPorNomeSRD(n);
      const r = (D.restricoes || {})[i + 1];
      return (c ? c.nome : n) + (r ? ` (${r})` : "");
    });
  }
}
aplicarSRDDominios();
export const DOMAIN_NAMES = Object.keys(DOMAINS).sort((a, b) => a.localeCompare(b));
export function energiaNegativa(c) {
  const k = alignCode(c.tendencia);
  return isEvil(k) || (geNeutral(k) && c.energia === "negativa");
}
export function domList(c) {
  return String(c.dominios || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => DOMAINS[x]);
}
export function domainSpellNames(c, l) {
  const out = new Set();
  for (const d of domList(c)) {
    const n = DOMAINS[d].m[l - 1];
    if (n) out.add(n.replace(/ \(.*\)$/, ""));
  }
  return out;
}
export function domainSpellLevel(c, nome) {
  let best = null;
  for (const d of domList(c)) {
    const i = DOMAINS[d].m.findIndex((x) => x.replace(/ \(.*\)$/, "") === nome);
    if (i >= 0 && (best === null || i + 1 < best)) best = i + 1;
  }
  return best;
}
export function syncDomainSpells(c) {
  if (c.classeKey !== "clerigo") return;
  const maxL = Math.max(1, ...slotTable(c).map((r) => r.l));
  for (let l = 1; l <= maxL; l++)
    for (const n of domainSpellNames(c, l)) {
      const k = CAT.find((x) => x.nome === n);
      if (!k) continue;
      let s = c.grimorio.find((x) => x.nome === n);
      if (!s) {
        s = clone(k);
        delete s.cid;
        s.id = uidGen();
        s.nivel = k.listas.clerigo !== undefined ? k.listas.clerigo : l;
        delete s.listas;
        s.dominio = true;
        s.soDominio = k.listas.clerigo === undefined;
        c.grimorio.push(s);
      } else s.dominio = true;
    }
}
