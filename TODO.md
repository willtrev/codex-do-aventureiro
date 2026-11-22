# Funcionalidades futuras

Ideias para depois. Nada aqui está desenvolvido ainda.

## Mapa de combate

### [ ] Monstros escondidos dos jogadores

Monstros recém-adicionados ao mapa entram **invisíveis para os jogadores**. O mestre decide quando eles aparecem.

- [ ] Todo monstro novo entra escondido por padrão.
- [ ] No mapa do mestre, o monstro escondido aparece **meio transparente** e com um **símbolo** marcando (por exemplo, um olho riscado no canto da peça).
- [ ] Os jogadores não veem a peça escondida no mapa, nem na ordem de iniciativa, nem a quantidade de monstros.
- [ ] O mestre pode **selecionar um ou vários monstros** e deixá-los visíveis quando quiser (e escondê-los de novo).
- [ ] Na lista "Monstros e NPCs" e em "Peças no mapa", cada monstro mostra se está visível ou escondido, com o botão para trocar.

Pontos para decidir na hora de fazer:

- O monstro escondido entra na ordem de iniciativa do mestre? (Sugestão: sim, mas só o mestre vê; quando aparece, os jogadores passam a vê-lo na ordem.)
- Como selecionar vários: caixas de marcar na lista ou clique com Ctrl/Shift no mapa.
- Segurança: hoje os jogadores leem `mapa/tokens` inteiro. Para esconder de verdade (e não só na tela), os monstros escondidos precisam ficar num caminho que só o mestre lê (por exemplo `privado/<código>/escondidos`), e passar para `mapa/tokens` quando ficarem visíveis. Isso pede mudança em `database.rules.json`.
