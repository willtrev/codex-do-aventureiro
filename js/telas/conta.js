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

/* ----- Escolhas ao entrar e ao sair ----- */

const qtd = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const quanto = (x) =>
  [qtd(x.fichas, "ficha", "fichas"), x.campanhas ? qtd(x.campanhas, "campanha", "campanhas") : ""]
    .filter(Boolean)
    .join(" e ");
const botaoEscolha = (a, m, titulo, texto, cls = "") =>
  `<button class="btn escolha ${cls}" data-a="${a}" data-m="${m}"><b>${titulo}</b><span>${texto}</span></button>`;

/** Ao entrar com fichas dos dois lados: usar as da conta, adicionar as da conta ou substituir a conta. */
export function htmlEscolhaAoEntrar(cmp) {
  const quando = cmp.ultima
    ? `, salvas por último em ${new Date(cmp.ultima).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
    : "";
  return `<div data-obrigatorio>
    <h2 style="font-size:18px;color:var(--ink)">Fichas neste navegador e na sua conta</h2>
    <p style="margin:0;line-height:1.5">Neste navegador: <b>${quanto(cmp.navegador)}</b>. Na sua conta Google: <b>${quanto(cmp.conta)}</b>${quando}. O que fazer?</p>
    <div class="escolhas">
      ${botaoEscolha("contajuntar", "conta", "Usar as da conta", "As fichas deste navegador são trocadas pelas salvas na conta.")}
      <p class="small muted escolhas-grupo">Manter as deste navegador e…</p>
      ${botaoEscolha("contajuntar", "adicionar", "…adicionar as da conta como novas", "Nada se perde. Se houver duas com o mesmo nome, a da conta ganha “(conta Google)” no nome.", "pri")}
      ${botaoEscolha("contajuntar", "navegador", "…substituir as da conta por estas", "A conta fica só com as fichas deste navegador. As que estavam só na conta são apagadas.")}
    </div>
    <div class="row"><button class="btn ghost" data-a="contacancelar">Cancelar e não entrar</button></div></div>`;
}

/** Ao sair: manter a cópia deste navegador ou apagar tudo dele. */
export function htmlEscolhaAoSair() {
  return `<h2 style="font-size:18px;color:var(--ink)">Sair da conta Google</h2>
    <p style="margin:0;line-height:1.5">As fichas continuam salvas na sua conta. O que fazer com a cópia deste navegador?</p>
    <div class="escolhas">
      ${botaoEscolha("contasairok", "manter", "Manter neste navegador", "Continuam aqui, mas as mudanças deixam de ir para a conta e para os outros aparelhos.", "pri")}
      ${botaoEscolha("contasairok", "apagar", "Apagar tudo deste navegador", "Fichas e campanhas somem deste aparelho. Na conta, nada muda: é só entrar de novo para trazê-las.", "danger")}
    </div>
    <div class="row"><button class="btn" data-a="close">Cancelar</button></div>`;
}
