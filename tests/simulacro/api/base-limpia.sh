#!/bin/bash
# Recrea la base precios_test (puerto 5544) limpia y con todas las migraciones.
# Las pruebas test-flujo, test-api-precios y test-modos necesitan una base limpia
# cada vez que se corren.
REPO="${REPO_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
psql -h localhost -p 5544 -U postgres -c "DROP DATABASE IF EXISTS precios_test" -c "CREATE DATABASE precios_test" >/dev/null
cd "$REPO/apps/api" && DATABASE_URL=postgresql://postgres@localhost:5544/precios_test npx prisma migrate deploy >/dev/null
echo "base precios_test limpia"
