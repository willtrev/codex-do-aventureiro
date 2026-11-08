/*
  Tradução automática dos campos de regra das magias do SRD (execução, alcance, duração, teste etc.).
  Usa frases conhecidas primeiro e, para o resto, troca palavra por palavra.
*/
import { TR_DESCRITORES } from "../dados/traducoes.js";

export const pesParaMetros = (pes) => String(Math.round(pes * 0.3 * 10) / 10).replace(".", ",");

/* Trocas comuns aplicadas no fim de todos os campos */
export const TR_PALAVRAS = [
  [/;\s*see text/gi, "; ver texto"],
  [/\bsee text\b/gi, "ver texto"],
  [/\(see text\)/gi, "(ver texto)"],
  [/(\d+)\s*ft\.\/level/gi, (m, n) => `${pesParaMetros(+n)} m/nível`],
  [/(\d+)\s*-?\s*ft\.?/gi, (m, n) => `${pesParaMetros(+n)} m`],
  [/(\d+)\s*-?\s*foot/gi, (m, n) => `${pesParaMetros(+n)} m`],
  [/\bone mile\b/gi, "1,6 km"],
  [/(\d+) miles/gi, (m, n) => `${Math.round(n * 1.6)} km`],
  [/mile\/level/gi, "1,6 km/nível"],
  [/\bmin\.\/level/gi, "min/nível"],
  [/\bminutes?\/level/gi, "min/nível"],
  [/\bhours?\/level/gi, "hora/nível"],
  [/\brounds?\/level/gi, "rodada/nível"],
  [/\bdays?\/level/gi, "dia/nível"],
  [/\/level/gi, "/nível"],
  [/\bOne day/g, "1 dia"],
  [/\bOne minute/g, "1 minuto"],
  [/\bminutes\b/gi, "minutos"],
  [/\bminute\b/gi, "minuto"],
  [/\bhours\b/gi, "horas"],
  [/\bhour\b/gi, "hora"],
  [/\brounds\b/gi, "rodadas"],
  [/\bround\b/gi, "rodada"],
  [/\bdays\b/gi, "dias"],
  [/\bday\b/gi, "dia"],
  [/\bper three levels\b/gi, "a cada três níveis"],
  [/\bper HD of subject\b/gi, "por DV do alvo"],
  [/\bInstantaneous\b/gi, "instantânea"],
  [/\bPermanent\b/gi, "permanente"],
  [/\bConcentration\b/gi, "concentração"],
  [/\buntil discharged\b/gi, "até ser descarregada"],
  [/\bwhichever comes first\b/gi, "o que vier primeiro"],
  [/\buntil used\b/gi, "até ser usada"],
  [/\buntil completed\b/gi, "até ser cumprida"],
  [/\buntil landing\b/gi, "até pousar"],
  [/\bup to\b/gi, "até"],
  [/\bor less\b/gi, "ou menos"],
  [/\bor longer\b/gi, "ou mais"],
  [/\bAt least\b/gi, "pelo menos"],
  [/\bcreated\b/gi, "criado"],
  [/\blevels\b/gi, "níveis"],
  [/\blevel\b/gi, "nível"],
  [/\bvaries\b/gi, "varia"],
  [/\bUnlimited\b/gi, "ilimitado"],
  [/\bAnywhere within the area to be warded\b/gi, "qualquer ponto da área protegida"],
  [/\bPersonal\b/g, "pessoal"],
  [/\bpersonal\b/g, "pessoal"],
  [/\bTouch\b/g, "toque"],
  [/\btouch\b/g, "toque"],
  [/\bor\b/g, "ou"],
  [/\band\b/g, "e"],
  [/\bper\b/g, "por"],
  [/\bthen\b/g, "depois"],
];
export function trocarPalavras(t) {
  let s = String(t);
  for (const [re, novo] of TR_PALAVRAS) s = s.replace(re, novo);
  return s;
}
export function trExecucao(t) {
  if (!t) return "padrão";
  return trocarPalavras(
    String(t)
      .replace(/\b1 standard action\b/gi, "padrão")
      .replace(/\b1 free action\b/gi, "ação livre")
      .replace(/\b(\d+) full rounds?\b/gi, (m, n) => (n === "1" ? "1 rodada completa" : `${n} rodadas completas`))
  );
}
export function trAlcance(t) {
  if (!t) return "—";
  return trocarPalavras(
    String(t)
      .replace(/Close \(25 ft\. \+ 5 ft\.\/2 levels\)/gi, "curto")
      .replace(/Medium \(100 ft\. \+ 10 ft\.\/? ?level\)/gi, "médio")
      .replace(/Long \(400 ft\. \+ 40 ft\.\/level\)/gi, "longo")
      .replace(/\bclose \(25 ft\. \+ 5 ft\.\/2 levels\)/gi, "curto")
  );
}
export const trDuracao = (t) => (t ? trocarPalavras(t) : "—");
export const TR_TESTES = [
  ["Will negates (harmless, object)", "Vontade evita (aliado ou objeto pode aceitar sem teste)"],
  ["Will negates (harmless)", "Vontade evita (aliado pode aceitar sem teste)"],
  ["Will negates (object)", "Vontade evita, se o objeto for de alguém"],
  ["Will negates (blinding only)", "Vontade evita a cegueira"],
  ["Will negates", "Vontade evita o efeito"],
  ["Will disbelief (if interacted with)", "Vontade percebe a ilusão, ao interagir com ela"],
  ["Will half (harmless)", "Vontade reduz à metade (inofensiva)"],
  ["Will half", "Vontade reduz à metade"],
  ["Will partial", "Vontade reduz o efeito"],
  ["Fortitude negates (harmless)", "Fortitude evita (aliado pode aceitar sem teste)"],
  ["Fortitude negates (object)", "Fortitude evita, se o objeto for de alguém"],
  ["Fortitude negates", "Fortitude evita o efeito"],
  ["Fortitude partial (object)", "Fortitude reduz o efeito (objeto)"],
  ["Fortitude partial", "Fortitude reduz o efeito"],
  ["Fortitude half", "Fortitude reduz o dano à metade"],
  ["Reflex negates (object)", "Reflexos evita (objeto)"],
  ["Reflex negates", "Reflexos evita o efeito"],
  ["Reflex half", "Reflexos reduz o dano à metade"],
  ["Reflex partial", "Reflexos reduz o efeito"],
  ["None", "nenhum"],
  ["No", "nenhum"],
];
export function trTeste(t) {
  if (!t) return "nenhum";
  let s = String(t);
  for (const [en, pt] of TR_TESTES) s = s.split(en).join(pt);
  return trocarPalavras(s);
}
export function trRM(t) {
  if (!t) return "—";
  return trocarPalavras(
    String(t)
      .replace(/\bYes\b/g, "sim")
      .replace(/\bNo\b/g, "não")
      .replace(/\bno\b/g, "não")
      .replace(/harmless/g, "inofensiva")
      .replace(/object/g, "objeto")
  );
}
export function trComponentes(t) {
  if (!t) return "—";
  if (t.length > 60) return t; // texto longo e raro (ex.: Binding): fica no original
  return trocarPalavras(
    String(t)
      .replace(/\bDF\b/g, "FD")
      .replace(/\bS\b/g, "G")
      .replace(/\(Brd only\)/g, "(só bardo)")
  );
}
export function trDescritores(t) {
  return t
    ? String(t)
        .split(/,\s*/)
        .map((d) => TR_DESCRITORES[d] || d)
        .join(", ")
    : "";
}
