/* ================= Mesa online =================
   Liga as fichas dos jogadores ao hub do mestre em tempo real.

   Estrutura no banco (regras em database.rules.json):
     mesas/<CÓDIGO>/info               { nome, mestre: uid, criada }
     mesas/<CÓDIGO>/membros/<uid>      { papel: "mestre"|"jogador", nome, online }
     mesas/<CÓDIGO>/fichas/<uid>_<id>  { resumo, ficha, atualizado }   (uma por personagem)
     mesas/<CÓDIGO>/removidas/<uid>_<id>  true   personagem que o mestre tirou da mesa

   As fichas são separadas por personagem: a mesma conta pode levar mais de um personagem
   para a mesa, e o mestre pode testar como jogador com a própria conta sem perder o papel
   de mestre.

   Jogador: entra com o código; a cada mudança na ficha o resumo vai em ~0,15 s
   e a ficha completa em ~2 s (para não enviar a ficha inteira a cada clique).
   Mestre: abre a mesa a partir de uma campanha e recebe as mudanças de cada jogador. */
import { chaveFicha, clone, comoListas, uidDaFicha } from "../util.js";
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
export { chaveFicha, uidDaFicha };
export const linkConvite = (codigo) => `${location.origin}${location.pathname}${location.search}#entrar=${codigo}`;

/** Cópia da ficha para enviar: sem as descrições longas das magias. */
export function fichaParaEnvio(c) {
  const x = clone(c);
  delete x.mesa;
  x.grimorio = (x.grimorio || []).map(({ desc, descPt, alvo, ...resto }) => resto);
  return x;
}

/* ---------- Lado do jogador ---------- */

/** status: "fora" | "conectando" | "ao-vivo" | "offline" | "erro" | "removido" (o mestre tirou) */
export const conexaoJogador = { codigo: null, charId: null, status: "fora", erro: "" };
const ouvintesStatus = new Set();
export const aoMudarConexao = (fn) => (ouvintesStatus.add(fn), () => ouvintesStatus.delete(fn));
function mudarConexao(patch) {
  Object.assign(conexaoJogador, patch);
  ouvintesStatus.forEach((f) => f(conexaoJogador));
}
let pararConexao = null;
let pararRemocao = null;
const pararTudo = () => {
  if (pararConexao) pararConexao();
  if (pararRemocao) pararRemocao();
  pararConexao = pararRemocao = null;
  clearTimeout(tResumo);
  clearTimeout(tFicha);
};

/** O mestre tirou o personagem da mesa: corta a conexão e para de enviar a ficha. */
async function foiRemovido(c, b, base) {
  pararTudo();
  const nomeMesa = (c.mesa && c.mesa.nome) || "";
  delete c.mesa;
  touch(c.id);
  mudarConexao({ status: "removido", erro: `O mestre tirou ${c.nome} da mesa${nomeMesa ? " " + nomeMesa : ""}.` });
  try {
    const fichas = (await b.ler(`${base}/fichas`)) || {};
    if (!Object.keys(fichas).some((k) => uidDaFicha(k) === b.uid))
      await b.cancelarDesconexao(`${base}/membros/${b.uid}/online`);
  } catch (e) {}
}

/**
 * Entra na mesa com o personagem c. voltando=true é a reconexão automática (ao abrir o app):
 * se o mestre tirou o personagem, não volta. Entrar pelo código (voltando=false) é a pessoa
 * pedindo para entrar de novo, e vale.
 */
export async function entrarNaMesa(codigoDigitado, c, voltando = false) {
  const codigo = normCodigo(codigoDigitado);
  if (codigo.length !== 6) throw new Error("O código da mesa tem 6 letras e números.");
  mudarConexao({ codigo, charId: c.id, status: "conectando", erro: "" });
  try {
    const b = await conectarBanco();
    const info = await b.ler(`mesas/${codigo}/info`);
    if (!info) throw new Error(`Não existe mesa com o código ${codigo}. Confira o código com o mestre.`);
    const base = `mesas/${codigo}`;
    const chave = chaveFicha(b.uid, c);
    if (voltando && (await b.ler(`${base}/removidas/${chave}`))) {
      await foiRemovido(c, b, base);
      return null;
    }
    if (!voltando) await b.remover(`${base}/removidas/${chave}`);
    // Quem já é membro (o mestre testando como jogador, ou outro personagem da mesma conta)
    // continua com o papel que tinha: só marca como online
    const membro = await b.ler(`${base}/membros/${b.uid}`);
    if (membro) await b.atualizar(`${base}/membros/${b.uid}`, { online: true });
    else await b.gravar(`${base}/membros/${b.uid}`, { papel: "jogador", nome: c.nome, online: true });
    await b.aoDesconectar(`${base}/membros/${b.uid}/online`, false);
    await b.gravar(`${base}/fichas/${chave}`, {
      resumo: resumoAoVivo(c),
      ficha: fichaParaEnvio(c),
      atualizado: Date.now(),
    });
    c.mesa = { codigo, nome: info.nome };
    pararTudo();
    pararRemocao = b.ouvir(`${base}/removidas/${chave}`, (v) => {
      if (v && c.mesa && c.mesa.codigo === codigo) foiRemovido(c, b, base);
    });
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

/**
 * Tira o personagem da mesa: apaga a ficha dele e a peça do mapa. A pessoa só deixa de ser
 * membro se não tiver outro personagem na mesa e não for o mestre.
 * Com apagar=false (personagem excluído do app) não mexe em c, que já vai sumir.
 */
export async function sairDaMesa(c, apagar = true) {
  if (!c || !c.mesa) return;
  const base = `mesas/${c.mesa.codigo}`;
  if (apagar) {
    delete c.mesa;
    touch(c.id);
  }
  if (conexaoJogador.charId === c.id) {
    pararTudo();
    mudarConexao({ codigo: null, charId: null, status: "fora", erro: "" });
  }
  try {
    const b = await conectarBanco();
    const chave = chaveFicha(b.uid, c);
    // Cada passo separado: se um falhar, os outros ainda acontecem
    await b.remover(`${base}/mapa/tokens/pj_${chave}`).catch(() => {});
    await b.remover(`${base}/fichas/${chave}`);
    const fichas = (await b.ler(`${base}/fichas`)) || {};
    const outras = Object.keys(fichas).some((k) => uidDaFicha(k) === b.uid);
    const membro = await b.ler(`${base}/membros/${b.uid}`);
    if (!outras && membro && membro.papel !== "mestre") {
      await b.cancelarDesconexao(`${base}/membros/${b.uid}/online`);
      await b.remover(`${base}/membros/${b.uid}`);
    }
  } catch (e) {}
}

/** Volta para a mesa ao abrir o app, se a ficha ativa estava numa. */
export async function reconectar(c, forcar = false) {
  if (!c || !c.mesa) return;
  if (!forcar && conexaoJogador.charId === c.id && ["ao-vivo", "conectando"].includes(conexaoJogador.status)) return;
  try {
    await entrarNaMesa(c.mesa.codigo, c, true);
  } catch (e) {}
}

let tResumo = null,
  tFicha = null;
async function enviar(c, campos) {
  try {
    const b = await conectarBanco();
    await b.atualizar(`mesas/${c.mesa.codigo}/fichas/${chaveFicha(b.uid, c)}`, { ...campos, atualizado: Date.now() });
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

/** vivos[chave da ficha] = { resumo, ficha, online } de cada personagem na mesa aberta. */
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
/**
 * Mestre tira um personagem da mesa: marca como removido (o jogador corta a conexão sozinho
 * e não volta ao reabrir o app) e apaga a ficha e a peça do mapa.
 */
export async function tirarDaMesa(codigo, chave) {
  if (!codigo || !chave) return;
  const b = await conectarBanco();
  const base = `mesas/${codigo}`;
  await b.gravar(`${base}/removidas/${chave}`, true);
  await b.remover(`${base}/fichas/${chave}`);
  await b.remover(`${base}/mapa/tokens/pj_${chave}`);
  delete mesaMestre.vivos[chave];
}

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
    // Regrava o papel de mestre (garante que continua mestre mesmo depois de testar como jogador)
    await b.gravar(`${base}/membros/${b.uid}`, { papel: "mestre", nome: "Mestre", online: true });
    await b.aoDesconectar(`${base}/membros/${b.uid}/online`, false);
    // Personagens que saíram enquanto o mestre estava fora: o hub tira os cards deles
    aoMudar(Object.keys((await b.ler(`${base}/fichas`)) || {}), "presentes");
    const vivo = (chave) => (mesaMestre.vivos[chave] = mesaMestre.vivos[chave] || {});
    const online = {}; // uid → online, vindo de membros
    const naFicha = (chave, v, novo) => {
      const x = vivo(chave);
      const mudouFicha = JSON.stringify(x.ficha) !== JSON.stringify(v.ficha);
      x.resumo = comoListas(v.resumo);
      x.ficha = comoListas(v.ficha);
      x.online = !!online[uidDaFicha(chave)];
      aoMudar(chave, novo || mudouFicha ? "ficha" : "resumo");
    };
    const noMembro = (uid, v) => {
      online[uid] = !!(v && v.online);
      // Avisa cada personagem dessa pessoa (uma conta pode ter mais de um na mesa)
      for (const [chave, x] of Object.entries(mesaMestre.vivos))
        if (uidDaFicha(chave) === uid) {
          x.online = online[uid];
          aoMudar(chave, "membro");
        }
    };
    pararEscuta.push(
      b.ouvirFilhos(`${base}/membros`, {
        adicionado: noMembro,
        mudado: noMembro,
        removido: (uid) => noMembro(uid, null),
      }),
      b.ouvirFilhos(`${base}/fichas`, {
        adicionado: (chave, v) => naFicha(chave, v, true),
        mudado: (chave, v) => naFicha(chave, v, false),
        removido: (chave) => {
          delete mesaMestre.vivos[chave];
          aoMudar(chave, "saiu");
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
    await b.remover(`privado/${codigo}`); // PV e CA dos monstros
  } catch (e) {}
}

/* ---------- Mensagens ---------- */

export function mensagemDeErro(e) {
  const m = String((e && (e.code || e.message)) || e || "");
  if (e && e.message === "lib")
    return "Não foi possível carregar a conexão com a mesa. Verifique a internet e tente de novo.";
  if (/permission|PERMISSION_DENIED/i.test(m))
    return "O banco recusou o acesso. Confira se as regras de database.rules.json foram publicadas no Firebase.";
  if (/admin-restricted|operation-not-allowed|configuration-not-found/i.test(m))
    return "O login anônimo não está ativado no Firebase. No console, abra Authentication, clique em Começar e, em Método de login, ative Anônimo.";
  if (/network|Failed to fetch|import/i.test(m)) return "Sem conexão com a internet ou com o Firebase.";
  return (e && e.message) || "Algo deu errado ao falar com a mesa.";
}
