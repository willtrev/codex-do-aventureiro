# Códex do Aventureiro

Ficha de personagem interativa para **D&D 3.5**. Faz os cálculos da ficha e acompanha o personagem durante a sessão. Não usa servidor nem build: é só abrir o `index.html`.

## O que faz

- **As 11 classes básicas do Livro do Jogador**, com as tabelas do SRD: dado de vida, BBA, testes de resistência, perícias de classe, espaços de magia por dia e magias conhecidas.
  - Habilidades com usos por dia: Fúria, Música de bardo, Expulsar mortos-vivos, Destruir o mal, Cura pelas mãos, Ataque furtivo, Rajada de golpes e outras.
- **Magias:** as 606 magias do SRD 3.5.
  - Preparadas: grimório do mago com escola especializada e escolas proibidas, e lista divina com espaço de domínio para o clérigo.
  - Espontâneas: feiticeiro e bardo, com limite de magias conhecidas.
  - Cada magia mostra CD, alcance calculado pelo nível e bônus de ataque de toque. A janela **Info** traz o resumo em português e o texto completo do SRD em inglês.
- **Talentos e equipamento do SRD:** busca em português ou inglês. Armas vão direto para *Minhas armas*, armaduras e escudos ajustam a CA, e **Comprar** desconta o preço do dinheiro.
- **Painel da sessão:**
  - PV com dano e cura, CA (normal, toque e surpresa), testes de resistência e inspiração.
  - Armas com acerto e dano calculados e contador de munição.
  - Descanso de 8 horas.
- **Clérigos:** escolha de 2 domínios entre os 22 do SRD, com as magias e os poderes concedidos.
- **Tendência:** restrições por classe (paladino, monge, bárbaro, bardo, druida).
- **Exportar para PDF:** preenche a ficha oficial editável de 4 páginas.
- **Idioma do conteúdo:** **PT + EN** (padrão), **PT** ou **EN**. Os rótulos da interface continuam em português.
- **Tema:** claro, escuro ou automático, no estilo Flat Design.
- **Personagens de teste:** um por classe, no nível 1.

## Como usar

Abra o `index.html` em qualquer navegador moderno. Funciona até direto do disco (`file://`).

Para hospedar de graça, use o **GitHub Pages**: em *Settings → Pages*, escolha a branch `main` e a pasta raiz.

### Onde os dados ficam salvos

- **Fora do Claude:** os personagens ficam no navegador (`localStorage`). Use **Notas e backup → Copiar backup** para guardar uma cópia e **Importar** para restaurar.
- **Como artefato do Claude:** os dados também ficam salvos na sua conta.

### Ficha em PDF

O modelo oficial da ficha não está no repositório, porque é material da Wizards of the Coast liberado só para uso pessoal. Para exportar, há duas opções:

- coloque o seu `ficha.pdf` (a ficha editável de 4 páginas) na mesma pasta do `index.html`; ou
- na primeira exportação, escolha o PDF quando o app pedir.

## Estrutura do código

Os arquivos são `<script>` comuns, carregados em ordem pelo `index.html`, e compartilham o escopo global. Não há módulos nem etapa de build.

```
index.html                 página e ordem de carregamento dos scripts
css/estilo.css             visual (Flat Design, claro/escuro)
js/
  util.js                  funções pequenas (mod, sg, esc, clone…)
  dados/
    srd-*.js               dados do SRD gerados automaticamente (não edite à mão)
    traducoes.js           nomes em português: escolas, classes, domínios, talentos, equipamento
    traducoes-magias.js    nome, alvo e resumo em português de cada magia
    catalogo.js            junta SRD + tradução no catálogo de magias (CAT)
  regras/
    basicas.js             atributos, perícias, escolas
    traduzir.js            converte textos do SRD (pés → metros, "Will negates" → "Vontade evita o efeito"…)
    classes.js             classes, BBA, resistências, espaços de magia, habilidades de classe
    dominios.js            domínios do clérigo
    tendencias.js          tendências e restrições por classe
    calculos.js            CA, perícias, ataques, CD, carga
  personagens/
    modelos.js             personagem em branco e o exemplo Volis
    testes.js              um personagem de teste por classe
  armazenamento/
    migracoes.js           atualiza personagens salvos em versões antigas
    armazenamento.js       salvar e carregar (conta do Claude ou localStorage)
  interface/
    tema.js, idioma.js     claro/escuro e PT/EN
    estado.js              aba atual, personagem ativo
    modais.js              janelas (Info da magia, adicionar magia, descanso, novo personagem)
    srd-escolha.js         janelas de talentos e equipamento do SRD
    eventos.js             cliques e campos
  telas/                   uma função por aba (painel, magias, perícias, ficha, inventário, notas)
  pdf/exportar.js          preenche a ficha em PDF
  app.js                   inicialização
tools/gerar_dados.py       gera js/dados/srd-*.js a partir do banco do SRD
```

### Corrigir uma tradução

- **Magia:** edite `js/dados/traducoes-magias.js`. A chave é o nome em inglês. Quando falta `descricao`, a janela Info mostra o texto do SRD.
- **Talento, equipamento, domínio ou escola:** edite o mapa correspondente em `js/dados/traducoes.js`. Sem tradução, aparece o nome em inglês.

### Regenerar os dados do SRD

Os arquivos `js/dados/srd-*.js` vêm do banco SQLite do SRD 3.5 do Andargor (`srd35-db-SQLite-v1.3.zip`). Para gerar de novo:

```bash
unzip srd35-db-SQLite-v1.3.zip -d srd
python3 tools/gerar_dados.py srd/dnd35.db
```

O zip e o `.db` estão no `.gitignore`.

## Licença e aviso

Projeto de fã, sem fins lucrativos e sem ligação com a Wizards of the Coast. *Dungeons & Dragons* e os nomes relacionados são marcas da Wizards of the Coast.

O texto das regras em `js/dados/srd-*.js` é do **System Reference Document 3.5**, Open Game Content distribuído sob a **Open Game License 1.0a** (veja `OGL.txt`). Os resumos em português são próprios.
