#!/usr/bin/env python3
"""
Quita @db.LongText del schema SQLite (schema.prisma).
@db.LongText SOLO es válido para MySQL. En SQLite, los campos String son
TEXT por defecto (sin límite de tamaño), así que no necesitan @db.LongText.

Este script NO toca schema.mysql.prisma (que sí debe mantener @db.LongText).
"""
import re
from pathlib import Path

SCHEMA_PATH = Path("/home/z/my-project/prisma/schema.prisma")
text = SCHEMA_PATH.read_text(encoding="utf-8")

original_text = text

# Patrón: buscar ` @db.LongText` (con espacio antes) y eliminarlo
# También maneja casos como `@default("[]") @db.LongText` → `@default("[]")`
text = re.sub(r'\s+@db\.LongText', '', text)

if text == original_text:
    print("⚠ No se hicieron cambios — el schema no tiene @db.LongText")
else:
    SCHEMA_PATH.write_text(text, encoding="utf-8")
    removed = original_text.count('@db.LongText') - text.count('@db.LongText')
    print(f"✓ Schema SQLite limpiado:")
    print(f"  @db.LongText removidos: {removed}")
    print(f"  @db.LongText restantes: {text.count('@db.LongText')} (debe ser 0)")
    print(f"  Archivo: {SCHEMA_PATH}")
