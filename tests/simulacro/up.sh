#!/bin/bash
# Levanta la base de prueba (Postgres 5544), la API (3999), la web (3100) y los
# servidores falsos de WhatsApp y correo. NO usa ningún proveedor real.
# Requiere: la API y la web compiladas (npm run build en cada una).
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${REPO_ROOT:-$(cd "$DIR/../.." && pwd)}"
SP="${SP:-$DIR/.trabajo}"
mkdir -p "$SP"
pg_isready -p 5544 >/dev/null || {
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)
  su postgres -c "$PGBIN/pg_ctl -D ${PGDATA_PRUEBA:-/var/tmp/pgdata} -o '-p 5544' -l ${PGDATA_PRUEBA:-/var/tmp/pgdata}/server.log -w -t 30 start" >/dev/null 2>&1
}
# Claves VAPID de prueba (se generan una sola vez)
if [ ! -f "$SP/vapid.pub" ]; then
  (cd "$REPO/apps/api" && node -e '
    const w=require("web-push"); const k=w.generateVAPIDKeys();
    require("fs").writeFileSync(process.argv[1]+"/vapid.pub",k.publicKey);
    require("fs").writeFileSync(process.argv[1]+"/vapid.key",k.privateKey);' "$SP")
fi
cd "$REPO/apps/api"
fuser -k 3999/tcp >/dev/null 2>&1
(DATABASE_URL=postgresql://postgres@localhost:5544/vet JWT_SECRET=testsecret ADMIN_API_KEY=k PORT=3999 WEB_APP_URL=http://localhost:3100 VAPID_PUBLIC_KEY=$(cat "$SP/vapid.pub") VAPID_PRIVATE_KEY=$(cat "$SP/vapid.key") VAPID_SUBJECT=mailto:test@example.com WHATSAPP_CLOUD_API_TOKEN=tok WHATSAPP_CLOUD_API_PHONE_NUMBER_ID=123 WHATSAPP_GRAPH_BASE_URL=http://localhost:4500 WHATSAPP_PLANTILLA_NUEVA_CONSULTA_VET=nueva_consulta_vet WHATSAPP_PLANTILLA_CONSULTA_ACEPTADA_CLIENTE=consulta_aceptada WHATSAPP_PLANTILLA_OTP=otp_login SMTP_HOST=localhost SMTP_PORT=4525 SMTP_USER=u SMTP_PASS=p EMAIL_FROM=avisos@test.local nohup node dist/main.js > "$SP/api.log" 2>&1 &)
cd ../web; fuser -k 3100/tcp >/dev/null 2>&1
(nohup npx next start -p 3100 > "$SP/web.log" 2>&1 &)
fuser -k 4500/tcp 4525/tcp >/dev/null 2>&1
(nohup node "$DIR/fakes.js" >/dev/null 2>&1 &)
sleep 6
pg_isready -p 5544
curl -s -o /dev/null -w "api %{http_code}\n" localhost:3999/notificaciones/push/clave
curl -s -o /dev/null -w "web %{http_code}\n" localhost:3100/
