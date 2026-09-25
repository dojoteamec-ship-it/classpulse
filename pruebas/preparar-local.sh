#!/usr/bin/env bash
# Crea una base local "classpulse_prueba" con el shim de Supabase, el esquema
# de ClassVote (../classvote/migrations + seed, sin pg_cron) y las migraciones
# cp_ en orden. Uso: pruebas/preparar-local.sh [ruta-a-classvote]
set -euo pipefail
CV=${1:-../classvote}
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
PSQL="psql -v ON_ERROR_STOP=1 -q"
su postgres -c "dropdb --if-exists classpulse_prueba && createdb classpulse_prueba"
for r in anon authenticated service_role; do su postgres -c "psql -q -c 'drop role if exists $r'" 2>/dev/null || true; done
correr() { su postgres -c "$PSQL -d classpulse_prueba -f '$1'"; }
correr "$RAIZ/pruebas/shim-supabase.sql"
for f in "$CV"/migrations/000*.sql; do
  # La sección de pg_cron de 0004 no existe localmente.
  python3 -c "import re,sys;t=open(sys.argv[1]).read();t=re.sub(r'create extension if not exists pg_cron;','',t);t=re.sub(r'select cron\.schedule\(.*?\);','',t,flags=re.S);open('/tmp/cv_mig.sql','w').write(t)" "$f"
  correr /tmp/cv_mig.sql
done
correr "$CV/seed.sql"
correr "$RAIZ/pruebas/usuarios-prueba-local.sql"
for f in $(ls "$RAIZ"/migrations/cp_*.sql | grep -v '_down.sql' | sort); do
  echo "→ $(basename "$f")"; correr "$f"
  echo "→ $(basename "$f") (segunda vez, idempotencia)"; correr "$f"
done
correr "$RAIZ/pruebas/usuarios-prueba.sql"
echo "Base local lista."
