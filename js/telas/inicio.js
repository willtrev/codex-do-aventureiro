/* ================= Tela inicial =================
   Aparece quando a pessoa ainda não tem nenhum personagem
   (primeiro acesso, ou depois de excluir todos). */
import { contaDisponivel, seloConta } from "./conta.js";
import { statusHTML, storeMode } from "../armazenamento/armazenamento.js";
import { theme } from "../interface/tema.js";
import { IDIOMAS, idioma } from "../interface/idioma.js";
import { volis } from "../personagens/modelos.js";
import { testChars } from "../personagens/testes.js";
import { esc } from "../util.js";

/** true enquanto a conta do Claude ainda está carregando os personagens salvos. */
export let nuvemPendente = typeof window !== "undefined" && !!window.claude && typeof window.claude.use === "function";

export function vInicio() {
  const toggles = `<span class="theme" role="group" aria-label="Idioma do conteúdo">${IDIOMAS.map(
    ([k, n]) => `<button data-a="lang" data-l="${k}" aria-pressed="${idioma === k}">${n}</button>`
  ).join("")}</span>
     <span class="theme" role="group" aria-label="Tema">${[
       ["light", "Claro"],
       ["dark", "Escuro"],
       ["auto", "Automático"],
     ]
       .map(([k, n]) => `<button data-a="theme" data-t="${k}" aria-pressed="${theme === k}">${n}</button>`)
       .join("")}</span>`;
  document.getElementById("top").innerHTML = `
   <div class="idrow"><h1>Códex do Aventureiro</h1><span class="sub">Fichas de D&amp;D 3.5</span></div>
   <div class="row"><span class="status" id="st">${statusHTML()}</span>${seloConta()}<span class="spacer"></span>${toggles}</div>`;

  if (nuvemPendente)
    return `<div class="grid"><section class="card c12 inicio-hero"><h2>Carregando</h2><p style="margin:0">Buscando seus personagens salvos…</p></section></div>`;

  return `<div class="grid">
  <section class="card c12 inicio-hero">
    <h2>Bem-vindo</h2>
    <p class="inicio-titulo">Seu livro de aventuras ainda está em branco.</p>
    <p style="margin:0;max-width:62ch;line-height:1.55">Crie um personagem de qualquer uma das 11 classes do Livro do Jogador. O Códex calcula a ficha (CA, ataques, testes de resistência, perícias e magias por dia) e acompanha PV, magias e munição durante a sessão.</p>
    <div class="row"><button class="btn pri" data-a="newchar">Criar personagem</button></div>
  </section>
  ${secaoDados()}
  <section class="card c6">
    <h2>Já tem um personagem?</h2>
    <p class="small muted" style="margin:0">Traga a ficha em PDF: o modelo oficial de 4 páginas ou outra ficha com texto.</p>
    <div class="row"><button class="btn pri" data-a="importpdf">Importar ficha em PDF</button></div>
    <p class="small muted" style="margin:0">Ou cole o texto copiado em <b>Notas e backup → Copiar backup</b>.</p>
    <label class="f" for="impbox">Backup<textarea id="impbox" placeholder='{"nome": ...}' style="min-height:110px"></textarea></label>
    <div class="row"><button class="btn" data-a="import">Importar</button><span id="impmsg" class="small muted" role="status"></span></div>
  </section>
  <section class="card c6">
    <h2>Só quer conhecer?</h2>
    <p class="small muted" style="margin:0">Escolha personagens prontos para explorar: Volis, um mago encantador elfo cinzento, e um aventureiro de nível 1 de cada classe. Pode pegar um só ou vários, e dá para excluir depois.</p>
    <div class="row"><button class="btn" data-a="loadexamples">Carregar exemplos</button></div>
  </section>
  <section class="card c12">
    <div class="row"><div style="flex:1;min-width:240px"><h2>É o mestre?</h2>
    <p class="small muted" style="margin:6px 0 0">Crie uma campanha e veja as fichas do grupo em cards, com PV, CA e os números de combate.</p></div>
    <a class="btn" href="#mestre">Abrir o hub do mestre</a></div>
  </section>
  </div>`;
}

/** "Onde ficam seus dados": logo abaixo da apresentação, em destaque. */
function secaoDados() {
  const naConta = storeMode === "cloud";
  return `<section class="card c12 inicio-dados ${naConta ? "nuvem" : "local"}" aria-labelledby="dados_tit">
    <div class="inicio-dados-topo">
      <span class="inicio-dados-selo">${naConta ? "Salvo na conta" : "Importante"}</span>
      <h2 id="dados_tit">Onde ficam seus dados</h2>
    </div>
    <p class="inicio-dados-texto">${
      naConta
        ? "Os personagens ficam salvos na sua conta e aparecem em qualquer aparelho em que você entrar."
        : "Os personagens ficam salvos <b>só neste navegador</b>. Limpar os dados de navegação, usar aba anônima ou trocar de navegador ou de aparelho faz eles não aparecerem. Depois de cada sessão, use <b>Notas e backup → Copiar backup</b> e guarde o texto."
    }</p>
    ${
      !naConta && contaDisponivel()
        ? `<div class="row"><button class="btn pri" data-a="contaentrar">Entrar com Google</button><span class="small muted">As fichas ficam salvas na sua conta e aparecem em qualquer aparelho.</span></div>`
        : ""
    }
  </section>`;
}

/* ---------- Escolher personagens de exemplo ---------- */

/** Personagens prontos que dá para carregar: Volis e um de cada classe. chave: "volis" ou a classe. */
export function exemplos() {
  return [{ chave: "volis", c: volis(1) }, ...testChars().map((c) => ({ chave: c.classeKey, c }))];
}
export function htmlEscolherExemplos() {
  const itens = exemplos()
    .map(
      ({ chave, c }) => `<label class="ex-item"><input type="checkbox" name="exemplo" value="${chave}" checked>
        <span><b>${esc(c.nome)}</b><span class="small muted">${esc(c.classe)} ${c.nivel || 1} · ${esc(c.raca)}</span></span></label>`
    )
    .join("");
  return `<h2 style="font-size:18px;color:var(--ink)">Carregar exemplos</h2>
    <p class="small muted" style="margin:0">Marque um ou vários.</p>
    <div class="row"><button class="btn sm" data-a="exmarcar" data-v="1">Marcar todos</button><button class="btn sm" data-a="exmarcar" data-v="0">Desmarcar todos</button></div>
    <div class="ex-lista">${itens}</div>
    <div class="row"><button class="btn pri" data-a="exok">Carregar selecionados</button><button class="btn" data-a="close">Cancelar</button><span id="exmsg" class="small" role="status"></span></div>`;
}

/* Funções para outros arquivos alterarem as variáveis deste (imports são somente leitura). */
export function setNuvemPendente(v) {
  nuvemPendente = v;
}
