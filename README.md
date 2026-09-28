# Plataforma de Teletriage Veterinario — esqueleto técnico

Este repo traduce a código las decisiones ya tomadas en dos documentos:

- **Contrato de Prestación de Servicios — Veterinario Colaborador** (autonomía laboral, cargo fijo por
  franja horaria, política de reembolso, checklist de cierre, disputas en dos circuitos).
- **Elección de Proveedores Técnicos** (Mercado Pago split 1:1, Truora para KYC, Twilio/Daily.co/Zoom
  Video SDK a comparar, WhatsApp Cloud API directo, PayPal para clientes internacionales, Payoneer como
  alternativa de cobro para el veterinario).

Cada regla de negocio no obvia está comentada en el código señalando de qué sección del contrato sale,
para que un cambio en el contrato sea fácil de rastrear hasta el código que lo implementa.

## Estructura

```
apps/
  api/    NestJS + Prisma — la lógica de negocio y la base de datos
  web/    Next.js — lo que ve el cliente (buscar veterinario, formulario de intake)
packages/
  types/  Tipos y constantes compartidos entre api y web (franjas horarias, cargos, etc.)
```

## Por qué Prisma 6.19.3, no la última versión

Prisma cambió mucho entre las versiones 6, 7 y 8: desde la 7 en adelante, la URL de conexión ya no va en
`schema.prisma` sino en un `prisma.config.ts` separado con adaptadores, y la 8 (todavía en release
candidate a la fecha de este documento) reorienta el CLI hacia la plataforma hosteada propia de Prisma
(deploy, bases de datos gestionadas, etc.) en vez del uso self-hosted que necesita este proyecto. Se fijó
6.19.3 — la última versión estable con el modelo clásico — a propósito, no por descuido. Antes de
actualizar, confirmar que el nuevo modelo de configuración sigue sirviendo para una base propia en AWS/GCP
y no empuja hacia el hosting de Prisma.

## Cómo arrancar

```bash
npm install
cp .env.example .env   # completar con las credenciales reales de cada proveedor y generar JWT_SECRET/ADMIN_API_KEY
cd apps/api && npx prisma migrate dev --name init   # ya incluye la migración inicial en prisma/migrations/
npm run dev             # desde la raíz, levanta api y web en paralelo (turbo)
```

`JWT_SECRET`: generar con `openssl rand -base64 48`. `ADMIN_API_KEY`: cualquier string largo random —
es el stopgap para resolver disputas (ver más abajo), no un sistema de roles.

## Lo que ya está implementado (compilado y buildeado, no solo escrito)

- **Schema de Prisma completo**: Veterinario, Cliente, Caso, IntakeFormulario, CierreCaso,
  VerificacionIdentidad, Pago, DisputaIdentidad, DisputaCalidad, Calificacion, PuntoPremio.
- **Módulo `veterinarios`**: búsqueda por proximidad y la suspensión automática (no disciplinaria) por
  vencimiento de matrícula o seguro — Sección 2 del contrato.
- **Módulo `casos`**: creación de caso con intake de dos capas, cálculo del cargo de plataforma según
  franja horaria en el momento real de inicio de sesión (no el de la reserva) — Sección 4 — y cierre de
  caso con el checklist estructurado — Sección 9.
- **Módulo `pagos`**: la regla de reembolso de la Sección 8, codificada — solo `NO_COMPLETADO` habilita
  reembolso, y ese reembolso alcanza únicamente al cargo de plataforma, nunca al honorario. El webhook de
  Mercado Pago verifica la firma HMAC-SHA256 (`x-signature` + `x-request-id` + `data.id`, comparación en
  tiempo constante) antes de procesar cualquier notificación — un payload con firma inválida o ausente
  devuelve 401, no se confía en el body sin verificar.
- **Módulo `disputas`**: los dos circuitos de la Sección 10. Identidad → abre disputa y suspende
  cautelarmente al veterinario de inmediato; al resolver, se revalida vigencia de matrícula/seguro antes de
  restituir el estado `HABILITADO`. Calidad → abre disputa y, si se hace lugar, dispara
  `reembolsarCargoPlataforma` (nunca el honorario) vía el mismo servicio de `pagos`.
- **Módulo `calificaciones`**: registro de estrellas + comentario, promedio por veterinario, y un sistema de
  puntos-premio con regla placeholder (10 puntos si estrellas ≥ 4) — el mecanismo funciona, el umbral y el
  valor exacto son decisiones de negocio pendientes de Sergio, aisladas en un solo lugar del código para
  ajustarlas sin tocar el resto.
- **Formulario de intake en `apps/web/app/intake`**: las 8 banderas rojas de la Sección 9, con el aviso de
  emergencia calculado en el cliente en tiempo real y sin bloquear el flujo — tal como lo describe el
  contrato.
- **Módulo `auth`**: login de veterinarios con email + contraseña (bcrypt, JWT de 12 h) y login de
  clientes sin contraseña vía código OTP enviado por WhatsApp Cloud API (el teléfono es el identificador,
  no el email — no pide nombre/email para no meter fricción en un flujo de emergencia). Probado de punta a
  punta contra una base Postgres real y contra la API real de WhatsApp Cloud (llegó un 401 real de Meta por
  no tener token válido — confirma que el endpoint/payload están bien armados, solo falta un token de
  producción).
- **Guards de autorización aplicados a todo lo que quedaba abierto**: crear un caso, iniciar/cerrar una
  sesión, calificar y liquidar un pago ahora exigen el rol correcto Y que quien llama sea efectivamente el
  cliente o veterinario dueño de ese caso — el id nunca sale del body, sale del JWT. Antes de este cambio,
  cualquiera con la URL podía hacer cualquiera de estas cinco cosas en nombre de otro.
- **Disputas — rol `ADMIN` real, no una clave compartida**: abrir/resolver una disputa de identidad y
  resolver una de calidad exigen JWT con rol `ADMIN`, y cada disputa queda con `abiertaPorAdminId` /
  `resueltaPorAdminId` — se sabe qué cuenta de staff tomó cada decisión, no solo que "alguien con la clave"
  la tomó. No hay alta pública de admins: la primera cuenta (y cualquier otra) se crea con
  `POST /auth/admin/registrar` detrás de `ADMIN_API_KEY` (ver `admin-key.guard.ts`, que ahora protege
  únicamente ese endpoint de bootstrap); de ahí en más es login normal con email+contraseña. Abrir una
  disputa de calidad sigue en manos del cliente dueño del caso, porque el daño posible es acotado (como
  mucho, revisa un reembolso del cargo de plataforma).
- **Revocación de sesiones (sin blacklist)**: cada Veterinario/Cliente/Admin tiene un `tokenVersion` en la
  base; el JWT lleva ese valor (`tv`) al momento de firmarse, y `jwt.strategy.ts` lo revalida en cada
  request contra la base. `POST /auth/veterinario/revocar-sesiones` incrementa el contador y listo: todo
  JWT emitido antes queda inválido al toque, sin esperar a que expire, sin guardar una lista de tokens
  revocados. Probado en vivo: mismo token, antes de revocar pasa; después de revocar, 401 inmediato; un
  login nuevo después de revocar, válido de nuevo.
- **OAuth de Mercado Pago (Split 1:1)**: `GET /pagos/mercadopago/oauth/iniciar` (autenticado, devuelve la
  URL de autorización con un `state` firmado con HMAC para que el callback no pueda ser manipulado) y
  `GET /pagos/mercadopago/oauth/callback` (público — lo llama Mercado Pago, no el navegador logueado —
  intercambia el `code` por tokens y los guarda en el veterinario). Endpoint y payload verificados contra
  la documentación oficial de Mercado Pago.
- **Verificación de identidad con Truora (módulo `identidad`)**: `POST /identidad/iniciar` crea el proceso
  en la Identity API de Truora; `GET /identidad/:id/estado` hace polling del resultado y, si vuelve
  inconsistente, dispara automáticamente el circuito de disputa de identidad (suspensión cautelar). El
  header de autenticación (`Truora-API-Key`) está verificado contra la doc oficial; el resto del flujo
  (nombres exactos de campos de respuesta) sale de un resumen de la guía de Truora, no del JSON crudo de su
  referencia — marcado como `[Probable]` en `truora.util.ts`, para revisar antes de cargar credenciales
  reales.

## Lo que falta (a propósito, no por error)

- **Creación de la preferencia de pago con split**: la conexión OAuth del veterinario ya guarda su
  `access_token`, pero falta el código que arma el checkout con `marketplace_fee` usando ese token —
  necesita al menos un veterinario conectado de verdad para poder probarlo contra la API real.
- **Proveedor de video**: sigue pendiente de la prueba de carga de Sergio (Twilio/Daily.co/Zoom Video SDK).
- **Valores de negocio de `calificaciones`**: umbral de estrellas y puntos exactos a otorgar (ver comentario
  en `calificaciones.service.ts`).
- **Refresh token**: el JWT actual no tiene renovación automática — vence a las 12 h y hay que loguearse de
  nuevo (aceptable para el MVP). La revocación anticipada (logout forzado) sí está resuelta, ver arriba.

## Próximo paso sugerido

Elegir el proveedor de video (Sergio es el único que puede correr la prueba de carga) — es la única pieza
del frontend que cambia de forma significativa según cuál se elija, y ya no hay nada más bloqueando el
arranque técnico del lado del backend.
