/* Avisos de mudança, num módulo sem dependências para evitar import circular.
   aoAlterarFicha: funções chamadas sempre que uma ficha é salva (touch em armazenamento.js).
   A mesa online (js/tempo-real/mesa.js) usa para enviar a ficha ao mestre. */
export const aoAlterarFicha = new Set();
