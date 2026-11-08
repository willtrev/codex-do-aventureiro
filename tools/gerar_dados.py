"""
Gera os arquivos de dados do Códex do Aventureiro a partir do banco SRD 3.5 do Andargor.

Uso:
    python tools/gerar_dados.py caminho/para/dnd35.db

Baixe o banco em https://www.andargor.com/files/srd35-db-SQLite-v1.3.zip (arquivo dnd35.db).
Os arquivos saem em js/dados/srd-*.js. Cada um é um módulo ES que exporta SRD_<NOME> (ex.: SRD_MAGIAS),
importado pelos outros arquivos do app (js/dados/catalogo.js, js/regras/classes.js...).
"""
import html
import json
import re
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "js" / "dados"

# Só o conteúdo do Livro do Jogador (sem épico, psiônico e domínios de divindades)
REF_MAGIAS = ("SRD 3.5 SpellsA-B", "SRD 3.5 SpellsC", "SRD 3.5 SpellsD-E", "SRD 3.5 SpellsF-G",
              "SRD 3.5 SpellsH-L", "SRD 3.5 SpellsM-O", "SRD 3.5 SpellsP-R", "SRD 3.5 SpellsS",
              "SRD 3.5 SpellsT-Z")
CLASSES_BASICAS = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger",
                   "Rogue", "Sorcerer", "Wizard"]
LISTA_CLASSE = {"Sorcerer/Wizard": "mago", "Bard": "bardo", "Cleric": "clerigo", "Druid": "druida",
                "Paladin": "paladino", "Ranger": "ranger"}
DOMINIOS = ["Air", "Animal", "Chaos", "Death", "Destruction", "Earth", "Evil", "Fire", "Good", "Healing",
            "Knowledge", "Law", "Luck", "Magic", "Plant", "Protection", "Strength", "Sun", "Travel",
            "Trickery", "War", "Water"]


def nulo(v):
    return None if v in (None, "None", "", "-", "—") else v


def texto(v):
    """Converte o HTML do SRD em texto simples, com parágrafos separados por linha em branco."""
    v = nulo(v)
    if not v:
        return None
    v = re.sub(r"<\s*br\s*/?>", "\n", v)
    v = re.sub(r"</\s*(p|tr|h\d|li|div)\s*>", "\n", v)
    v = re.sub(r"</\s*t[dh]\s*>", " | ", v)
    v = re.sub(r"<[^>]+>", "", v)
    v = html.unescape(v)
    linhas = [re.sub(r"\s+", " ", l).strip() for l in v.split("\n")]
    out, vazio = [], False
    for l in linhas:
        if l:
            out.append(l)
            vazio = False
        elif not vazio and out:
            out.append("")
            vazio = True
    return "\n".join(out).strip() or None


def numero(v):
    v = nulo(v)
    if v is None:
        return None
    m = re.match(r"\s*([+-]?\d+)", str(v))
    return int(m.group(1)) if m else None


def niveis_magia(s):
    """'Bard 1, Sorcerer/Wizard 1, Strength 1' -> ({'bardo':1,'mago':1}, {'Strength':1})"""
    listas, dominios = {}, {}
    for parte in (s or "").split(","):
        m = re.match(r"\s*(.+?)\s+(\d)\s*$", parte)
        if not m:
            continue
        nome, nivel = m.group(1).strip(), int(m.group(2))
        if nome in LISTA_CLASSE:
            listas[LISTA_CLASSE[nome]] = nivel
        elif nome in ("Sorcerer", "Wizard"):
            listas["mago"] = nivel
        else:
            dominios[nome] = nivel
    return listas, dominios


def espacos(v):
    """'1+1' -> [1, 1] (base, domínio); '3' -> [3, 0]; vazio -> None"""
    v = nulo(v)
    if v is None:
        return None
    m = re.match(r"\s*(\d+)(?:\s*\+\s*(\d+))?", str(v))
    return [int(m.group(1)), int(m.group(2) or 0)] if m else None


def gravar(nome, dados):
    SAIDA.mkdir(parents=True, exist_ok=True)
    arq = SAIDA / f"srd-{nome}.js"
    corpo = json.dumps(dados, ensure_ascii=False, indent=1)
    arq.write_text(
        "// Gerado por tools/gerar_dados.py a partir do SRD 3.5 (Open Game License). Não edite à mão.\n"
        f"export const SRD_{nome.upper()} = {corpo};\n", encoding="utf-8")
    print(f"{arq.relative_to(RAIZ)}: {len(dados)} registros")


def main(caminho):
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    c = con.cursor()

    # Magias
    magias = []
    marc = ",".join("?" * len(REF_MAGIAS))
    for r in c.execute(f"select * from spell where reference in ({marc}) order by name", REF_MAGIAS):
        listas, dominios = niveis_magia(r["level"])
        desc = texto(r["description"]) or ""
        ataque = ("dist" if re.search(r"\branged touch attack", desc, re.I)
                  else "corpo" if re.search(r"\bmelee touch attack", desc, re.I) else None)
        magias.append({
            "nome": r["name"], "escola": r["school"], "subescola": nulo(r["subschool"]),
            "descritor": nulo(r["descriptor"]), "listas": listas, "dominios": dominios,
            "componentes": nulo(r["components"]), "execucao": nulo(r["casting_time"]),
            "alcance": nulo(r["range"]), "alvo": nulo(r["target"]), "area": nulo(r["area"]),
            "efeito": nulo(r["effect"]), "duracao": nulo(r["duration"]),
            "resistencia": nulo(r["saving_throw"]), "rm": nulo(r["spell_resistance"]),
            "resumo": nulo(r["short_description"]), "material": texto(r["material_components"]),
            "foco": texto(r["focus"]), "xp": texto(r["xp_cost"]), "ataque": ataque, "descricao": desc,
        })
    gravar("magias", magias)

    # Classes básicas, com a tabela nível a nível
    classes = {}
    for nome in CLASSES_BASICAS:
        r = c.execute("select * from class where name=? and type like 'base%'", (nome,)).fetchone()
        tabela = []
        for t in c.execute("select * from class_table where name=? order by cast(level as integer)", (nome,)):
            tabela.append({
                "nivel": int(t["level"]), "bba": numero(t["base_attack_bonus"]),
                "fort": numero(t["fort_save"]), "ref": numero(t["ref_save"]), "von": numero(t["will_save"]),
                "especial": texto(t["special"]),
                "espacos": [espacos(t[f"slots_{i}"]) for i in range(10)],
                "conhecidas": [numero(t[f"spells_known_{i}"]) for i in range(10)],
                "ca_monge": numero(t["ac_bonus"]), "rajada": nulo(t["flurry_of_blows"]),
                "desarmado": nulo(t["unarmed_damage"]), "desloc_monge": nulo(t["unarmored_speed_bonus"]),
            })
        classes[nome] = {
            "nome": nome, "dado_vida": numero(str(r["hit_die"]).replace("d", "")),
            "pericias_por_nivel": numero(r["skill_points"]),
            "pericias_classe": [p.strip() for p in re.split(r",(?![^()]*\))", r["class_skills"] or "")],
            "atributo_magia": nulo(r["spell_stat"]), "tipo_magia": nulo(r["spell_type"]),
            "proficiencias": texto(r["proficiencies"]), "alinhamento": nulo(r["alignment"]),
            "tabela": tabela,
        }
    gravar("classes", classes)

    # Domínios do Livro do Jogador
    dominios = []
    for nome in DOMINIOS:
        r = c.execute("select * from domain where name=? and reference='SRD 3.5 SpellListI'", (nome,)).fetchone()
        dominios.append({"nome": nome, "poder": texto(r["granted_powers"]),
                         "magias": [nulo(r[f"spell_{i}"]) for i in range(1, 10)]})
    gravar("dominios", dominios)

    # Talentos do Livro do Jogador
    talentos = []
    for r in c.execute("select * from feat where reference='SRD 3.5 Feats' order by name"):
        if r["name"] == "Feat Name":  # linha de exemplo do SRD
            continue
        sem = lambda v, rot: re.sub(rf"^{rot}:\s*", "", texto(v) or "") or None
        talentos.append({"nome": r["name"], "tipo": nulo(r["type"]), "pre_requisito": sem(r["prerequisite"], "Prerequisites?"),
                         "beneficio": sem(r["benefit"], "Benefit"), "normal": sem(r["normal"], "Normal"),
                         "especial": sem(r["special"], "Special")})
    gravar("talentos", talentos)

    # Equipamento (armas, armaduras, escudos e itens comuns)
    equip = []
    for r in c.execute("select * from equipment order by family, category, name"):
        equip.append({
            "nome": r["name"], "familia": r["family"], "categoria": nulo(r["category"]),
            "subcategoria": nulo(r["subcategory"]), "custo": nulo(r["cost"]), "peso": nulo(r["weight"]),
            "dano_p": nulo(r["dmg_s"]), "dano_m": nulo(r["dmg_m"]), "critico": nulo(r["critical"]),
            "incremento": nulo(r["range_increment"]), "tipo": nulo(r["type"]),
            "bonus_ca": nulo(r["armor_shield_bonus"]), "des_max": nulo(r["maximum_dex_bonus"]),
            "penalidade": nulo(r["armor_check_penalty"]), "falha_arcana": nulo(r["arcane_spell_failure_chance"]),
            "desloc_9m": nulo(r["speed_30"]), "desloc_6m": nulo(r["speed_20"]),
        })
    gravar("equipamento", equip)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
