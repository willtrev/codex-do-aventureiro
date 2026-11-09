/* ================= Banco em tempo real =================
   Interface única usada pela mesa, com duas implementações:
     banco-firebase.js → Firebase Realtime Database (o normal)
     banco-local.js    → simulado no navegador, para testes (?banco=local no endereço)

   Interface:
     uid                                  quem é esta pessoa (login anônimo)
     ler(caminho)                         → valor atual (ou null)
     gravar(caminho, valor) / atualizar(caminho, {campo: valor}) / remover(caminho)
     criarSeNaoExiste(caminho, valor)     → true se gravou; não sobrescreve o que já existe
     ouvir(caminho, cb)                   → cb(valor) agora e a cada mudança; devolve a função para parar
     ouvirFilhos(caminho, {adicionado, mudado, removido}) → um aviso por filho; devolve a função para parar
     aoDesconectar(caminho, valor)        o servidor grava isso quando a conexão cair
     cancelarDesconexao(caminho)
     conexao(cb)                          cb(true|false) quando a conexão cai ou volta */
import { criarBancoFirebase } from "./banco-firebase.js";
import { criarBancoLocal } from "./banco-local.js";

let promessa = null;
export function usarBancoLocal() {
  try {
    return new URLSearchParams(location.search).get("banco") === "local";
  } catch (e) {
    return false;
  }
}
/** Esquece a conexão atual: a próxima chamada conecta com o login novo (entrou ou saiu da conta Google). */
export function reiniciarBanco() {
  promessa = null;
}
/** Conecta uma vez só e reaproveita a conexão. */
export function conectarBanco() {
  if (!promessa)
    promessa = (usarBancoLocal() ? Promise.resolve(criarBancoLocal()) : criarBancoFirebase()).catch((e) => {
      promessa = null;
      throw e;
    });
  return promessa;
}
