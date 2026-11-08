/* ================= Mesa online: lado do jogador =================
   O selo "Mesa" no topo da ficha e a janela para entrar com o código do mestre.
   O selo é atualizado sozinho (sem redesenhar a tela) quando a conexão muda. */
import { esc } from "../util.js";
import { cur } from "../interface/estado.js";
import { modal } from "../interface/modais.js";
import { aoMudarConexao, conexaoJogador } from "../tempo-real/mesa.js";

export function seloMesa(c) {
  const x = conexaoJogador;
  let conteudo;
  if (!c || !c.mesa) conteudo = `<button class="btn sm" data-a="mesaentrar">Entrar numa mesa</button>`;
  else {
    const daFicha = x.charId === c.id;
    const st = daFicha ? x.status : "conectando";
    const txt = {
      conectando: "conectando…",
      "ao-vivo": "ao vivo",
      offline: "sem conexão, tentando de novo",
      erro: "erro",
      fora: "desconectada",
    }[st];
    const cls = st === "ao-vivo" ? "ok" : st === "erro" ? "err" : "pend";
    conteudo = `<span class="status" title="${esc(st === "erro" ? x.erro : "A ficha é enviada ao mestre a cada mudança")}"><span class="dot ${cls}"></span>Mesa&nbsp;<b>${esc(c.mesa.codigo)}</b>${c.mesa.nome ? "&nbsp;· " + esc(c.mesa.nome) : ""}&nbsp;· ${txt}</span>
      ${st === "erro" ? `<button class="btn sm" data-a="mesareconectar">Tentar de novo</button>` : ""}
      ${st === "ao-vivo" ? `<button class="btn sm pri" data-a="abrircombate" data-p="jogador">Mapa</button>` : ""}
      <button class="btn sm ghost" data-a="mesasair">Sair da mesa</button>`;
  }
  return `<span id="mesaselo" class="row" style="gap:6px">${conteudo}</span>`;
}
/** Atualiza só o selo, sem tocar no resto da página (campos em edição continuam intactos). */
export function atualizarSelo() {
  const el = document.getElementById("mesaselo");
  if (el) el.outerHTML = seloMesa(cur());
}
if (typeof document !== "undefined") aoMudarConexao(atualizarSelo);

export function entrarMesaModal(c, codigo = "") {
  modal(`<div class="row"><h2 style="font-size:18px;color:var(--ink)">Entrar numa mesa</h2><span class="spacer"></span><button class="btn sm ghost" data-a="close">Fechar</button></div>
  ${
    c
      ? `<p style="margin:0;line-height:1.5">A ficha de <b>${esc(c.nome)}</b> vai para o hub do mestre e se atualiza sozinha a cada mudança: PV, CA, efeitos ativos como Armadura Arcana e o resto da ficha.</p>
  <div class="row" style="align-items:flex-end"><label class="f" for="mesa_cod">Código da mesa<input id="mesa_cod" type="text" maxlength="7" autocomplete="off" value="${esc(codigo)}" placeholder="ex.: K7M2QX" style="text-transform:uppercase;letter-spacing:.15em;font-weight:700;width:12ch"></label>
  <button class="btn pri" data-a="mesaentrarok">Entrar</button></div>
  <span id="mesa_msg" class="small" role="status"></span>`
      : `<p style="margin:0;line-height:1.5">Para entrar na mesa${codigo ? ` <b>${esc(codigo)}</b>` : ""}, crie ou importe o seu personagem primeiro.</p>
  <div class="row"><button class="btn pri" data-a="newchar">Criar personagem</button><button class="btn" data-a="importpdf">Importar ficha em PDF</button></div>`
  }`);
}
