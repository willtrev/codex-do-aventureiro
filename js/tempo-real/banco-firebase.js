/* ================= Banco em tempo real: Firebase =================
   Implementa a interface descrita em banco.js com o Realtime Database.
   O SDK vem do CDN do Google e só é baixado quando a mesa ou a conta Google é usada. */
import { carregarFirebase } from "./firebase.js";

export async function criarBancoFirebase() {
  const { authMod, dbMod: db, auth: a, db: banco } = await carregarFirebase();
  // Sem conta Google, entra como anônimo: o Firebase guarda a sessão, então a pessoa mantém o mesmo uid
  if (!a.currentUser) await authMod.signInAnonymously(a);
  const usuario = a.currentUser;
  const r = (p) => db.ref(banco, p);
  const val = (s) => (s.exists() ? s.val() : null);
  return {
    tipo: "firebase",
    uid: usuario.uid,
    ler: async (p) => val(await db.get(r(p))),
    gravar: (p, v) => db.set(r(p), v),
    atualizar: (p, v) => db.update(r(p), v),
    remover: (p) => db.remove(r(p)),
    // Transação: só grava se ainda não existir (duas pessoas criando a mesma peça ao mesmo tempo)
    criarSeNaoExiste: async (p, v) =>
      (await db.runTransaction(r(p), (atual) => (atual === null ? v : undefined), { applyLocally: false })).committed,
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
