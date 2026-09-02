#!/usr/bin/env python3
"""
Sincroniza prisma/schema.sqlite.prisma desde prisma/schema.mysql.prisma.

Garantiza que el schema SQLite (usado en vista previa) tenga EXACTAMENTE los
mismos modelos y columnas que el schema MySQL (usado en producción Railway).
Evita desfases como columnas que existen en MySQL pero faltan en SQLite
(p.ej. SiteConfig.specialDates).

Transformaciones aplicadas:
  1. Elimina ' @db.LongText' (solo válido en MySQL; en SQLite String = TEXT).
  2. Quita binaryTargets multi-plataforma del generator (innecesario en local).
  3. Cambia el datasource provider de 'mysql' a 'sqlite'.
  4. Actualiza el comentario de cabecera.

Uso: python3 scripts/sync-sqlite-schema.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MYSQL = ROOT / "prisma" / "schema.mysql.prisma"
SQLITE = ROOT / "prisma" / "schema.sqlite.prisma"

src = MYSQL.read_text(encoding="utf-8")
out = re.sub(r" @db\.LongText", "", src)
out = re.sub(r"  binaryTargets = \[[^\]]*\]\n", "", out)
out = out.replace('provider = "mysql"', 'provider = "sqlite"')
out = out.replace(
    "// PRISMA SCHEMA — Dulce Encanto (MySQL para Railway/Hostinger)",
    "// PRISMA SCHEMA — Dulce Encanto (SQLite para vista previa/sandbox)",
)
out = out.replace(
    "// MySQL — compatible con Railway y Hostinger.\n"
    "// Los campos JSON se guardan como @db.LongText para evitar límites de VARCHAR.",
    "// SQLite — usado en vista previa (sandbox). En producción (Railway) se usa\n"
    "// schema.mysql.prisma. Este archivo se genera desde schema.mysql.prisma\n"
    "// (ver scripts/sync-sqlite-schema.py) para mantener paridad de columnas.",
)

SQLITE.write_text(out, encoding="utf-8")

models_src = len(re.findall(r"^model ", src, flags=re.M))
models_out = len(re.findall(r"^model ", out, flags=re.M))
print(f"✓ schema.sqlite.prisma regenerado ({models_out}/{models_src} modelos)")
assert models_src == models_out, "¡Conteo de modelos no coincide!"
leftover = out.count("@db.")
print(f"  @db.* restantes: {leftover} (debe ser 0)")
print("  Recuerda: cp prisma/schema.sqlite.prisma prisma/schema.prisma && prisma generate")
