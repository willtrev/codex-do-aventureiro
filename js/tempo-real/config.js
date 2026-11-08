/* ================= Configuração do Firebase =================
   Dados do app web no console do Firebase (Configurações do projeto → Seus apps).
   Em apps web eles são públicos de propósito: quem protege o banco são as regras
   em database.rules.json, coladas na aba Regras do Realtime Database. */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBWDU1jxdofCiFmzhd7WB2IESVMtgXwWVs",
  authDomain: "codex-do-aventureiro-4a306.firebaseapp.com",
  databaseURL: "https://codex-do-aventureiro-4a306-default-rtdb.firebaseio.com",
  projectId: "codex-do-aventureiro-4a306",
  storageBucket: "codex-do-aventureiro-4a306.firebasestorage.app",
  messagingSenderId: "164675602685",
  appId: "1:164675602685:web:953fe08840aff236ce1694",
};

/** Versão do SDK do Firebase carregada do CDN do Google, só quando a mesa online é usada. */
export const FIREBASE_VERSAO = "12.12.0";
