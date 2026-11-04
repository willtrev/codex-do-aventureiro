/* ================= Tendências ================= */
const ALIGNS = [
  ["LB", "Leal e Bom"],
  ["LN", "Leal e Neutro"],
  ["LM", "Leal e Mau"],
  ["NB", "Neutro e Bom"],
  ["N", "Neutro"],
  ["NM", "Neutro e Mau"],
  ["CB", "Caótico e Bom"],
  ["CN", "Caótico e Neutro"],
  ["CM", "Caótico e Mau"],
];
function alignCode(t) {
  t = String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  const f = ALIGNS.find(([k, n]) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === t);
  if (f) return f[0];
  if (/^neutro$|^neutral$|^n$/.test(t)) return "N";
  const lc = /leal|lawful/.test(t) ? "L" : /caot|chaotic/.test(t) ? "C" : "N";
  const ge = /bom|good/.test(t) ? "B" : /mau|mal|evil/.test(t) ? "M" : "N";
  return lc === "N" && ge === "N" ? "N" : lc + ge;
}
const alignName = (k) => (ALIGNS.find((a) => a[0] === k) || [, ""])[1];
const isLawful = (k) => k[0] === "L",
  isChaotic = (k) => k[0] === "C",
  isGood = (k) => k.length === 2 && k[1] === "B",
  isEvil = (k) => k.length === 2 && k[1] === "M";
const geNeutral = (k) => !isGood(k) && !isEvil(k);
/* motivo para não poder usar a tendência ("" = permitida) */
function alignBlock(classKey, k) {
  if ((classKey === "barbaro" || classKey === "bardo") && isLawful(k))
    return CLASSES[classKey].nome + " não pode ser leal.";
  if (classKey === "monge" && !isLawful(k)) return "Monge precisa ser leal.";
  if (classKey === "paladino" && k !== "LB") return "Paladino precisa ser Leal e Bom.";
  if (classKey === "druida" && !k.includes("N")) return "Druida precisa ser neutro em pelo menos um eixo.";
  return "";
}
function alignNotes(c) {
  const k = alignCode(c.tendencia),
    out = [];
  const ck = c.classeKey;
  if (ck === "barbaro") out.push("Se ficar leal, perde a Fúria e não pode subir de nível como bárbaro.");
  if (ck === "bardo") out.push("Se ficar leal, não pode subir de nível como bardo, mas mantém as habilidades.");
  if (ck === "monge")
    out.push("Se deixar de ser leal, não pode mais subir de nível como monge, mas mantém as habilidades.");
  if (ck === "paladino")
    out.push(
      "Se deixar de ser Leal e Bom, ou cometer um ato maligno, perde todas as habilidades especiais e as magias até se redimir (Expiação)."
    );
  if (ck === "druida")
    out.push("Se sair da neutralidade, perde as magias e habilidades de druida (exceto proficiências) até se redimir.");
  if (ck === "clerigo") {
    out.push(
      "A tendência deve estar a um passo da tendência da divindade. Domínios Bem, Caos, Lei e Mal exigem a tendência correspondente."
    );
    if (isEvil(k))
      out.push(
        "Clérigo mau canaliza energia negativa: fascina/comanda mortos-vivos e converte magias em Infligir Ferimentos."
      );
    if (geNeutral(k))
      out.push(
        "Clérigo neutro no eixo bem/mal escolhe canalizar energia positiva (expulsar mortos-vivos e lançar Curar espontaneamente) ou negativa (fascinar/comandar mortos-vivos e lançar Infligir)."
      );
  }
  if (["clerigo", "druida", "paladino", "ranger"].includes(ck))
    out.push(
      "Não pode lançar magias com descritor de tendência oposta à sua (ou à da divindade), como uma magia [Bem] sendo mau."
    );
  return out;
}
