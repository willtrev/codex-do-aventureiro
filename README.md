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
- **Exportar e importar PDF:** preenche a ficha oficial editável de 4 páginas. Para importar, aceita qualquer PDF que tenha texto:
  - a ficha oficial editável, inclusive uma exportada pelo Códex;
  - a ficha oficial sem formulário (impressa ou salva como PDF comum), lida pela posição de cada valor na página;
  - outros modelos de ficha e documentos, lidos pelos rótulos ("Nome:", "Classe: Mago 3", "For 16", "PV 18") e pelas listas de magias, talentos e equipamento.

  Antes de salvar, mostra o que não deu para importar: multiclasse, magias fora do SRD, perícias sem equivalente, valores calculados diferentes da ficha. PDFs só com imagem (foto ou digitalização) não têm texto para ler.
- **Idioma do conteúdo:** **PT + EN** (padrão), **PT** ou **EN**. Os rótulos da interface continuam em português.
- **Tema:** claro, escuro ou automático, no estilo Flat Design.
- **Hub do mestre** (`#mestre`): o mestre cria e nomeia campanhas e traz as fichas dos jogadores (PDF, texto de backup ou fichas do próprio aparelho). Cada personagem vira um card com PV, CA, toque, surpresa, iniciativa, testes de resistência, BBA, agarrar, deslocamento e inspiração, com ordenação por nome, iniciativa, PV ou CA. **Detalhes** abre atributos, armas, magias de hoje, habilidades, perícias e talentos. Os cards são cópias: importar de novo uma ficha com o mesmo nome atualiza o card.
- **Tela inicial:** o primeiro acesso começa sem personagens. Dá para criar um, importar uma ficha em PDF ou um backup, ou carregar os exemplos (Volis e um personagem de teste de nível 1 por classe).

## Como usar

O app usa módulos JavaScript (`import`/`export`) e o [Vite](https://vite.dev) para desenvolver e gerar o site. Precisa do [Node.js](https://nodejs.org) 20.19 ou mais novo.

```bash
npm install        # uma vez, instala o Vite e o Prettier
npm run dev        # abre o app em http://localhost:5173 e recarrega ao salvar
npm run build      # gera o site final otimizado em dist/
npm run preview    # testa o conteúdo de dist/ como ficaria publicado
```

O `index.html` não abre mais com dois cliques (`file://`): navegadores não carregam módulos direto do disco. Use `npm run dev`.

### Hospedar de graça

O site final (pasta `dist/`, gerada por `npm run build`) é estático, então qualquer hospedagem de arquivos serve.

- **Cloudflare Pages:** gratuito também com o repositório **privado**. Em *Workers & Pages → Create → Pages → Connect to Git*, escolha o repositório e use *Build command* `npm run build` e *Build output directory* `dist`. Cada `git push` atualiza o site, e cada branch ganha um endereço de prévia próprio.
- **GitHub Pages:** só é gratuito com o repositório **público**, e precisa de uma *GitHub Action* que rode `npm run build` e publique `dist/` (*Settings → Pages → Source: GitHub Actions*, modelo "Static HTML" adaptado).

Escolha o endereço definitivo antes de as pessoas começarem a usar: os dados ficam presos ao endereço do site (veja abaixo).

### Onde os dados ficam salvos

- **No site hospedado ou aberto do disco:** no navegador de cada pessoa (`localStorage`). Nada vai para um servidor, e cada pessoa só vê os próprios personagens.
- **Como artefato do Claude:** os dados também ficam salvos na conta de quem usa.

Os personagens salvos no navegador somem ou deixam de aparecer quando:

- os dados de navegação são limpos (cookies e dados de sites), à mão ou por um programa de limpeza;
- a pessoa usa aba anônima: tudo some ao fechar a janela;
- a pessoa abre o site em outro navegador ou aparelho;
- o Safari (iPhone ou Mac) apaga os dados de um site que fica cerca de 7 dias sem ser aberto;
- o site muda de endereço (repositório renomeado, domínio novo);
- o aparelho fica sem espaço e o navegador libera dados de sites.

Para se proteger, use **Notas e backup → Copiar backup** depois de cada sessão e guarde o texto. Para restaurar, cole o backup na tela inicial ou em **Notas e backup → Importar**.

### Ficha em PDF

O modelo oficial da ficha não está no repositório, porque é material da Wizards of the Coast liberado só para uso pessoal. Para exportar, há duas opções:

- coloque o seu `ficha.pdf` (a ficha editável de 4 páginas) em `public/ficha.pdf`; ou
- na primeira exportação, escolha o PDF quando o app pedir.

## Estrutura do código

Cada arquivo é um módulo ES: declara no topo, com `import`, o que usa de outros arquivos e marca com `export` o que oferece. O `index.html` carrega só o `js/app.js`, que puxa o resto. Os imports são somente leitura: para mudar uma variável de outro arquivo, use a função `set<Nome>()` que ele exporta (ex.: `setState`, `setTheme`).

```
index.html                 página; carrega js/app.js
package.json, vite.config.js   scripts (dev, build) e configuração do Vite
public/                    arquivos copiados como estão para o site (ex.: ficha.pdf, fora do git)
css/estilo.css             visual (Flat Design, claro/escuro)
js/
  util.js                  funções pequenas (mod, sg, esc, clone…)
  dados/
    srd-*.js               dados do SRD gerados automaticamente (não edite à mão)
    ficha-campos.js        posição de cada campo da ficha oficial, para ler fichas sem formulário
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
                           a tela inicial (inicio.js), mostrada quando não há personagens,
                           e o hub do mestre (mestre.js)
  pdf/exportar.js          preenche a ficha em PDF
  pdf/importar.js          monta o personagem a partir de uma ficha em PDF
  pdf/ler-texto.js         lê PDFs sem o formulário oficial (pela posição ou pelos rótulos)
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
python3 tools/gerar_dados.py srd/dnd35.db   # ou: npm run dados -- srd/dnd35.db
```

O zip e o `.db` estão no `.gitignore`.

## Commits

As mensagens seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), com a descrição em português:

```
<tipo>(<escopo opcional>): <descrição no imperativo, em minúsculas>
```

| Tipo | Quando usar |
| --- | --- |
| `feat` | funcionalidade nova (`feat(magias): adiciona busca no catálogo`) |
| `fix` | correção de erro (`fix(pdf): corrige campo de CA na ficha`) |
| `docs` | só documentação, como este README |
| `style` | formatação, sem mudar o comportamento |
| `refactor` | reorganiza o código sem mudar o comportamento |
| `chore` | manutenção: dados do SRD gerados de novo, configuração, `.gitignore` |

Para formatar o código antes do commit: `npm run formatar` (as regras estão em `.prettierrc.json`; os `srd-*.js` gerados ficam de fora).

## Licença e aviso

Projeto de fã, sem fins lucrativos e sem ligação com a Wizards of the Coast. *Dungeons & Dragons* e os nomes relacionados são marcas da Wizards of the Coast.

O texto das regras em `js/dados/srd-*.js` é do **System Reference Document 3.5**, Open Game Content distribuído sob a **Open Game License 1.0a** (veja `OGL.txt`). Os resumos em português são próprios.
