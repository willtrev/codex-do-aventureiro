/* ================= Personagens ================= */
import { clone, uidGen } from "../util.js";
import { CAT } from "../dados/catalogo.js";

export function spellFromCat(nome) {
  const c = CAT.find((x) => x.nome === nome);
  const s = clone(c);
  delete s.cid;
  s.id = uidGen();
  return s;
}
export function blankChar() {
  return {
    id: uidGen(),
    nome: "Novo personagem",
    jogador: "",
    raca: "",
    classe: "Mago",
    nivel: 1,
    xp: 0,
    tendencia: "",
    divindade: "",
    tamanho: "Médio",
    idade: "",
    sexo: "",
    altura: "",
    peso: "",
    attr: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
    hp: { max: 4, atual: 4, temp: 0, contusao: 0 },
    ca: { armadura: 0, escudo: 0, natural: 0, deflexao: 0, outros: 0 },
    ef: { armaduraArcana: false, escudoArcano: false, resistencia: false },
    outros: { fort: 0, ref: 0, von: 0, init: 0, bba: 0, agarrar: 0 },
    resistCond: "",
    deslocamento: "9 m",
    escola: "",
    proibidas: "",
    cdEscola: 0,
    grimorio: [],
    prep: {},
    pericias: {},
    pontosExtras: 0,
    ataques: [],
    talentos: [],
    caracteristicas: [],
    tracos: [],
    idiomas: "Comum",
    itens: [],
    dinheiro: { pl: 0, po: 0, pp: 0, pc: 0 },
    familiar: { nome: "", tipo: "", pv: null },
    notas: "",
    rapido: "",
    inspiracao: 0,
    classeKey: "mago",
    usos: {},
    usados: {},
    dominios: "",
    inimigo: "",
    estilo: "",
  };
}
export function volis(L) {
  L = L || 1;
  const c = blankChar();
  Object.assign(c, {
    nome: "Volis E'gurar",
    jogador: "Willian T.",
    raca: "Elfo Cinzento",
    nivel: L,
    xp: L >= 2 ? 1000 : 0,
    tendencia: "Leal e Neutro",
    divindade: "Boccob",
    tamanho: "Médio",
    idade: "140 anos",
    sexo: "M",
    altura: "1,55 m",
    peso: "45 kg",
    attr: { for: 6, des: 15, con: 12, int: 18, sab: 12, car: 8 },
    hp: { max: L >= 2 ? 9 : 5, atual: L >= 2 ? 9 : 5, temp: 0, contusao: 0 },
    resistCond: "+2 contra encantamentos; imune a sono mágico",
    deslocamento: "9 m",
    escola: "Encantamento",
    proibidas: "Evocação, Necromancia",
    cdEscola: 1,
    idiomas: "Comum, Élfico, Dracônico, Silvano, Gnomo, Goblin",
  });
  const names = [
    "Abrir/Fechar",
    "Consertar",
    "Detectar Magia",
    "Detectar Venenos",
    "Ler Magias",
    "Mãos Mágicas",
    "Marca Arcana",
    "Mensagem",
    "Pasmar",
    "Prestidigitação",
    "Resistência",
    "Respingo Ácido",
    "Som Fantasma",
    "Sono",
    "Enfeitiçar Pessoa",
    "Aumentar Pessoa",
    "Leque Cromático",
    "Armadura Arcana",
    "Graxa",
    "Escudo Arcano",
  ].concat(L >= 2 ? ["Disfarçar-se", "Compreender Idiomas"] : []);
  c.grimorio = names.map(spellFromCat);
  const id = (n) => c.grimorio.find((s) => s.nome === n).id;
  c.prep = {
    0: {
      escola: { sid: id("Pasmar"), used: false },
      slots: (L >= 2
        ? ["Pasmar", "Respingo Ácido", "Detectar Magia", "Mãos Mágicas"]
        : ["Respingo Ácido", "Detectar Magia", "Mãos Mágicas"]
      ).map((n) => ({ sid: id(n), used: false })),
    },
    1: {
      escola: { sid: id("Sono"), used: false },
      slots: (L >= 2
        ? ["Leque Cromático", "Armadura Arcana", "Aumentar Pessoa"]
        : ["Armadura Arcana", "Aumentar Pessoa"]
      ).map((n) => ({ sid: id(n), used: false })),
    },
  };
  const g = L >= 2 ? 5 : 4;
  c.pericias = {
    concentracao: { grad: g },
    c_arcano: { grad: g },
    c_local: { grad: g },
    c_nob: { grad: g },
    identificar: { grad: g },
    diplomacia: { grad: 2 },
    avaliacao: { outros: 3, nota: "familiar corvo" },
    observar: { outros: 2, nota: "racial" },
    ouvir: { outros: 2, nota: "racial" },
    procurar: { outros: 2, nota: "racial" },

    atuacao: { spec: "oratória" },
    oficios: { spec: "alquimia" },
    profissao: { spec: "escriba" },
  };
  c.ataques = [
    {
      nome: "Besta leve",
      tipo: "distancia",
      dado: "1d8",
      acertoOutros: 0,
      danoOutros: 0,
      critico: "19-20/x2",
      alcance: "24 m",
      obs: "Recarregar: ação de movimento. Munição: virotes",
    },
    {
      nome: "Adaga",
      tipo: "corpo",
      dado: "1d4",
      acertoOutros: 0,
      danoOutros: 0,
      critico: "19-20/x2",
      alcance: "—",
      obs: "Perfurante ou cortante",
    },
    {
      nome: "Adaga (arremessada)",
      tipo: "arremesso",
      dado: "1d4",
      acertoOutros: 0,
      danoOutros: 0,
      critico: "19-20/x2",
      alcance: "3 m",
      obs: "",
    },
  ];
  c.talentos = [
    { nome: "Escrever Pergaminho", obs: "Grátis de mago. Cria pergaminhos das magias que conhece." },
    { nome: "Foco em Magia (Encantamento)", obs: "+1 na CD das magias de Encantamento." },
  ];
  c.caracteristicas = [
    {
      nome: "Especialista em Encantamento",
      obs: "+1 magia por nível (só Encantamento) e +2 em Identificar Magias de Encantamento. Proibidas: Evocação e Necromancia.",
    },
    {
      nome: "Familiar: corvo",
      obs: "Fala um idioma; +3 em Avaliação. Prontidão, ligação empática, compartilhar magias.",
    },
    {
      nome: "Proficiência em armas",
      obs: "Clava, adaga, besta leve e pesada, bordão; espada longa, rapieira e arcos (élfico).",
    },
  ];
  c.tracos = [
    { nome: "Ajustes", obs: "+2 Int, +2 Des, –2 For, –2 Con" },
    { nome: "Visão na penumbra", obs: "" },
    { nome: "Imune a sono mágico", obs: "+2 nos testes de resistência contra encantamentos" },
    {
      nome: "Sentidos élficos",
      obs: "+2 em Ouvir, Procurar e Observar; teste de Procurar automático a 1,5 m de portas secretas",
    },
  ];
  c.itens = [
    ["Besta leve", 1, 2, "Ombro"],
    ["Virotes", 20, 0.05, "Aljava"],
    ["Adaga", 1, 0.5, "Cinto"],
    ["Bolsa de componentes", 1, 1, "Cinto"],
    ["Grimório", 1, 1.5, "Mochila"],
    ["Mochila", 1, 1, "Costas"],
    ["Cantil", 1, 2, "Mochila"],
    ["Rações de viagem (dias)", 2, 0.5, "Mochila"],
    ["Pederneira", 1, 0, "Mochila"],
    ["Roupas de explorador", 1, 0, "Vestido"],
  ].map(([nome, qtd, peso, local]) => ({ nome, qtd, peso, local }));
  c.dinheiro = { pl: 0, po: 21, pp: 0, pc: 0 };
  c.familiar = { nome: "", tipo: "Corvo", pv: L >= 2 ? 4 : 2 };
  if (L >= 2) c.pericias.c_rel = { grad: 1 };
  c.rapido = "Comprar: roupas de cortesão (30 PO), tinta e pena.";
  c.inspiracao = 1;
  return c;
}
