#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  SWITCH SCHEMA — Dulce Encanto
#  Cambia entre SQLite (vista previa Z.AI) y MySQL (Railway/Hostinger)
#
#  Uso:
#    bash scripts/switch-to-sqlite.sh   → SQLite para vista previa
#    bash scripts/switch-to-mysql.sh    → MySQL para producción
# ═══════════════════════════════════════════════════════════════════════════
set -e

SCHEMA_DIR="prisma"
TARGET="${1:-sqlite}"

case "$TARGET" in
  sqlite)
    echo "📋 Cambiando a SQLite (vista previa Z.AI)..."
    cp "$SCHEMA_DIR/schema.sqlite.prisma" "$SCHEMA_DIR/schema.prisma" 2>/dev/null || true
    # Si no existe schema.sqlite.prisma, el schema.prisma actual ya es SQLite
    if [ ! -f "$SCHEMA_DIR/schema.sqlite.prisma" ]; then
      echo "  ℹ️  schema.prisma ya es SQLite (no se necesita cambio)"
    fi
    echo "  ✅ Schema: SQLite"
    echo "  💡 Asegúrate de que .env tenga: DATABASE_URL=file:..."
    ;;

  mysql)
    echo "📋 Cambiando a MySQL (Railway/Hostinger)..."
    if [ ! -f "$SCHEMA_DIR/schema.mysql.prisma" ]; then
      echo "  ❌ Error: $SCHEMA_DIR/schema.mysql.prisma no existe"
      exit 1
    fi
    cp "$SCHEMA_DIR/schema.mysql.prisma" "$SCHEMA_DIR/schema.prisma"
    echo "  ✅ Schema: MySQL"
    echo "  💡 Asegúrate de que .env tenga: DATABASE_URL=mysql://..."
    echo "  💡 Ejecuta: bun run db:push && bun run db:generate"
    ;;

  *)
    echo "Uso: bash scripts/switch-schema.sh [sqlite|mysql]"
    echo "  sqlite → Vista previa en Z.AI (por defecto)"
    echo "  mysql  → Producción en Railway/Hostinger"
    exit 1
    ;;
esac

echo ""
echo "🔄 Regenerando Prisma Client..."
bun run db:generate 2>/dev/null || npx prisma generate
echo "✅ Listo"
