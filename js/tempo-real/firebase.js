/* ================= Firebase: carregamento único =================
   Baixa o SDK do CDN do Google uma vez e inicia o app. Usado pelo banco (banco-firebase.js)
   e pela conta Google (conta.js), que precisam do mesmo login. */
import { FIREBASE_CONFIG, FIREBASE_VERSAO } from "./config.js";

const cdn = (m) => `https://www.gstatic.com/firebasejs/${FIREBASE_VERSAO}/firebase-${m}.js`;
let promessa = null;

/** → { authMod, dbMod, auth, db }: módulos do SDK e as instâncias de login e banco. */
export function carregarFirebase() {
  if (!promessa)
    promessa = Promise.all([
      import(/* @vite-ignore */ cdn("app")),
      import(/* @vite-ignore */ cdn("auth")),
      import(/* @vite-ignore */ cdn("database")),
    ])
      .then(async ([appMod, authMod, dbMod]) => {
        const app = appMod.initializeApp(FIREBASE_CONFIG, "codex");
        const auth = authMod.getAuth(app);
        await auth.authStateReady(); // sessão salva no navegador (anônima ou Google) já carregada
        return { authMod, dbMod, auth, db: dbMod.getDatabase(app) };
      })
      .catch((e) => {
        promessa = null;
        throw e;
      });
  return promessa;
}
