# Funcionalidades futuras

Ideias para depois. O que já foi feito fica marcado, com o que foi decidido.

## Mapa de combate

### [ ] Marcar áreas no mapa

O mestre (e talvez os jogadores) marca áreas no campo de batalha, para mostrar onde uma magia pega ou onde fica um efeito que continua em jogo.

- [ ] **Área de efeito instantâneo:** por exemplo, "a Bola de Fogo pega aqui". Coloca um círculo (ou outra forma) num ponto do mapa para todos verem quem está dentro.
- [ ] **Efeito contínuo:** por exemplo, Graxa. A área fica marcada no mapa até alguém tirar.
- [ ] Formas: círculo (raio), quadrado, cone e linha, medidos em metros pela grade (1 casa = 1,5 m).
- [ ] Cada área com nome ("Graxa", "Bola de Fogo"), cor e transparência, para ver as peças embaixo.
- [ ] Mover e redimensionar a área arrastando, e apagar quando acabar.

Pontos para decidir na hora de fazer:

- Quem pode marcar: só o mestre ou também os jogadores (por exemplo, o mago marca a própria Bola de Fogo).
- Área instantânea some sozinha depois de um tempo ou no fim do turno, ou só quando alguém apaga.
- Mostrar quais peças ficam dentro da área (destacar as peças atingidas).
- Onde gravar: `mesas/<código>/mapa/areas`, com regra nova em `database.rules.json`.

### [x] Monstros escondidos dos jogadores

Feito. Monstros novos entram escondidos por padrão (caixa "Entrar escondido dos jogadores" em "Monstros e NPCs").

- [x] No mapa do mestre, o monstro escondido aparece meio transparente e com um olho riscado no canto.
- [x] Os jogadores não veem a peça escondida no mapa nem na ordem de iniciativa.
- [x] O mestre mostra ou esconde um monstro pelo botão dele, ou vários de uma vez marcando as caixas ("Mostrar marcados", "Esconder marcados", "Marcar todos").
- [x] "Monstros e NPCs" e "Peças no mapa" mostram se cada monstro está escondido ou visível.

O que foi decidido:

- O monstro escondido entra na ordem de iniciativa, mas só o mestre o vê. Quando aparece, os jogadores passam a vê-lo na ordem.
- Seleção de vários pelas caixas de marcar na lista.
- Escondido de verdade, não só na tela: a peça escondida fica em `privado/<código>/escondidos`, que só o mestre lê, e passa para `mapa/tokens` quando aparece. As regras de `privado` já cobriam isso, então `database.rules.json` não mudou.
