/* ================= Banco em tempo real: Firebase =================
   Implementa a interface descrita em banco.js com o Realtime Database.
   O SDK vem do CDN do Google e só é baixado quando alguém abre ou entra numa mesa. */
import { FIREBASE_CONFIG, FIREBASE_VERSAO } from "./config.js";

const cdn = (m) => `https://www.gstatic.com/firebasejs/${FIREBASE_VERSAO}/firebase-${m}.js`;

export async function criarBancoFirebase() {
  const [app, auth, db] = await Promise.all([
    import(/* @vite-ignore */ cdn("app")),
    import(/* @vite-ignore */ cdn("auth")),
    import(/* @vite-ignore */ cdn("database")),
  ]);
  const fb = app.initializeApp(FIREBASE_CONFIG, "codex-mesa");
  const a = auth.getAuth(fb);
  // Login anônimo: o Firebase guarda a sessão no navegador, então a pessoa mantém o mesmo uid
  const usuario = await new Promise((ok, erro) => {
    const parar = auth.onAuthStateChanged(a, (u) => {
      if (u) {
        parar();
        ok(u);
      }
    });
    if (!a.currentUser) auth.signInAnonymously(a).catch(erro);
  });
  const banco = db.getDatabase(fb);
  const r = (p) => db.ref(banco, p);
  const val = (s) => (s.exists() ? s.val() : null);
  return {
    tipo: "firebase",
    uid: usuario.uid,
    ler: async (p) => val(await db.get(r(p))),
    gravar: (p, v) => db.set(r(p), v),
    atualizar: (p, v) => db.update(r(p), v),
    remover: (p) => db.remove(r(p)),
    ouvir: (p, cb) => db.onValue(r(p), (s) => cb(val(s))),
    ouvirFilhos(p, { adicionado, mudado, removido }) {
      const offs = [];
      if (adicionado) offs.push(db.onChildAdded(r(p), (s) => adicionado(s.key, s.val())));
      if (mudado) offs.push(db.onChildChanged(r(p), (s) => mudado(s.key, s.val())));
      if (removido) offs.push(db.onChildRemoved(r(p), (s) => removido(s.key)));
      return () => offs.forEach((f) => f());
    },
    // Executado pelo servidor quando a conexão cai (aba fechada, internet caiu)
    aoDesconectar: (p, v) => db.onDisconnect(r(p)).set(v),
    cancelarDesconexao: (p) => db.onDisconnect(r(p)).cancel(),
    conexao: (cb) => db.onValue(r(".info/connected"), (s) => cb(!!s.val())),
  };
}
