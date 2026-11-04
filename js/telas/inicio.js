/* ================= Tela inicial =================
   Aparece quando a pessoa ainda não tem nenhum personagem
   (primeiro acesso, ou depois de excluir todos). */

/** true enquanto a conta do Claude ainda está carregando os personagens salvos. */
let nuvemPendente = !!(window.claude && typeof window.claude.use === "function");

function vInicio() {
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
   <div class="row"><span class="status" id="st">${statusHTML()}</span><span class="spacer"></span>${toggles}</div>`;

  if (nuvemPendente)
    return `<div class="grid"><section class="card c12 inicio-hero"><h2>Carregando</h2><p style="margin:0">Buscando seus personagens salvos…</p></section></div>`;

  return `<div class="grid">
  <section class="card c12 inicio-hero">
    <h2>Bem-vindo</h2>
    <p class="inicio-titulo">Seu livro de aventuras ainda está em branco.</p>
    <p style="margin:0;max-width:62ch;line-height:1.55">Crie um personagem de qualquer uma das 11 classes do Livro do Jogador. O Códex calcula a ficha (CA, ataques, testes de resistência, perícias e magias por dia) e acompanha PV, magias e munição durante a sessão.</p>
    <div class="row"><button class="btn pri" data-a="newchar">Criar personagem</button></div>
  </section>
  <section class="card c6">
    <h2>Já tem um personagem?</h2>
    <p class="small muted" style="margin:0">Cole aqui o texto copiado em <b>Notas e backup → Copiar backup</b>.</p>
    <label class="f" for="impbox">Backup<textarea id="impbox" placeholder='{"nome": ...}' style="min-height:110px"></textarea></label>
    <div class="row"><button class="btn" data-a="import">Importar</button><span id="impmsg" class="small muted" role="status"></span></div>
  </section>
  <section class="card c6">
    <h2>Só quer conhecer?</h2>
    <p class="small muted" style="margin:0">Carrega personagens prontos para explorar: Volis, um mago encantador elfo cinzento, e um personagem de teste de nível 1 para cada classe. Dá para excluir todos depois.</p>
    <div class="row"><button class="btn" data-a="loadexamples">Carregar exemplos</button></div>
  </section>
  <section class="card c12">
    <h2>Onde ficam seus dados</h2>
    <p class="small" style="margin:0;line-height:1.55">${
      storeMode === "cloud"
        ? "Os personagens ficam salvos na sua conta e aparecem em qualquer aparelho em que você entrar."
        : "Os personagens ficam salvos <b>neste navegador</b>. Limpar os dados de navegação, usar aba anônima ou trocar de navegador ou de aparelho faz eles não aparecerem. Depois de cada sessão, use <b>Notas e backup → Copiar backup</b> e guarde o texto."
    }</p>
  </section>
  </div>`;
}
