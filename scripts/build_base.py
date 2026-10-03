#!/usr/bin/env python3
"""Bake Reg M-C species/mega/item/ability/alignment data + sprites from the local
champions-logic repo into data/base.json and public/sprites/. Run locally; output is committed
(the weekly GitHub Action only refreshes Limitless usage)."""
import json, os, sqlite3, sys
from PIL import Image

CL = os.environ.get("CHAMPIONS_LOGIC", "/home/nuc1/Documents/Coding Projects/champions_logic")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db = sqlite3.connect(os.path.join(CL, "data/champions_logic.db"))
db.row_factory = sqlite3.Row
q = lambda sql, *a: db.execute(sql, a).fetchall()

def legal(kind, key):
    r = q("select status from format_legality where format_id='M-C' and entity_kind=? and entity_key=?", kind, key)
    return bool(r) and r[0]["status"] == "legal"

def sprite(kind, slug):
    r = q("select path from sprite where entity_kind=? and entity_slug=? and variant='menu'", kind, slug)
    if not r:
        return None
    out = os.path.join(ROOT, "public/sprites", slug + ".webp")
    Image.open(os.path.join(CL, r[0]["path"])).convert("RGBA").resize((96, 96), Image.LANCZOS).save(out, "WEBP", quality=80, method=6)
    return slug

items = {r["slug"]: r["name"] for r in q("select slug,name from item") if legal("item", r["slug"])}
abil = {r["slug"]: r["name"] for r in q("select slug,name from ability")}

mons = []
for s in q("select * from species order by national_dex"):
    if not legal("species", s["slug"]):
        continue
    ab = [r["ability_slug"] for r in q("select ability_slug from species_ability where species_slug=? order by slot", s["slug"])]
    mons.append(dict(id=s["slug"], name=s["name"], spe=s["spe"], abilities=ab, sid=s["showdown_id"] or s["slug"],
                     sprite=sprite("species", s["slug"])))
for m in q("select * from mega_evolution"):
    if not legal("mega", m["slug"]):
        continue
    mons.append(dict(id=m["slug"], name=m["name"], spe=m["spe"], abilities=[m["ability_slug"]], base=m["base_slug"],
                     stone=m["mega_stone"], sid=m["slug"], sprite=sprite("mega", m["slug"])))

used_ab = sorted({a for m in mons for a in m["abilities"]})
align = {r["alignment"]: [r["raises"] or None, r["lowers"] or None] for r in q("select * from stat_alignment")}
out = dict(
    version=dict(q("select key,value from meta")) if q("select name from sqlite_master where name='meta'") else {},
    mons=mons,
    items=items,
    abilities={a: abil.get(a, a) for a in used_ab},
    alignments=align,
)
json.dump(out, open(os.path.join(ROOT, "data/base.json"), "w"), separators=(",", ":"))
print(f"{len(mons)} mons, {len(items)} items, {sum(1 for m in mons if m['sprite'])} sprites")
