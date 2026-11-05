#!/bin/bash
# Reinicia todo y vuelve a correr el recorrido completo (siembra + capturas).
# La API limita los registros de veterinarios a 5 por hora por IP: se la reinicia
# entre cada paso que registra para que el límite no corte la prueba.
DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$DIR/up.sh" >/dev/null 2>&1
cd "$DIR/sim" && node seed.js
bash "$DIR/up.sh" >/dev/null 2>&1; node seed2.js
bash "$DIR/up.sh" >/dev/null 2>&1; node seed3.js
bash "$DIR/up.sh" >/dev/null 2>&1; node tour.js > tour.log 2>&1; echo FIN >> tour.log
