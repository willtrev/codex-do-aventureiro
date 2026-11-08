/* ================= Mesa online =================
   Liga as fichas dos jogadores ao hub do mestre em tempo real.

   Estrutura no banco (regras em database.rules.json):
     mesas/<CÓDIGO>/info               { nome, mestre: uid, criada }
     mesas/<CÓDIGO>/membros/<uid>      { papel: "mestre"|"jogador", nome, online }
     mesas/<CÓDIGO>/fichas/<uid>       { resumo, ficha, atualizado }

   Jogador: entra com o código; a cada mudança na ficha o resumo vai em ~0,15 s
   e a ficha completa em ~2 s (para não enviar a ficha inteira a cada clique).
   Mestre: abre a mesa a partir de uma campanha e recebe as mudanças de cada jogador. */
import { clone } from "../util.js";
import { conectarBanco } from "./banco.js";
import { resumoAoVivo } from "./resumo.js";
import { touch } from "../armazenamento/armazenamento.js";
import { aoAlterarFicha } from "../armazenamento/avisos.js";

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L, para ler e ditar sem confusão
export const gerarCodigo = () =>
  Array.from({ length: 6 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join("");
export const normCodigo = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
export const linkConvite = (codigo) => `${location.origin}${location.pathname}${location.search}#entrar=${codigo}`;

/** Cópia da ficha para enviar: sem as descrições longas das magias. */
export function fichaParaEnvio(c) {
  const x = clone(c);
  delete x.mesa;
  x.grimorio = (x.grimorio || []).map(({ desc, descPt, alvo, ...resto }) => resto);
  return x;
}

/* ---------- Lado do jogador ---------- */

/** status: "fora" | "conectando" | "ao-vivo" | "offline" | "erro" */
export const conexaoJogador = { codigo: null, charId: null, status: "fora", erro: "" };
const ouvintesStatus = new Set();
export const aoMudarConexao = (fn) => (ouvintesStatus.add(fn), () => ouvintesStatus.delete(fn));
function mudarConexao(patch) {
  Object.assign(conexaoJogador, patch);
  ouvintesStatus.forEach((f) => f(conexaoJogador));
}
let pararConexao = null;

export async function entrarNaMesa(codigoDigitado, c) {
  const codigo = normCodigo(codigoDigitado);
  if (codigo.length !== 6) throw new Error("O código da mesa tem 6 letras e números.");
  mudarConexao({ codigo, charId: c.id, status: "conectando", erro: "" });
  try {
    const b = await conectarBanco();
    const info = await b.ler(`mesas/${codigo}/info`);
    if (!info) throw new Error(`Não existe mesa com o código ${codigo}. Confira o código com o mestre.`);
    const base = `mesas/${codigo}`;
    await b.gravar(`${base}/membros/${b.uid}`, { papel: "jogador", nome: c.nome, online: true });
    await b.aoDesconectar(`${base}/membros/${b.uid}/online`, false);
    await b.gravar(`${base}/fichas/${b.uid}`, {
      resumo: resumoAoVivo(c),
      ficha: fichaParaEnvio(c),
      atualizado: Date.now(),
    });
    c.mesa = { codigo, nome: info.nome };
    if (pararConexao) pararConexao();
    // Quando a internet volta, marca de novo como online e reenvia a ficha
    let primeira = true;
    pararConexao = b.conexao(async (ok) => {
      mudarConexao({ status: ok ? "ao-vivo" : "offline" });
      if (ok && !primeira && c.mesa) {
        await b.gravar(`${base}/membros/${b.uid}/online`, true);
        await b.aoDesconectar(`${base}/membros/${b.uid}/online`, false);
        publicarAgora(c);
      }
      primeira = false;
    });
    mudarConexao({ status: "ao-vivo" });
    touch(c.id);
    return info;
  } catch (e) {
    mudarConexao({ status: "erro", erro: mensagemDeErro(e) });
    throw new Error(mensagemDeErro(e));
  }
}

export async function sairDaMesa(c) {
  if (!c || !c.mesa) return;
  const base = `mesas/${c.mesa.codigo}`;
  delete c.mesa;
  touch(c.id);
  if (pararConexao) pararConexao();
  pararConexao = null;
  mudarConexao({ codigo: null, charId: null, status: "fora", erro: "" });
  try {
    const b = await conectarBanco();
    await b.cancelarDesconexao(`${base}/membros/${b.uid}/online`);
    await b.remover(`${base}/fichas/${b.uid}`);
    await b.remover(`${base}/membros/${b.uid}`);
  } catch (e) {}
}

/** Volta para a mesa ao abrir o app, se a ficha ativa estava numa. */
export async function reconectar(c) {
  if (!c || !c.mesa) return;
  if (conexaoJogador.charId === c.id && ["ao-vivo", "conectando"].includes(conexaoJogador.status)) return;
  try {
    await entrarNaMesa(c.mesa.codigo, c);
  } catch (e) {}
}

let tResumo = null,
  tFicha = null;
async function enviar(c, campos) {
  try {
    const b = await conectarBanco();
    await b.atualizar(`mesas/${c.mesa.codigo}/fichas/${b.uid}`, { ...campos, atualizado: Date.now() });
  } catch (e) {
    mudarConexao({ status: "erro", erro: mensagemDeErro(e) });
  }
}
function publicarAgora(c) {
  enviar(c, { resumo: resumoAoVivo(c), ficha: fichaParaEnvio(c) });
}
/** Chamado a cada mudança salva na ficha (ver touch em armazenamento.js). */
export function publicar(c) {
  if (!c || !c.mesa || conexaoJogador.charId !== c.id || conexaoJogador.status !== "ao-vivo") return;
  clearTimeout(tResumo);
  tResumo = setTimeout(() => enviar(c, { resumo: resumoAoVivo(c) }), 150);
  clearTimeout(tFicha);
  tFicha = setTimeout(() => enviar(c, { ficha: fichaParaEnvio(c) }), 2000);
}
aoAlterarFicha.add(publicar);

/* ---------- Lado do mestre ---------- */

/** vivos[uid] = { resumo, ficha, online, nome } de cada jogador na mesa aberta. */
export const mesaMestre = { codigo: null, vivos: {}, status: "fora", erro: "" };
let pararEscuta = [];

export async function abrirMesa(g) {
  const b = await conectarBanco();
  let codigo;
  do codigo = gerarCodigo();
  while (await b.ler(`mesas/${codigo}/info`));
  await b.gravar(`mesas/${codigo}/info`, { nome: g.nome, mestre: b.uid, criada: Date.now() });
  await b.gravar(`mesas/${codigo}/membros/${b.uid}`, { papel: "mestre", nome: "Mestre", online: true });
  g.mesa = { codigo };
  return codigo;
}

/**
 * Começa a receber a mesa da campanha. aoMudar(uid, tipo) é chamado a cada novidade:
 * tipo "resumo" (PV, CA, efeitos), "ficha" (ficha completa), "membro" (online/offline) ou "saiu".
 */
export async function escutarMesa(g, aoMudar) {
  if (!g.mesa) return;
  if (mesaMestre.codigo === g.mesa.codigo && mesaMestre.status === "ao-vivo") return;
  pararEscutaMesa();
  Object.assign(mesaMestre, { codigo: g.mesa.codigo, vivos: {}, status: "conectando", erro: "" });
  try {
    const b = await conectarBanco();
    const base = `mesas/${g.mesa.codigo}`;
    const info = await b.ler(`${base}/info`);
    if (!info) throw new Error("A mesa desta campanha não existe mais. Abra uma nova.");
    if (info.mestre !== b.uid)
      throw new Error("Esta mesa foi aberta em outro navegador ou aparelho. Abra uma nova mesa por aqui.");
    await b.gravar(`${base}/membros/${b.uid}/online`, true);
    await b.aoDesconectar(`${base}/membros/${b.uid}/online`, false);
    const vivo = (uid) => (mesaMestre.vivos[uid] = mesaMestre.vivos[uid] || {});
    const naFicha = (uid, v, novo) => {
      const x = vivo(uid);
      const mudouFicha = JSON.stringify(x.ficha) !== JSON.stringify(v.ficha);
      x.resumo = v.resumo;
      x.ficha = v.ficha;
      aoMudar(uid, novo || mudouFicha ? "ficha" : "resumo");
    };
    pararEscuta.push(
      b.ouvirFilhos(`${base}/fichas`, {
        adicionado: (uid, v) => naFicha(uid, v, true),
        mudado: (uid, v) => naFicha(uid, v, false),
        removido: (uid) => {
          delete mesaMestre.vivos[uid];
          aoMudar(uid, "saiu");
        },
      }),
      b.ouvirFilhos(`${base}/membros`, {
        adicionado: (uid, v) => {
          if (v.papel === "mestre") return;
          Object.assign(vivo(uid), { online: !!v.online, nome: v.nome });
          aoMudar(uid, "membro");
        },
        mudado: (uid, v) => {
          if (v.papel === "mestre") return;
          Object.assign(vivo(uid), { online: !!v.online, nome: v.nome });
          aoMudar(uid, "membro");
        },
      })
    );
    mesaMestre.status = "ao-vivo";
  } catch (e) {
    Object.assign(mesaMestre, { status: "erro", erro: mensagemDeErro(e) });
  }
}
export function pararEscutaMesa() {
  pararEscuta.forEach((f) => f());
  pararEscuta = [];
  Object.assign(mesaMestre, { codigo: null, vivos: {}, status: "fora", erro: "" });
}
export async function fecharMesa(g) {
  if (!g.mesa) return;
  const codigo = g.mesa.codigo;
  delete g.mesa;
  pararEscutaMesa();
  try {
    const b = await conectarBanco();
    await b.remover(`mesas/${codigo}`);
  } catch (e) {}
}

/* ---------- Mensagens ---------- */

export function mensagemDeErro(e) {
  const m = String((e && (e.code || e.message)) || e || "");
  if (e && e.message === "lib")
    return "Não foi possível carregar a conexão com a mesa. Verifique a internet e tente de novo.";
  if (/permission|PERMISSION_DENIED/i.test(m))
    return "O banco recusou o acesso. Confira se as regras de database.rules.json foram publicadas no Firebase.";
  if (/admin-restricted|operation-not-allowed/i.test(m))
    return "O login anônimo não está ativado no Firebase (Authentication → Método de login → Anônimo).";
  if (/network|Failed to fetch|import/i.test(m)) return "Sem conexão com a internet ou com o Firebase.";
  return (e && e.message) || "Algo deu errado ao falar com a mesa.";
}
