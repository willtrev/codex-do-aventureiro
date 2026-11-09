/* ================= Conta Google =================
   Login com Google pelo Firebase Authentication. Com a conta, as fichas e as campanhas
   ficam salvas em usuarios/<uid> no Realtime Database e aparecem em qualquer aparelho
   (a sincronização fica em js/armazenamento/nuvem-conta.js).

   Quem já usava a mesa como anônimo tem o login anônimo "promovido" para a conta Google,
   mantendo o mesmo uid (e as mesas em que estava). Se essa conta Google já foi usada em
   outro aparelho, entra nela.

   Com ?banco=local (testes), o login é simulado: não abre janela do Google. */
import { carregarFirebase } from "./firebase.js";
import { reiniciarBanco, usarBancoLocal } from "./banco.js";

const MARCA = "codex-conta"; // lembra neste navegador que há uma conta Google ligada

/** usuario: { uid, nome, email, foto } ou null */
export const conta = { usuario: null, status: "fora", erro: "" };
const ouvintes = new Set();
export const aoMudarConta = (fn) => (ouvintes.add(fn), () => ouvintes.delete(fn));
function mudar(patch) {
  Object.assign(conta, patch);
  ouvintes.forEach((f) => f(conta));
}
const lembrar = (sim) => {
  try {
    if (sim) localStorage.setItem(MARCA, "1");
    else localStorage.removeItem(MARCA);
  } catch (e) {}
};
const lembrado = () => {
  try {
    return localStorage.getItem(MARCA) === "1";
  } catch (e) {
    return false;
  }
};
const deUsuario = (u) => ({
  uid: u.uid,
  nome: u.displayName || (u.email || "").split("@")[0] || "Conta Google",
  email: u.email || "",
  foto: u.photoURL || "",
});

/* ----- Login simulado para os testes (?banco=local) ----- */
const USUARIO_TESTE = { uid: "google-teste", nome: "Pessoa de Teste", email: "teste@exemplo.com", foto: "" };
function entrarSimulado() {
  sessionStorage.setItem("codex-banco-uid", USUARIO_TESTE.uid);
  sessionStorage.setItem("codex-conta-teste", "1");
  return USUARIO_TESTE;
}

/** Ao abrir o app: se este navegador já tinha entrado com Google, recupera a sessão. */
export async function iniciarConta() {
  if (usarBancoLocal()) {
    if (sessionStorage.getItem("codex-conta-teste")) mudar({ usuario: USUARIO_TESTE, status: "dentro" });
    return conta.usuario;
  }
  if (!lembrado()) return null;
  try {
    const { auth } = await carregarFirebase();
    const u = auth.currentUser;
    if (u && !u.isAnonymous) mudar({ usuario: deUsuario(u), status: "dentro" });
    else lembrar(false);
  } catch (e) {
    mudar({ status: "erro", erro: mensagemDaConta(e) });
  }
  return conta.usuario;
}

export async function entrarComGoogle() {
  mudar({ status: "entrando", erro: "" });
  try {
    let usuario;
    if (usarBancoLocal()) usuario = entrarSimulado();
    else {
      const { authMod, auth } = await carregarFirebase();
      const provedor = new authMod.GoogleAuthProvider();
      provedor.setCustomParameters({ prompt: "select_account" });
      let r;
      try {
        r =
          auth.currentUser && auth.currentUser.isAnonymous
            ? await authMod.linkWithPopup(auth.currentUser, provedor)
            : await authMod.signInWithPopup(auth, provedor);
      } catch (e) {
        // A conta Google já existe (usada em outro aparelho): entra nela em vez de ligar ao anônimo
        if (e && /credential-already-in-use|email-already-in-use/.test(e.code || "")) {
          const cred = authMod.GoogleAuthProvider.credentialFromError(e);
          r = await authMod.signInWithCredential(auth, cred);
        } else throw e;
      }
      usuario = deUsuario(r.user);
    }
    lembrar(true);
    reiniciarBanco();
    mudar({ usuario, status: "dentro" });
    return usuario;
  } catch (e) {
    const cancelou = /popup-closed-by-user|cancelled-popup-request/.test((e && e.code) || "");
    mudar({ status: conta.usuario ? "dentro" : "fora", erro: cancelou ? "" : mensagemDaConta(e) });
    if (cancelou) return null;
    throw new Error(mensagemDaConta(e));
  }
}

export async function sairDaConta() {
  if (usarBancoLocal()) {
    sessionStorage.removeItem("codex-conta-teste");
    sessionStorage.removeItem("codex-banco-uid");
  } else {
    try {
      const { authMod, auth } = await carregarFirebase();
      await authMod.signOut(auth);
    } catch (e) {}
  }
  lembrar(false);
  reiniciarBanco();
  mudar({ usuario: null, status: "fora", erro: "" });
}

export function mensagemDaConta(e) {
  const c = String((e && (e.code || e.message)) || e || "");
  if (/unauthorized-domain/.test(c))
    return `Este endereço (${location.hostname}) não está liberado para o login. No Firebase, abra Authentication → Settings → Authorized domains e adicione-o.`;
  if (/operation-not-allowed|configuration-not-found/.test(c))
    return "O login com Google não está ativado no Firebase. Em Authentication → Sign-in method, ative o provedor Google.";
  if (/popup-blocked/.test(c))
    return "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.";
  if (/network|Failed to fetch|import/i.test(c)) return "Sem conexão com a internet ou com o Google.";
  return (e && e.message) || "Não foi possível entrar com o Google.";
}
