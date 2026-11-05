# Simulacro y pruebas de la plataforma

Recorrido automático y pruebas de la plataforma **contra una base de prueba local**. No usa ningún proveedor real (ni Mercado Pago, ni PayPal, ni Agora, ni Truora, ni WhatsApp, ni correo: los dos últimos se reemplazan por servidores falsos en `fakes.js`).

## Qué hay

| Carpeta / archivo | Para qué sirve |
|---|---|
| `up.sh` | Levanta Postgres de prueba (puerto 5544), la API (3999), la web (3100) y los servidores falsos |
| `rehacer.sh` | Reinicia todo, siembra datos y corre el recorrido completo (`sim/tour.js`) |
| `fakes.js` | Falsos de WhatsApp (puerto 4500) y correo (puerto 4525); guardan lo enviado en `fakes.log` |
| `sim/seed*.js` | Siembran administrador, veterinarios y casos de prueba |
| `sim/tour.js` | Recorre las pantallas en celular y computadora y saca capturas en `sim/shots/` |
| `api/test-*.js` | Pruebas de la API (flujo, precios, modos de precio, especies, fotos, ayuda, errores graves) |
| `fixtures/` | Foto de prueba |
| `galeria/gen.py` | Genera la galería HTML con las capturas para revisar pantalla por pantalla |

## Cómo se usa

1. Compilar: `npm run build` en `apps/api` y, en `apps/web`, `NEXT_PUBLIC_API_URL=http://localhost:3999 npm run build` (sin esa variable la web compilada le habla a otra API y las pantallas del veterinario salen con «No pudimos cargar»).
2. Tener PostgreSQL instalado y una base `vet` creada en el puerto 5544 con las migraciones aplicadas (`prisma migrate deploy`).
3. `bash tests/simulacro/rehacer.sh`
4. Mirar `sim/tour.log` (termina con `FIN`) y las capturas en `sim/shots/`.
5. Pruebas sueltas de la API: `node tests/simulacro/api/test-flujo.js` (con la API arriba).

Variables útiles: `REPO_ROOT` (ruta del repositorio), `SP` (carpeta de trabajo, por defecto `.trabajo/`), `PGDATA_PRUEBA` (datos de Postgres de prueba).

Requiere Playwright instalado para `tour.js`.

## Lo que NO cubre

Videollamada real (Agora), pagos reales, WhatsApp y correo reales, avisos push en dispositivos físicos, ni celulares reales. Eso se prueba aparte (ver Notion: «Qué falta y cómo hacerlo»).

## Límite de intentos

El registro de veterinarios admite 5 por hora por IP. `rehacer.sh` reinicia la API entre cada paso que registra, para que el límite no corte el recorrido.

## Estado de las pruebas (05/11/2026)

- Recorrido completo (`rehacer.sh`): sin fallas, con la marca en ™ (la marca todavía no está registrada).
- `test-graves`, `test-especies`, `test-ayuda`, `test-modos`, `test-flujo`: pasan.
- `test-foto`: una aserción espera 400 y la API responde 413 para una foto demasiado pesada (el límite de tamaño del servidor actúa antes). Es anterior a esta etapa y no es un error de la plataforma.
- `test-api-precios`: una aserción (que el piso suba el precio efectivo) quedó desactualizada porque el modo de precio por defecto ahora es LIBRE; el comportamiento por modo lo cubre `test-modos`. Pendiente de actualizar.
- `test-ayuda` no se puede repetir sobre los mismos datos (siempre registra `ayuda@v.test` y deja preguntas): correr `rehacer.sh` antes, o borrar ese veterinario y las preguntas de ayuda de la base de prueba.
- `test-flujo`, `test-api-precios` y `test-modos` necesitan una base `precios_test` limpia: correr antes `api/base-limpia.sh` (variable `DATABASE_URL_PRUEBAS` para otra base).
- Las pruebas de la API que llaman por HTTP necesitan `JWT_SECRET=testsecret` y reiniciar la API (`up.sh`) entre pruebas de registro, por el límite de 5 registros por hora.
