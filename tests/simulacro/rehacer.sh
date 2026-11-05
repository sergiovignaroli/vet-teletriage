#!/bin/bash
# Reinicia todo y vuelve a correr el recorrido completo (siembra + capturas).
DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$DIR/up.sh" >/dev/null 2>&1
cd "$DIR/sim" && node seed.js && node seed2.js && node seed3.js && node tour.js > tour.log 2>&1; echo FIN >> tour.log
