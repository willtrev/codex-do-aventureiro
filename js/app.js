/* ================= Início ================= */
(function start() {
  readHash();
  const local = loadLocal();
  if (local && Object.keys(local.chars).length) {
    state = local;
    if (!state.chars[state.active]) state.active = Object.keys(state.chars)[0];
  } else {
    // Primeiro acesso: começa sem personagens e mostra a tela inicial.
    state = { chars: {}, active: null, mig: MIG_ATUAL };
  }
  migrate();
  render();
  initCloud().finally(() => {
    nuvemPendente = false;
    render();
  });
})();
