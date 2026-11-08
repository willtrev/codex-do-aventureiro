/* ================= Idioma do conteúdo =================
   Controla como nomes e textos vindos do SRD aparecem:
     "ambos" → nome em português com o original em inglês ao lado (padrão)
     "pt"    → só português
     "en"    → só inglês (nomes e texto originais do SRD)
   Os rótulos da interface continuam em português. A escolha fica salva
   no navegador de cada pessoa. */
import { esc } from "../util.js";

export let idioma = "ambos";
try {
  idioma = localStorage.getItem("codex-idioma") || "ambos";
} catch (e) {}
export const IDIOMAS = [
  ["ambos", "PT + EN"],
  ["pt", "PT"],
  ["en", "EN"],
];
export function setIdioma(v) {
  idioma = v;
  try {
    localStorage.setItem("codex-idioma", v);
  } catch (e) {}
}
/** Nome a exibir para qualquer item com {nome, en}. */
export const nomeDe = (x) => (x ? (idioma === "en" && x.en ? x.en : x.nome) : "");
/** Nome em inglês pequeno ao lado, só no modo "ambos". */
export const enTag = (x) =>
  idioma === "ambos" && x && x.en && x.en !== x.nome
    ? ` <span class="small muted" style="font-weight:400">(${esc(x.en)})</span>`
    : "";
/** Nome pronto para HTML: nome principal + tag em inglês. */
export const nomeHTML = (x) => esc(nomeDe(x)) + enTag(x);
/** Texto simples (para <option>, aria-label, busca). */
export const nomeTxt = (x) => (idioma === "ambos" && x && x.en && x.en !== x.nome ? `${x.nome} (${x.en})` : nomeDe(x));
