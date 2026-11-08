/* ================= Início =================
   Ponto de entrada do app (o index.html carrega só este arquivo).
   Os imports abaixo, sem nomes, garantem que todos os módulos sejam carregados nesta ordem:
   alguns preparam dados ao carregar (classes, domínios) ou registram os eventos de clique. */
import "./util.js";
import "./regras/basicas.js";
import "./dados/traducoes.js";
import "./dados/traducoes-magias.js";
import "./regras/traduzir.js";
import "./dados/srd-magias.js";
import "./dados/srd-classes.js";
import "./dados/srd-dominios.js";
import "./dados/srd-talentos.js";
import "./dados/srd-equipamento.js";
import "./dados/catalogo.js";
import "./regras/classes.js";
import "./personagens/modelos.js";
import "./regras/tendencias.js";
import "./regras/dominios.js";
import "./personagens/testes.js";
import "./armazenamento/migracoes.js";
import "./regras/calculos.js";
import "./armazenamento/armazenamento.js";
import "./interface/tema.js";
import "./interface/idioma.js";
import "./interface/estado.js";
import "./telas/topo.js";
import "./telas/inicio.js";
import "./telas/mestre.js";
import "./telas/painel.js";
import "./telas/magias.js";
import "./telas/pericias.js";
import "./telas/ficha.js";
import "./telas/inventario-notas.js";
import "./pdf/exportar.js";
import "./dados/ficha-campos.js";
import "./pdf/ler-texto.js";
import "./pdf/importar.js";
import "./interface/modais.js";
import "./interface/srd-escolha.js";
import "./interface/eventos.js";

import { MIG_ATUAL, migrate } from "./armazenamento/migracoes.js";
import { initCloud, loadLocal, setState, state } from "./armazenamento/armazenamento.js";
import { readHash } from "./interface/estado.js";
import { render } from "./telas/topo.js";
import { setNuvemPendente } from "./telas/inicio.js";
import { abrirConvitePendente } from "./interface/eventos.js";
import { reconectar } from "./tempo-real/mesa.js";
import { atualizarSelo } from "./telas/mesa-jogador.js";
import { cur } from "./interface/estado.js";

(function start() {
  readHash();
  const local = loadLocal();
  if (local && (Object.keys(local.chars).length || Object.keys(local.campanhas).length)) {
    setState(local);
    if (!state.chars[state.active]) state.active = Object.keys(state.chars)[0] || null;
  } else {
    // Primeiro acesso: começa sem personagens e mostra a tela inicial.
    setState({ chars: {}, active: null, mig: MIG_ATUAL, campanhas: {}, campanhaAtiva: null });
  }
  migrate();
  render();
  abrirConvitePendente();
  initCloud().finally(() => {
    setNuvemPendente(false);
    render();
    // Se a ficha ativa estava numa mesa online, volta para ela
    reconectar(cur()).then(atualizarSelo);
  });
})();
