#!/usr/bin/env bash
# Corre un archivo SQL de pruebas en local (psql) o contra Supabase (Management
# API). Las pruebas terminan con raise exception 'PRUEBAS_OK' para que todo se
# deshaga (rollback); cualquier otro error es una falla.
# Uso: pruebas/correr-sql.sh local|remoto archivo.sql [...]
set -uo pipefail
DESTINO=$1; shift
fallas=0
for f in "$@"; do
  if [ "$DESTINO" = local ]; then
    salida=$(su postgres -c "psql -q -d classpulse_prueba -f '$(realpath "$f")'" 2>&1)
  else
    salida=$(python3 -c 'import json,sys;print(json.dumps({"query":open(sys.argv[1]).read()}))' "$f" |
      curl -sS -X POST -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
        "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" --data-binary @-)
  fi
  if echo "$salida" | grep -q "PRUEBAS_OK"; then
    echo "✓ $(basename "$f") ($DESTINO)"
  else
    echo "✗ $(basename "$f") ($DESTINO)"; echo "$salida" | grep -v "^$" | head -5; fallas=$((fallas + 1))
  fi
done
exit $fallas
