/* ================= Conta Google: selo no topo =================
   "Entrar com Google" ou a foto e o nome de quem entrou, com "Sair".
   Atualizado sozinho quando a conta muda. Dentro do Claude (artefato) não aparece:
   lá as fichas já ficam na conta do Claude. */
import { esc } from "../util.js";
import { aoMudarConta, conta } from "../tempo-real/conta.js";

export const contaDisponivel = () =>
  typeof window !== "undefined" && !(window.claude && typeof window.claude.use === "function");

export function seloConta() {
  if (!contaDisponivel()) return "";
  const u = conta.usuario;
  let dentro;
  if (u)
    dentro = `${u.foto ? `<img src="${esc(u.foto)}" alt="" class="conta-foto" referrerpolicy="no-referrer">` : `<span class="conta-foto conta-inicial">${esc(u.nome[0] || "?")}</span>`}
      <span class="small conta-nome" title="${esc(u.email)}">${esc(u.nome)}</span>
      <button class="btn sm ghost" data-a="contasair">Sair</button>`;
  else if (conta.status === "entrando") dentro = `<span class="small muted">Entrando…</span>`;
  else
    dentro = `<button class="btn sm" data-a="contaentrar" title="Salva as fichas na sua conta Google e abre em qualquer aparelho">Entrar com Google</button>`;
  return `<span id="contaselo" class="row" style="gap:6px;flex-wrap:nowrap">${dentro}</span>`;
}
export function atualizarSeloConta() {
  document.querySelectorAll("#contaselo").forEach((el) => (el.outerHTML = seloConta()));
}
if (typeof document !== "undefined") aoMudarConta(atualizarSeloConta);
