/* ================= Início ================= */
(function start() {
  readHash();
  const local = loadLocal();
  if (local && Object.keys(local.chars).length) {
    state = local;
    if (!state.chars[state.active]) state.active = Object.keys(state.chars)[0];
  } else {
    const v = volis(1);
    state = { chars: { [v.id]: v }, active: v.id, mig: 4 };
    saveLocal();
  }
  migrate();
  render();
  initCloud();
})();
