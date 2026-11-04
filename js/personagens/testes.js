/* ================= Personagens de teste (nível 1, compra de 25 pontos) ================= */
function mkChar(k, o) {
  const c = blankChar();
  c.classeKey = k;
  c.classe = CLASSES[k].nome;
  Object.assign(c, o.base || {});
  c.attr = o.attr;
  c.hp = { max: o.hp, atual: o.hp, temp: 0, contusao: 0 };
  Object.assign(c.ca, o.ca || {});
  Object.assign(c.outros, o.outros || {});
  c.pericias = o.per || {};
  c.ataques = (o.atk || []).map(([nome, tipo, dado, critico, alcance, acertoOutros, danoOutros, obs]) => ({
    nome,
    tipo,
    dado,
    critico,
    alcance: alcance || "—",
    acertoOutros: acertoOutros || 0,
    danoOutros: danoOutros || 0,
    obs: obs || "",
  }));
  c.itens = (o.itens || []).map(([nome, qtd, peso, local]) => ({ nome, qtd, peso, local: local || "Mochila" }));
  c.dinheiro = Object.assign({ pl: 0, po: 0, pp: 0, pc: 0 }, o.din || {});
  c.talentos = (o.tal || []).map(([nome, obs]) => ({ nome, obs: obs || "" }));
  c.tracos = (o.tra || []).map(([nome, obs]) => ({ nome, obs: obs || "" }));
  const lk = (CLASSES[k].magia || {}).lista;
  if (o.mag && lk) {
    c.grimorio = o.mag.map((n) => {
      const s = spellFromCat(n);
      s.nivel = CAT.find((x) => x.nome === n).listas[lk];
      delete s.listas;
      return s;
    });
  }
  if (o.prep) {
    const id = (n) => (c.grimorio.find((s) => s.nome === n) || {}).id || null;
    for (const l in o.prep) {
      const p = o.prep[l];
      c.prep[l] = {
        escola: { sid: p.e ? id(p.e) : null, used: false },
        slots: (p.s || []).map((n) => ({ sid: id(n), used: false })),
      };
    }
  }
  c.nome = "Teste " + CLASSES[k].nome;
  c.testChar = true;
  return c;
}
const T_HUM = [["Humano", "Talento extra no 1º nível e +1 ponto de perícia por nível (+4 no 1º)."]];
const T_ELF = [
  ["Imune a sono mágico", "+2 nos testes de resistência contra encantamentos"],
  ["Visão na penumbra", ""],
  ["Sentidos élficos", "+2 em Ouvir, Procurar e Observar"],
];
const T_ANAO = [
  ["Visão no escuro", "18 m"],
  ["Estabilidade", "+4 contra ser derrubado ou empurrado"],
  ["Resistência anã", "+2 contra veneno, magias e efeitos similares a magia"],
  ["Ódio", "+1 de ataque contra orcs e goblinoides; +4 de esquiva na CA contra gigantes"],
  ["Deslocamento", "6 m, mesmo com armadura média ou pesada"],
];
const BASIC = [
  ["Mochila", 1, 1],
  ["Cantil", 1, 2],
  ["Rações de viagem (dias)", 2, 0.5],
];
function testChars() {
  return [
    mkChar("barbaro", {
      base: {
        raca: "Meio-Orc",
        tendencia: "Caótico e Neutro",
        deslocamento: "12 m",
        idiomas: "Comum, Orc",
        tamanho: "Médio",
      },
      attr: { for: 18, des: 13, con: 14, int: 8, sab: 10, car: 6 },
      hp: 14,
      ca: { armadura: 3 },
      per: { escalar: { grad: 4 }, intimidacao: { grad: 4 }, sobrevivencia: { grad: 4 } },
      atk: [
        ["Machado grande", "corpo", "1d12", "x3", "", 0, 2, "Duas mãos: soma 1,5× a Força (o +2 extra)."],
        ["Azagaia", "arremesso", "1d6", "x2", "9 m"],
      ],
      itens: [
        ["Machado grande", 1, 6, "Mãos"],
        ["Gibão de peles", 1, 12.5, "Vestido"],
        ["Azagaia", 3, 1, "Costas"],
        ...BASIC,
        ["Saco de dormir", 1, 2.5],
      ],
      din: { po: 57, pp: 9 },
      tal: [["Ataque Poderoso", "Troca até o BBA em acerto por dano (o dobro com arma de duas mãos)."]],
      tra: [
        ["Ajustes", "+2 For, –2 Int, –2 Car"],
        ["Visão no escuro", "18 m"],
        ["Sangue órquico", "Conta como orc para efeitos raciais"],
      ],
    }),
    mkChar("bardo", {
      base: { raca: "Meio-Elfo", tendencia: "Caótico e Bom", idiomas: "Comum, Élfico, Gnomo" },
      attr: { for: 10, des: 14, con: 12, int: 13, sab: 8, car: 15 },
      hp: 7,
      ca: { armadura: 2 },
      per: {
        atuacao: { grad: 4, spec: "instrumentos de corda" },
        diplomacia: { grad: 4, outros: 2, nota: "racial" },
        blefar: { grad: 4 },
        sentir: { grad: 4 },
        obter: { grad: 4, outros: 2, nota: "racial" },
        ouvir: { grad: 4, outros: 1, nota: "racial" },
        concentracao: { grad: 4 },
        procurar: { outros: 1, nota: "racial" },
        observar: { outros: 1, nota: "racial" },
      },
      atk: [
        ["Rapieira", "corpo", "1d6", "18-20/x2"],
        ["Arco curto", "distancia", "1d6", "x3", "18 m", 0, 0, "Munição: flechas"],
      ],
      itens: [
        ["Corselete de couro", 1, 7.5, "Vestido"],
        ["Rapieira", 1, 1, "Cinto"],
        ["Arco curto", 1, 1, "Costas"],
        ["Flechas", 20, 0.075, "Aljava"],
        ["Alaúde", 1, 1.5],
        ...BASIC,
      ],
      din: { po: 30 },
      mag: ["Pasmar", "Detectar Magia", "Luz", "Prestidigitação"],
      tal: [["Iniciativa Aprimorada", "+4 na iniciativa."]],
      outros: { init: 4 },
      tra: [
        ["Imune a sono mágico", "+2 nos testes de resistência contra encantamentos"],
        ["Visão na penumbra", ""],
        ["Sentidos", "+1 em Ouvir, Procurar e Observar"],
        ["Diplomata", "+2 em Diplomacia e Obter Informação"],
        ["Sangue élfico", "Conta como elfo para efeitos raciais"],
      ],
    }),
    mkChar("clerigo", {
      base: {
        raca: "Anão",
        tendencia: "Leal e Bom",
        divindade: "Moradin",
        deslocamento: "6 m",
        idiomas: "Comum, Anão",
        dominios: "Cura, Proteção",
        resistCond: "+2 contra veneno, magias e efeitos similares a magia",
      },
      attr: { for: 13, des: 8, con: 16, int: 10, sab: 16, car: 8 },
      hp: 11,
      ca: { armadura: 4, escudo: 2 },
      per: { concentracao: { grad: 4 }, cura: { grad: 4 } },
      atk: [
        ["Maça pesada", "corpo", "1d8", "x2"],
        ["Besta leve", "distancia", "1d8", "19-20/x2", "24 m", 0, 0, "Recarregar: ação de movimento. Munição: virotes"],
      ],
      itens: [
        ["Brunea", 1, 15, "Vestido"],
        ["Escudo grande de madeira", 1, 5, "Braço"],
        ["Maça pesada", 1, 4, "Cinto"],
        ["Besta leve", 1, 2, "Costas"],
        ["Virotes", 10, 0.05, "Aljava"],
        ["Símbolo sagrado de madeira", 1, 0, "Pescoço"],
        ...BASIC,
      ],
      din: { po: 15 },
      mag: [
        "Orientação",
        "Curar Ferimentos Mínimos",
        "Luz",
        "Resistência",
        "Detectar Magia",
        "Criar Água",
        "Ler Magias",
        "Virtude",
        "Abençoar",
        "Escudo da Fé",
        "Curar Ferimentos Leves",
        "Santuário",
        "Proteção contra o Mal",
        "Comando",
        "Favor Divino",
        "Remover Medo",
      ],
      prep: {
        0: { s: ["Orientação", "Curar Ferimentos Mínimos", "Luz"] },
        1: { e: "Curar Ferimentos Leves", s: ["Abençoar", "Escudo da Fé"] },
      },
      tal: [["Magia em Combate", "+4 em Concentração para lançar na defensiva ou agarrado."]],
      tra: T_ANAO,
    }),
    mkChar("druida", {
      base: { raca: "Humano", tendencia: "Neutro", idiomas: "Comum, Druídico, Silvano", pontosExtras: 4 },
      attr: { for: 10, des: 13, con: 14, int: 10, sab: 16, car: 8 },
      hp: 10,
      ca: { armadura: 2 },
      per: {
        concentracao: { grad: 4 },
        c_nat: { grad: 4 },
        sobrevivencia: { grad: 4 },
        adestrar: { grad: 4 },
        observar: { grad: 4 },
      },
      atk: [
        ["Cimitarra", "corpo", "1d6", "18-20/x2"],
        ["Funda", "distancia", "1d4", "x2", "15 m", 0, 0, "Munição: balas. Soma a Força no dano."],
      ],
      itens: [
        ["Corselete de couro", 1, 7.5, "Vestido"],
        ["Cimitarra", 1, 2, "Cinto"],
        ["Funda", 1, 0, "Cinto"],
        ["Balas de funda", 10, 0.25, "Bolsa"],
        ["Ramo de azevinho e visco", 1, 0, "Cinto"],
        ...BASIC,
      ],
      din: { po: 20, pp: 9 },
      mag: [
        "Orientação",
        "Curar Ferimentos Mínimos",
        "Detectar Magia",
        "Criar Água",
        "Luz",
        "Brilho",
        "Resistência",
        "Virtude",
        "Conhecer Direção",
        "Purificar Alimentos e Bebidas",
        "Enredar",
        "Presa Mágica",
        "Fogo das Fadas",
        "Bom Fruto",
        "Produzir Chamas",
        "Curar Ferimentos Leves",
        "Falar com Animais",
        "Passos Longos",
      ],
      prep: {
        0: { s: ["Orientação", "Curar Ferimentos Mínimos", "Detectar Magia"] },
        1: { s: ["Enredar", "Produzir Chamas"] },
      },
      tal: [
        ["Esquiva", "+1 de esquiva na CA contra um oponente."],
        ["Iniciativa Aprimorada", "+4 na iniciativa."],
      ],
      outros: { init: 4 },
      tra: T_HUM,
    }),
    mkChar("guerreiro", {
      base: {
        raca: "Anão",
        tendencia: "Leal e Neutro",
        deslocamento: "6 m",
        idiomas: "Comum, Anão",
        resistCond: "+2 contra veneno, magias e efeitos similares a magia",
      },
      attr: { for: 16, des: 13, con: 16, int: 8, sab: 12, car: 6 },
      hp: 13,
      ca: { armadura: 4, escudo: 2 },
      per: { escalar: { grad: 2 }, intimidacao: { grad: 2 } },
      atk: [
        ["Machado de guerra anão", "corpo", "1d10", "x3", "", 1, 0, "Foco em Arma: +1 no acerto (já incluído)."],
        ["Besta leve", "distancia", "1d8", "19-20/x2", "24 m", 0, 0, "Munição: virotes"],
      ],
      itens: [
        ["Brunea", 1, 15, "Vestido"],
        ["Escudo grande de aço", 1, 7.5, "Braço"],
        ["Machado de guerra anão", 1, 4, "Cinto"],
        ["Besta leve", 1, 2, "Costas"],
        ["Virotes", 10, 0.05, "Aljava"],
        ...BASIC,
      ],
      din: { po: 10 },
      tal: [
        ["Ataque Poderoso", "Troca até o BBA em acerto por dano."],
        ["Foco em Arma (machado de guerra anão)", "+1 de ataque com essa arma."],
      ],
      tra: T_ANAO,
    }),
    mkChar("monge", {
      base: { raca: "Humano", tendencia: "Leal e Neutro", idiomas: "Comum", pontosExtras: 4 },
      attr: { for: 13, des: 14, con: 12, int: 10, sab: 15, car: 8 },
      hp: 9,
      per: {
        acrobacia: { grad: 4 },
        equilibrio: { grad: 4 },
        saltar: { grad: 4 },
        ouvir: { grad: 4 },
        furtividade: { grad: 4 },
      },
      atk: [
        ["Ataque desarmado", "corpo", "1d6", "x2", "", 0, 0, "Golpe Desarmado Aprimorado."],
        ["Rajada de golpes (cada ataque)", "corpo", "1d6", "x2", "", -2, 0, "Ataque total: 2 ataques com −2 em cada."],
        ["Shuriken", "arremesso", "1d2", "x2", "3 m"],
      ],
      itens: [["Shuriken", 5, 0.05, "Cinto"], ...BASIC, ["Saco de dormir", 1, 2.5]],
      din: { po: 7, pp: 4 },
      tal: [
        ["Golpe Desarmado Aprimorado", "Bônus de monge."],
        ["Ataque Atordoante", "Bônus de monge."],
        ["Desviar Objetos", "Bônus de monge: desvia um ataque à distância por rodada."],
        ["Esquiva", "+1 de esquiva na CA contra um oponente."],
        ["Iniciativa Aprimorada", "+4 na iniciativa."],
      ],
      outros: { init: 4 },
      tra: T_HUM,
    }),
    mkChar("paladino", {
      base: {
        raca: "Humano",
        tendencia: "Leal e Bom",
        divindade: "Heironeous",
        deslocamento: "6 m (armadura média)",
        idiomas: "Comum",
        pontosExtras: 4,
      },
      attr: { for: 15, des: 10, con: 13, int: 8, sab: 12, car: 14 },
      hp: 11,
      ca: { armadura: 4, escudo: 2 },
      per: { diplomacia: { grad: 4 }, sentir: { grad: 4 } },
      atk: [
        ["Espada longa", "corpo", "1d8", "19-20/x2", "", 1, 0, "Foco em Arma: +1 no acerto (já incluído)."],
        ["Besta leve", "distancia", "1d8", "19-20/x2", "24 m", 0, 0, "Munição: virotes"],
      ],
      itens: [
        ["Brunea", 1, 15, "Vestido"],
        ["Escudo grande de aço", 1, 7.5, "Braço"],
        ["Espada longa", 1, 2, "Cinto"],
        ["Besta leve", 1, 2, "Costas"],
        ["Virotes", 10, 0.05, "Aljava"],
        ["Símbolo sagrado de madeira", 1, 0, "Pescoço"],
        ...BASIC,
      ],
      din: { po: 24 },
      tal: [
        ["Ataque Poderoso", "Troca até o BBA em acerto por dano."],
        ["Foco em Arma (espada longa)", "+1 de ataque com essa arma."],
      ],
      tra: T_HUM,
    }),
    mkChar("ranger", {
      base: {
        raca: "Elfo",
        tendencia: "Neutro e Bom",
        idiomas: "Comum, Élfico, Silvano",
        inimigo: "Orcs",
        estilo: "Arquearia (a partir do 2º nível)",
      },
      attr: { for: 13, des: 17, con: 12, int: 10, sab: 12, car: 8 },
      hp: 9,
      ca: { armadura: 3 },
      per: {
        esconder: { grad: 4 },
        furtividade: { grad: 4 },
        observar: { grad: 4, outros: 2, nota: "racial" },
        ouvir: { grad: 4, outros: 2, nota: "racial" },
        sobrevivencia: { grad: 4 },
        procurar: { grad: 4, outros: 2, nota: "racial" },
      },
      atk: [
        [
          "Arco longo",
          "distancia",
          "1d8",
          "x3",
          "30 m",
          1,
          1,
          "Tiro Certeiro: +1/+1 a até 9 m (já incluído). Munição: flechas",
        ],
        ["Espada longa", "corpo", "1d8", "19-20/x2"],
        ["Espada curta", "corpo", "1d6", "19-20/x2"],
      ],
      itens: [
        ["Corselete de couro batido", 1, 10, "Vestido"],
        ["Arco longo", 1, 1.5, "Costas"],
        ["Flechas", 40, 0.075, "Aljava"],
        ["Espada longa", 1, 2, "Cinto"],
        ["Espada curta", 1, 1, "Cinto"],
        ...BASIC,
      ],
      din: { po: 19 },
      tal: [
        ["Rastrear", "Bônus de ranger."],
        ["Tiro Certeiro", "+1 em ataque e dano à distância a até 9 m."],
      ],
      tra: T_ELF,
    }),
    mkChar("ladino", {
      base: {
        raca: "Halfling",
        tendencia: "Caótico e Neutro",
        tamanho: "Pequeno",
        deslocamento: "6 m",
        idiomas: "Comum, Halfling, Anão, Goblin",
        resistCond: "+1 em todos os testes (sorte); +2 contra medo",
      },
      attr: { for: 8, des: 18, con: 12, int: 14, sab: 11, car: 8 },
      hp: 7,
      ca: { armadura: 3 },
      outros: { fort: 1, ref: 1, von: 1 },
      per: {
        abrir: { grad: 4 },
        operar: { grad: 4 },
        procurar: { grad: 4 },
        observar: { grad: 4 },
        ouvir: { grad: 4, outros: 2, nota: "racial" },
        esconder: { grad: 4, outros: 4, nota: "tamanho Pequeno" },
        furtividade: { grad: 4, outros: 2, nota: "racial" },
        acrobacia: { grad: 4 },
        prestidigitacao: { grad: 4 },
        blefar: { grad: 4 },
        escalar: { outros: 2, nota: "racial" },
        saltar: { outros: 2, nota: "racial" },
      },
      atk: [
        ["Espada curta", "acuidade", "1d4", "19-20/x2", "", 0, 0, "Acuidade com Arma: usa Destreza no acerto."],
        ["Besta leve", "distancia", "1d6", "19-20/x2", "24 m", 0, 0, "Munição: virotes"],
      ],
      itens: [
        ["Corselete de couro batido", 1, 5, "Vestido"],
        ["Espada curta", 1, 0.5, "Cinto"],
        ["Besta leve", 1, 1, "Costas"],
        ["Virotes", 10, 0.025, "Aljava"],
        ["Ferramentas de ladrão", 1, 0.5, "Cinto"],
        ["Mochila", 1, 0.25],
        ["Cantil", 1, 0.5],
        ["Rações de viagem (dias)", 2, 0.125],
      ],
      din: { po: 20 },
      tal: [["Acuidade com Arma", "Usa Destreza no acerto com armas leves."]],
      tra: [
        ["Ajustes", "+2 Des, –2 For"],
        ["Pequeno", "+1 na CA e no ataque, +4 em Esconder-se"],
        ["Sorte halfling", "+1 em todos os testes de resistência (já incluído)"],
        ["Destemido", "+2 contra medo"],
        ["Ágil", "+2 em Escalar, Saltar, Furtividade e Ouvir"],
        ["Arremesso", "+1 de ataque com armas de arremesso e fundas"],
      ],
    }),
    mkChar("feiticeiro", {
      base: {
        raca: "Humano",
        tendencia: "Caótico e Bom",
        idiomas: "Comum, Dracônico",
        pontosExtras: 4,
        escola: "Evocação",
        cdEscola: 1,
        familiar: { tipo: "Gato", nome: "", pv: 3 },
      },
      attr: { for: 8, des: 14, con: 14, int: 10, sab: 9, car: 16 },
      hp: 6,
      per: { concentracao: { grad: 4 }, identificar: { grad: 4 }, blefar: { grad: 4 } },
      atk: [
        ["Besta leve", "distancia", "1d8", "19-20/x2", "24 m", 0, 0, "Munição: virotes"],
        ["Adaga", "corpo", "1d4", "19-20/x2"],
      ],
      itens: [
        ["Besta leve", 1, 2, "Costas"],
        ["Virotes", 10, 0.05, "Aljava"],
        ["Adaga", 1, 0.5, "Cinto"],
        ["Bolsa de componentes", 1, 1, "Cinto"],
        ...BASIC,
      ],
      din: { po: 28 },
      mag: ["Raio de Gelo", "Pasmar", "Luz", "Detectar Magia", "Mísseis Mágicos", "Armadura Arcana"],
      tal: [
        ["Foco em Magia (Evocação)", "+1 na CD das magias de Evocação."],
        ["Iniciativa Aprimorada", "+4 na iniciativa."],
      ],
      outros: { init: 4 },
      tra: T_HUM,
    }),
    mkChar("mago", {
      base: {
        raca: "Humano",
        tendencia: "Neutro",
        idiomas: "Comum, Dracônico, Élfico, Anão",
        pontosExtras: 4,
        familiar: { tipo: "Coruja", nome: "", pv: 3 },
      },
      attr: { for: 8, des: 14, con: 14, int: 16, sab: 11, car: 8 },
      hp: 6,
      per: {
        concentracao: { grad: 4 },
        identificar: { grad: 4 },
        c_arcano: { grad: 4 },
        c_hist: { grad: 4 },
        decifrar: { grad: 4 },
        c_planos: { grad: 4 },
      },
      atk: [
        ["Besta leve", "distancia", "1d8", "19-20/x2", "24 m", 0, 0, "Munição: virotes"],
        ["Bordão", "corpo", "1d6", "x2", "", 0, 0, "Duas mãos."],
      ],
      itens: [
        ["Besta leve", 1, 2, "Costas"],
        ["Virotes", 10, 0.05, "Aljava"],
        ["Bordão", 1, 2, "Mão"],
        ["Bolsa de componentes", 1, 1, "Cinto"],
        ["Grimório", 1, 1.5],
        ...BASIC,
      ],
      din: { po: 30 },
      mag: [
        "Resistência",
        "Respingo Ácido",
        "Detectar Venenos",
        "Detectar Magia",
        "Ler Magias",
        "Pasmar",
        "Globos de Luz",
        "Brilho",
        "Luz",
        "Raio de Gelo",
        "Som Fantasma",
        "Romper Morto-Vivo",
        "Toque da Fadiga",
        "Mãos Mágicas",
        "Consertar",
        "Mensagem",
        "Abrir/Fechar",
        "Marca Arcana",
        "Prestidigitação",
        "Mísseis Mágicos",
        "Armadura Arcana",
        "Sono",
        "Escudo Arcano",
        "Graxa",
        "Mãos Flamejantes",
      ],
      prep: { 0: { s: ["Raio de Gelo", "Detectar Magia", "Luz"] }, 1: { s: ["Mísseis Mágicos", "Armadura Arcana"] } },
      tal: [
        ["Escrever Pergaminho", "Talento grátis de mago."],
        ["Iniciativa Aprimorada", "+4 na iniciativa."],
        ["Magia em Combate", "+4 em Concentração para lançar na defensiva."],
      ],
      outros: { init: 4 },
      tra: T_HUM,
    }),
  ];
}
