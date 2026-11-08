// Imprime o resumo dos personagens de exemplo (Volis + um por classe).
import { volis } from "../../js/personagens/modelos.js";
import { testChars } from "../../js/personagens/testes.js";
import { resumo } from "./resumo.js";

for (const c of [volis(1), ...testChars()]) console.log(resumo(c));
