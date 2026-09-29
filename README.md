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

## Deploy a Render

`render.yaml` en la raíz es un Blueprint — describe los 3 recursos que hacen falta (base Postgres,
`apps/api`, `apps/web`) para que Render los cree de una:

1. Entrar a [render.com](https://render.com) → **New** → **Blueprint** → conectar este repo de GitHub
   (`sergiovignaroli/vet-teletriage`). Render detecta `render.yaml` solo.
2. Render va a pedir valores para las variables marcadas `sync: false` (WhatsApp, Mercado Pago, Truora,
   etc.) — **se pueden dejar en blanco por ahora**. El código las lee recién cuando se usa esa función
   puntual (mandar un OTP, iniciar el OAuth de Mercado Pago), así que no bloquean que el resto de la app
   arranque. `JWT_SECRET` y `ADMIN_API_KEY` se generan solos (`generateValue: true`), y `DATABASE_URL`,
   `WEB_APP_URL` y `NEXT_PUBLIC_API_URL` se completan solos entre los dos servicios — no hay URLs para
   copiar y pegar a mano.
3. **Apply**. Cuando termine, cada servicio tiene su URL pública en el dashboard de Render (algo como
   `https://vet-teletriage-api.onrender.com`) — esa es la URL real que faltaba para el link desde la
   landing de Wix hacia `/ingresar-veterinario`.

Dos cosas a tener en cuenta, no son errores de configuración:

- **La base Postgres free de Render expira a los 30 días** y hay que recrearla o pasarla a un plan pago
  antes de eso — no sirve para algo que se vaya a usar más de un mes tal cual.
- **Los servicios web free "duermen"** después de un rato sin tráfico — la primera visita después de eso
  tarda unos segundos en responder mientras arranca de nuevo. Para una demo puntual no importa; para algo
  que Sergio vaya a mostrarle a alguien en vivo sin avisar, conviene pasar el servicio de `apps/web` (o
  los dos) a un plan pago antes.

Sin acceso a un Render real desde este entorno, lo de arriba se verificó localmente pero no contra Render
en sí: `npm install`, `npx prisma generate --schema=apps/api/prisma/schema.prisma`, `npm run build
--workspace=@vet-teletriage/api`, `npm run build --workspace=@vet-teletriage/web` y `npm run start
--workspace=@vet-teletriage/web` (bindea a `$PORT`, probado) corren limpios — lo único no probado en este
entorno es `prisma migrate deploy` contra una base real, y el wireo cruzado `RENDER_EXTERNAL_URL` entre los
dos servicios, que es comportamiento de Render y no se puede simular acá.

**Nota de la primera corrida real (2026-09-28):** el plan free de Render no soporta `preDeployCommand` —
Render lo rechazó al crear el Blueprint. La migración (`prisma migrate deploy`) quedó movida al final de
`buildCommand` del servicio `api` en vez de en `preDeployCommand`; es seguro porque `migrate deploy` no
hace nada si no hay migraciones pendientes. Si en algún momento se pasa `api` a un plan pago, ahí sí
conviene volver a separarla en `preDeployCommand`.

## Lo que ya está implementado (compilado y buildeado, no solo escrito)

- **Schema de Prisma completo**: Veterinario, Cliente, Caso, IntakeFormulario, CierreCaso,
  VerificacionIdentidad, Pago, DisputaIdentidad, DisputaCalidad, Calificacion, PuntoPremio.
- **Módulo `veterinarios`**: búsqueda por proximidad (para uso futuro — hoy nada del flujo online la llama,
  ver más abajo) y la suspensión automática (no disciplinaria) por vencimiento de matrícula o seguro —
  Sección 2 del contrato. `PATCH /veterinarios/conectar` / `PATCH /veterinarios/desconectar` prenden y
  apagan `Veterinario.disponible` — antes ese campo solo lo tocaba el sistema (vencimientos, disputas),
  nunca el propio veterinario. `conectar` exige `estado === "HABILITADO"`.
- **Módulo `casos`**: creación de caso con intake de dos capas y cierre con el checklist estructurado —
  Sección 9. **El matching cambió de sentido (decisión de Sergio, 2026-09-29): el cliente tiene que ver el
  costo total y poder elegir ANTES de contratar**, así que ya no es el veterinario quien "toma" el primer
  caso libre de una cola — el cliente pide `GET /casos/:id/para-elegir` (veterinarios conectados +
  habilitados, con el precio ya calculado para ESE caso y su rating) y elige con `PATCH /casos/:id/asignar
  { veterinarioId }`, que congela el precio y pasa el caso a `ASIGNADO`. El veterinario solo confirma el
  arranque con `PATCH /casos/:id/iniciar` (sin body — ya no declara nada ahí, ver más abajo) y pasa a
  `EN_SESION`. La vieja cola `GET /casos/disponibles` (donde el veterinario agarraba casos libres) quedó
  retirada — la reemplaza el flujo de arriba.
  - **Precio calculado por la plataforma, no declarado libremente por el veterinario**: `Caso.honorarioBase`
    se fija al crear el caso (`honorarioBaseDe()` en `packages/types` — franja horaria + si el intake
    disparó alguna bandera roja, sin pedirle nada nuevo al cliente) y queda fijo desde ahí. Cada veterinario
    conectado tiene su propio `Veterinario.margenPorcentaje` (−20% a +20%, `PATCH /veterinarios/margen`,
    acotado siempre en el backend) que ajusta esa base. `Caso.honorarioDeclarado` ya no nace libre: se
    calcula una sola vez, en `asignar()`, como `honorarioBase × (1 + margen del elegido / 100)`, y no se
    vuelve a tocar en `iniciar()` — el número que el cliente vio antes de elegir es el que paga.
    **`HONORARIO_BASE` y `RECARGO_URGENCIA_PORCENTAJE` en `packages/types` son placeholders** (mismos
    valores que `CARGO_PLATAFORMA` como punto de partida) — Sergio tiene que reemplazarlos por precio de
    mercado real antes de producción.
  - El piso de calidad de la Sección 11/12 (`PISO_CALIDAD_ESTRELLAS = 3`) ya tiene consumidor real: un
    veterinario con calificaciones por debajo del piso queda fuera de la lista de `para-elegir` (uno sin
    calificaciones todavía no se excluye — no hay señal para juzgarlo). Esto era justamente lo que el
    comentario de `calificaciones.service.ts` marcaba como "Fase 2, todavía no implementado" — dejó de serlo.
  - `GET /casos/mios` (casos del veterinario que llama, por JWT) sigue igual.
- **Módulo `pagos`**: cobro inmediato vía Checkout Pro con split (el tutor paga el total al elegir
  veterinario), reembolso según la Sección 8 al cerrar el caso — `NO_COMPLETADO` es la única clasificación
  que habilita reembolso, y alcanza a todo menos `CARGO_NO_COMPLETADO` (ver el detalle completo, con la
  corrección del 2026-09-29 sobre el reparto proporcional de Mercado Pago, más abajo en "Lo que se hizo" /
  "Lo que falta"). El webhook de Mercado Pago verifica la firma HMAC-SHA256 (`x-signature` + `x-request-id` +
  `data.id`, comparación en tiempo constante) antes de procesar cualquier notificación — un payload con firma
  inválida o ausente devuelve 401, no se confía en el body sin verificar.
- **Módulo `disputas`**: los dos circuitos de la Sección 10. Identidad → abre disputa y suspende
  cautelarmente al veterinario de inmediato; al resolver, se revalida vigencia de matrícula/seguro antes de
  restituir el estado `HABILITADO`. Calidad → abre disputa y, si se hace lugar, dispara
  `reembolsarCargoPlataforma` (nunca el honorario) vía el mismo servicio de `pagos`.
- **Módulo `calificaciones`**: registro de estrellas + comentario, promedio por veterinario, y un sistema de
  puntos-premio con regla placeholder (10 puntos si estrellas ≥ 4) — el mecanismo funciona, el umbral y el
  valor exacto son decisiones de negocio pendientes de Sergio, aisladas en un solo lugar del código para
  ajustarlas sin tocar el resto.
- **Formulario de intake en `apps/web/app/intake`, conectado de punta a punta**: las 8 banderas rojas de la
  Sección 9, con el aviso de emergencia calculado en el cliente en tiempo real y sin bloquear el flujo. Al
  crear el caso (`POST /casos`, con el token del cliente logueado) ya no muestra un cartel genérico de
  "te contactamos por WhatsApp" — redirige a `/elegir-veterinario/[casoId]` (nueva pantalla), donde el
  cliente ve el costo total de cada veterinario conectado y elige antes de que nadie lo atienda. Si no hay
  ninguno conectado en ese momento, el caso queda registrado igual con un mensaje honesto sobre eso.
- **Módulo `auth`**: login de veterinarios con email + contraseña (bcrypt, JWT de 12 h) y login de
  clientes sin contraseña vía código OTP enviado por WhatsApp Cloud API (el teléfono es el identificador,
  no el email — no pide nombre/email para no meter fricción en un flujo de emergencia). Probado de punta a
  punta contra una base Postgres real y contra la API real de WhatsApp Cloud (llegó un 401 real de Meta por
  no tener token válido — confirma que el endpoint/payload están bien armados, solo falta un token de
  producción). El login/registro de veterinario devuelve `veterinarioId`, `nombre` y `apellido` explícitos
  en el body (mismo criterio que `clienteId` en el login de cliente) porque el frontend no decodifica el JWT.
- **Lado del veterinario en `apps/web`, completo y conectado**: `/ingresar-veterinario` (login por
  email+contraseña), sesión en localStorage (`lib/sesion-veterinario.ts`, misma clave de diseño que la del
  cliente pero en un storage key distinto — un mismo navegador podría tener las dos sesiones abiertas),
  `/panel-veterinario` con un interruptor real de "Conectado / Desconectado" (`PATCH
  /veterinarios/conectar|desconectar`, deshabilitado si la cuenta no está `HABILITADO`), un control de
  margen (`PATCH /veterinarios/margen`, −20% a +20%) y una sola lista, `Mis casos` (`GET /casos/mios`) — ya
  no hay pestaña de "casos disponibles" para agarrar: cuando el cliente elige a este veterinario, el caso
  aparece acá directamente en estado `ASIGNADO` con un botón "Iniciar videollamada"
  (`PATCH /casos/:id/iniciar`, sin body). El gate de onboarding tiene copy propio del veterinario
  (`<Onboarding variante="veterinario">`, mismo componente que el del cliente, mismo endpoint
  `PATCH auth/onboarding-completado`). `/ingresar` y `/ingresar-veterinario` se linkean entre sí para quien
  entra por la puerta equivocada.
- **Home (`/`) con la identidad de marca aplicada**: era la única pantalla que había quedado con estilo de
  navegador puro (sin `globals.css`) desde que se armó el wiring del intake — ahora usa el mismo logo,
  tipografías y `.va-boton` que `/ingresar`, con enlaces a iniciar consulta, ingresar como cliente e ingresar
  como veterinario.
- **Circuito de calificación (estrellitas), cerrado de punta a punta (Sergio, 2026-09-29)**: `POST
  /calificaciones` ya existía en el backend desde hace tiempo, pero ninguna pantalla de `apps/web` lo
  llamaba nunca — el sistema de calificación que sostiene el piso de calidad del matching y los
  puntos-premio no tenía forma real de alimentarse. Ahora `/panel` tiene una sección "Mis consultas"
  (`GET /casos/mios-cliente`, nuevo — historial del cliente con el veterinario asignado y si ya calificó
  cada caso) y, para un caso `CERRADO` sin calificar, un link a `/calificar/[casoId]` (selector de 1 a 5
  estrellas + comentario opcional). No se agregó un `GET /casos/:id` nuevo solo para esta pantalla: reutiliza
  la misma lista de `mios-cliente` y busca el caso puntual ahí, mismo criterio de no multiplicar endpoints
  por pantalla que ya se usa en el resto de la app.
- **Reportar un problema (disputa de calidad), desde la app (Sergio, 2026-09-29)**: mismo hueco que la
  calificación — `POST /disputas/calidad` existía en el backend, nada en `apps/web` lo llamaba. Para un caso
  `CERRADO`, "Mis consultas" ahora ofrece `/reportar-problema/[casoId]` (motivo en texto libre; de cara al
  cliente nunca se usa la jerga interna "disputa", solo "reportar un problema") y, una vez enviado, muestra
  el estado (en revisión / resuelta, con la resolución si la hay) en vez de dejar reportar dos veces el mismo
  caso — `Caso.disputaCalidad` es una relación real de Prisma, así que `misCasosCliente()` la trae con un
  `include` normal (a diferencia de `Calificacion`, que se cruza a mano). Dejar clara la frontera de
  Sección 10 en el propio texto de la pantalla: como mucho reembolsa el cargo de plataforma, nunca afecta al
  veterinario más allá de la revisión.
- **Sala de video (interfaz agnóstica) + cierre de caso desde la app (Sergio, 2026-09-29: "armá la interfaz
  ahora")**: dos huecos reales encontrados juntos — ningún caso llegaba nunca a `CERRADO` porque
  `apps/web` no tenía ningún botón para `PATCH /casos/:id/cerrar` (aunque el backend ya lo soportaba desde
  antes), así que el circuito de calificación/reporte de arriba no tenía cómo activarse en la práctica; y
  "Iniciar videollamada" no creaba ninguna sala real. Se resolvieron juntos porque viven en la misma tarjeta
  de UI. Nuevo módulo `video` en `apps/api` con una interfaz `ProveedorVideo` (`crearSala(casoId)`) e
  implementación `PlaceholderVideoProvider` que devuelve `null` — nunca una URL inventada que parezca
  funcionar sin funcionar. `CasosService.iniciarSesion()` llama a `VideoService.crearSala()` al pasar a
  `EN_SESION` y guarda el resultado en `Caso.salaVideoUrl` (nuevo campo, migración
  `20260929130000_sala_video_url`). En `panel-veterinario`, un caso `EN_SESION` muestra el link a la sala (o
  "coordiná por WhatsApp" si `salaVideoUrl` es `null`) y un formulario de cierre (clasificación +
  notas → `PATCH /casos/:id/cerrar`); en `/panel` (cliente) se ve el mismo link o el mismo aviso, sin
  formulario de cierre — cerrar el caso es una decisión del veterinario, no del cliente.
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
  reales. Si Truora aprueba (`resultado === "APROBADA"`), ahora dispara además la habilitación automática de
  abajo — antes de este cambio, una aprobación de Truora no tenía ningún efecto sobre `Veterinario.estado`.
- **Habilitación automática de veterinarios + panel admin mínimo (Sergio, 2026-09-29: "la idea es que
  funcione solo... porque cuando haya mucho flujo de gente no quiero volverme loco")**: hasta ahora, NINGÚN
  código movía `Veterinario.estado` de `PENDIENTE_VERIFICACION` a `HABILITADO` la primera vez — un admin
  tenía que aprobar a cada veterinario nuevo a mano, sin excepción, algo que no escala. Ahora
  `VeterinariosService.intentarHabilitarAutomaticamente()` corre solo cuando Truora aprueba la identidad: si
  matrícula y seguro están vigentes, habilita sin que nadie toque nada; si no, el veterinario queda en
  `PENDIENTE_VERIFICACION` como excepción a revisar. El panel (`/admin/ingresar` + `/admin` en `apps/web`,
  login contra `POST /auth/admin/login`) muestra solo esas excepciones — veterinarios pendientes
  (`GET /veterinarios/pendientes`, botón habilitar manual), disputas de identidad abiertas
  (`GET /disputas/identidad/abiertas`) y disputas de calidad abiertas (`GET /disputas/calidad/abiertas`),
  cada una con su formulario de resolución. Si la habilitación automática funciona, estas listas deberían
  estar casi siempre vacías — eso es lo esperado, no un bug.
- **Un veterinario ocupado ya no puede ser elegido para otro caso (situación probable, encontrada al revisar
  `casos.service.ts` sin que nadie la pidiera puntualmente, 2026-09-29)**: `Veterinario.disponible` es un
  toggle 100% manual — "Conectarme/Desconectarme" — que nada apaga solo cuando el veterinario se pone a
  atender a alguien. Sin este fix, un veterinario con un caso `ASIGNADO` o `EN_SESION` seguía apareciendo en
  `GET /casos/:id/para-elegir` para cualquier otro cliente, así que el más barato o mejor puntuado de la
  lista podía terminar acumulando varias consultas al mismo tiempo — justo el escenario que Sergio dijo que
  quiere evitar cuando haya mucho flujo. Ahora `paraElegir()` excluye a quien ya tiene un caso activo
  (`casos: { none: { estado: { in: ["ASIGNADO", "EN_SESION"] } } }`), y `asignar()` repite el mismo chequeo
  justo antes de escribir — porque puede pasar tiempo entre que el cliente VE la lista y hace click, y para
  entonces otro cliente ya lo pudo haber elegido para otro caso.
- **"Pedir un código nuevo" en `/ingresar` (situación probable, 2026-09-29)**: el backend ya soportaba pedir
  un OTP nuevo sin cambiar de número (`otp/solicitar` resetea vencimiento e intentos), y los mensajes de
  error de "código vencido" o "demasiados intentos fallidos" literalmente dicen "pedí un código nuevo" — pero
  no había ningún botón que lo hiciera directo, solo "Cambiar número" (que además sugiere que hay que escribir
  un número distinto). WhatsApp puede tardar o el código vence a los 5 minutos — es un caso frecuente, no una
  rareza. Ahora hay un botón "Pedir un código nuevo" al lado de "Cambiar número" en la pantalla del código.
- **`/admin` ya no usa `alert()` para errores (situación probable, 2026-09-29)**: era la única pantalla de
  toda `apps/web` que mostraba un error con el diálogo nativo del navegador en vez del mismo patrón inline
  (`role="alert"`, texto en terracota) que usan las tarjetas de disputas de la misma pantalla — un admin que
  intenta habilitar a alguien con matrícula/seguro vencido (motivo real, no hipotético — `evaluarHabilitable`
  lo rechaza) se topaba con un diálogo bloqueante que desentona con el resto. `PendienteItem`, nuevo
  componente, replica el mismo patrón de `enviando`/`error` local que ya usaban `DisputaIdentidadItem` y
  `DisputaCalidadItem`.
- **Copy desactualizado en la home y comentario desactualizado en `/intake` (situación probable, 2026-09-29)**:
  la home (`/`) todavía decía "+ el honorario que fije el veterinario que te atienda" — texto de ANTES del
  rediseño de precios del 2026-09-29, cuando el veterinario ya no fija nada libremente (aplica un margen
  acotado sobre `honorarioBase`, y el cliente ve el costo total antes de elegir). Es la primera pantalla que
  ve un cliente nuevo — decirle que el precio "lo fija el veterinario" contradice el punto central del
  rediseño (ver costo total ANTES de contratar). Corregido a "vas a ver el costo total de cada uno antes de
  contratar". De paso, un comentario en `intake/page.tsx` (no visible para el usuario, pero engañoso para
  quien lea el código) seguía describiendo el flujo viejo de `iniciar()`; actualizado para reflejar que el
  precio se calcula en `asignar()`, no en `iniciar()`.
- **Calificar o reportar un problema sobre un caso que todavía no terminó (situación probable, 2026-09-29)**:
  tanto `CalificacionesService.registrar()` como `DisputasService.abrirDisputaCalidad()` solo validaban
  dueño del caso (y, para calificar, que el veterinario coincida) — ninguno de los dos exigía
  `caso.estado === "CERRADO"`. El frontend solo ofrece esos links para un caso `CERRADO`, pero con la URL de
  un caso propio todavía `ASIGNADO` o `EN_SESION` (el veterinario ya está asignado en ambos estados) se podía
  calificar o abrir una disputa sobre una consulta que ni siquiera terminó — ensuciando el promedio real del
  veterinario y sus puntos-premio, y dejando una disputa de calidad sin `Pago` capturado para reembolsar si
  un admin le hacía lugar. Ahora los dos métodos rechazan explícitamente cualquier caso que no esté
  `CERRADO`.
- **`/registrar-veterinario` — el hueco más grande de toda la revisión de 2026-09-29**: `POST
  /auth/veterinario/registrar` existía en el backend, completo, desde antes — pero ninguna pantalla de
  `apps/web` lo llamaba nunca. Un veterinario podía loguearse (`/ingresar-veterinario`) pero no había ninguna
  forma de crear la cuenta primero: el flujo de alta de colegas, el corazón de la plataforma ("colegas se
  registran" según la descripción del proyecto), no existía de punta a punta. Nueva pantalla con los mismos
  campos que ya pedía el backend (datos personales, matrícula, seguro), confirmación de contraseña en el
  cliente, y el mismo patrón de sesión/redirect que `/ingresar-veterinario` — al terminar, cae directo en
  `/panel-veterinario`, que ya sabe mostrar el onboarding de 3 pantallas para una cuenta nueva
  (`onboardingCompletado: false` por default). Cross-link agregado en `/ingresar-veterinario`
  ("¿Todavía no tenés cuenta? Registrate acá").
  A propósito NO dispara `POST /identidad/iniciar` automáticamente al registrarse: esa llamada necesita
  `TRUORA_API_KEY`/`TRUORA_FLOW_ID` configurados (ver más abajo) y el flujo real de captura de
  documento/selfie de Truora todavía no está confirmado contra su documentación viva (nota `[Probable]` en
  `truora.util.ts`) — mandar al veterinario recién registrado a un botón que hoy tira un error 500 sin
  credenciales reales sería peor que dejarlo en `PENDIENTE_VERIFICACION`, visible como excepción en el panel
  admin. Conectar Truora de verdad también va a necesitar una pantalla nueva para la captura en sí (redirect
  u SDK embebido) — no es solo cargar las credenciales.
- **`/veterinario/cobros` — el segundo hueco más grande de la revisión (2026-09-29)**: `pagos.service.ts` ya
  tenía toda la conexión OAuth de Mercado Pago (Split 1:1) escrita y verificada línea por línea contra la
  documentación oficial, pero ningún botón de `apps/web` la llamaba nunca — y peor, el callback del backend
  ya redirige codificado a `${WEB_APP_URL}/veterinario/cobros?mercadopago=conectado`, así que sin esta
  pantalla ese redirect caía en un 404. Sin esto, NINGÚN veterinario tenía forma de conectar su cuenta y
  cobrar, aunque el resto de la plataforma funcionara perfecto — es el paso que además bloqueaba el próximo
  paso ya anotado más abajo ("cuando haya al menos un veterinario conectado de verdad a Mercado Pago").
  Nueva pantalla con estado (conectado/sin conectar, leído de `GET /veterinarios/mi-cobro`, endpoint nuevo
  y mínimo — nunca expone el `access_token`) y botón que llama a `GET /pagos/mercadopago/oauth/iniciar` y
  redirige el navegador a la URL de autorización real de Mercado Pago. Link agregado desde
  `/panel-veterinario`. Si `MERCADOPAGO_APP_ID`/`CLIENT_SECRET`/`OAUTH_REDIRECT_URI` todavía no están
  cargados en Render, el botón muestra un mensaje propio en vez del `Internal server error` genérico que
  devolvería el backend (esa llamada tira un `Error` crudo sin excepción curada — único lugar de toda la
  app donde no convenía mostrar `e.message` directo).
- **Cerrar sesión en todos los dispositivos (situación probable, 2026-09-29)**: `POST
  /auth/veterinario/revocar-sesiones` existía desde antes (invalida todo JWT emitido hasta ahora, subiendo
  `tokenVersion`), pero ninguna pantalla lo llamaba — un veterinario que perdía el celular o sospechaba que
  alguien más tenía su clave no tenía forma de cerrar sesión en todos lados sin pedírselo a Sergio
  directamente. Botón agregado al final de `/panel-veterinario`, con confirmación inline (no
  `window.confirm`, mismo criterio que el resto de la app) porque la acción invalida también la sesión
  actual — al confirmar, limpia la sesión local y redirige a `/ingresar-veterinario`.
- **Abrir una disputa de identidad manualmente, sin esperar a Truora (situación probable, 2026-09-29)**:
  `POST /disputas/identidad` era ADMIN-only desde antes, pero la única forma real de que se disparara era
  automática, cuando Truora rechazaba una verificación (`identidad.service.ts`). Un admin que recibe una
  denuncia o sospecha externa (sin que Truora haya corrido) no tenía ninguna pantalla para suspender
  cautelarmente a un veterinario. El endpoint pedía `veterinarioId`, pero el panel admin no tiene ningún
  directorio/búsqueda de veterinarios (a propósito — ver arriba, "no hay alta pública de admins" y el
  criterio de "solo excepciones") — el único dato que un admin humano tiene a mano para señalar a alguien es
  su email, así que el endpoint pasó a pedir `veterinarioEmail` (`abrirDisputaIdentidadPorEmail`, con su
  propio `BadRequestException` si no encuentra a nadie con ese email) en vez de exigir un id que nadie tenía
  cómo conseguir. Formulario nuevo en `/admin`, colapsado por default (no es una acción para abrir por
  accidente, dado que suspende de inmediato).
- **Directorio público de veterinarios (situación probable, 2026-09-29)**: los endpoints de calificaciones
  ya exponían el promedio de estrellas por veterinario, pero no existía ninguna forma de listar QUIÉNES son
  los veterinarios habilitados sin conocer sus ids de antemano — sin un listado, ese promedio no tenía desde
  dónde mostrarse. El propio proyecto lo describe como "testimonios estilo google por estrellitas", y esos
  tienen que poder verse ANTES de registrarse, no recién al elegir veterinario en medio de una consulta ya
  iniciada. Nuevo endpoint público `GET /veterinarios/directorio` (sin guard — es contenido de
  marketing/confianza, nunca expone email/teléfono/matrícula) y nueva pantalla pública `/veterinarios`, con
  link agregado desde la home.
- **Caso urgente (bandera roja) sin botón para elegir veterinario en `/panel` (bug encontrado al cerrar el
  barrido completo de las 14 pantallas, 2026-09-29)**: `panel/page.tsx` mostraba la etiqueta "Elegí un
  veterinario para continuar" para el estado `BANDERA_ROJA_MOSTRADA` (igual que para `INTAKE`), pero el botón
  "Elegir veterinario" solo se renderizaba cuando `caso.estado === "INTAKE"` — un caso urgente nunca entra en
  ese `if`. En el flujo normal no se nota (`intake/page.tsx` redirige directo a `/elegir-veterinario/:id` al
  crear el caso, sin pasar por `/panel`), pero un cliente que cierra la pestaña antes de elegir y vuelve
  después a `/panel` para retomarlo se quedaba con el texto pero sin ninguna forma de actuar. Corregido para
  que el botón también se muestre en `BANDERA_ROJA_MOSTRADA`.
- **El cliente nunca pagaba nada — el hueco más grande encontrado en toda la revisión (2026-09-29)**: ni un
  solo lugar de `apps/api` creaba nunca un registro `Pago`. `liquidarSegunCierre()`, el webhook de Mercado
  Pago y el reembolso de disputas de calidad hacían `update` sobre `where: { casoId }` asumiendo una fila que
  ninguna pantalla llegaba a crear — de punta a punta, el flujo cortaba en "elegí veterinario" y ahí quedaba.
  Se escribió el checkout completo:
  - `POST /pagos/:casoId/checkout` (llamado automáticamente por `/elegir-veterinario/:id` apenas se asigna
    veterinario) crea la preferencia de Mercado Pago **con el access_token del veterinario elegido** (no el
    de la plataforma — verificado contra la documentación oficial: en Checkout Pro con split, quien crea la
    preferencia determina el `collector_id`) con `marketplace_fee` = cargo de plataforma, y devuelve
    `init_point` para redirigir el navegador del cliente a pagar. Si falla (ej. el vet todavía no conectó
    Mercado Pago), la pantalla no obliga a volver a elegir veterinario — el caso ya lo tiene asignado, solo
    ofrece reintentar el pago.
  - **Cobro inmediato, no hold** (decisión tomada después de verificar contra la documentación oficial de
    Mercado Pago que Checkout Pro — la preferencia hosteada, el camino que ya usa el OAuth del vet — NO
    soporta captura diferida; eso es una función de la Checkout API/Orders API, que exige tokenizar la
    tarjeta directamente y entra en alcance PCI). El schema original de `Pago` asumía un hold
    (`AUTORIZADO` → `CAPTURADO`); se ajustó: ahora se cobra el total en el momento de elegir veterinario, y
    lo que corresponda se reembolsa después según cómo cierre el caso.
  - Webhook de Mercado Pago reescrito de punta a punta: el stub anterior esperaba un body
    `{casoId, mercadoPagoPaymentId}` que Mercado Pago **nunca manda** — el payload real es
    `{type, data: {id}}`, y hay que pedirle el detalle del pago a la API (`GET /v1/payments/:id`) para recién
    ahí conseguir el `external_reference` (el `casoId`). La verificación de firma (`x-signature`,
    HMAC-SHA256) ya estaba bien escrita desde antes; lo que le faltaba era leer el payload correcto.
  - `liquidarSegunCierre()` **tampoco lo llamaba nadie nunca** — se conecta automáticamente al final de
    `casos.service.cerrar()`, así el veterinario no tiene que acordarse de un paso manual aparte. Si cerrar y
    liquidar el pago del mismo caso, en la misma llamada, falla la parte del pago (ej. el webhook de Mercado
    Pago todavía no confirmó, o su API no responde), el cierre del caso NO se bloquea — queda anotado en el
    log y el pago sin liquidar, pero ya no es un callejón sin salida (ver "Reconciliación manual", debajo).
  - **Reembolso de `NO_COMPLETADO` (decisión explícita de Sergio, 2026-09-29) — corregido 2026-09-29**: el
    tutor recupera todo MENOS `CARGO_NO_COMPLETADO` (`packages/types`, hoy $2500, ajustable cada 3 meses
    según disponga la plataforma), que se lo queda la plataforma. El primer diseño implementado hacía DOS
    llamadas de reembolso independientes (una contra la cuenta del vet, otra contra la de la plataforma) para
    intentar un resultado asimétrico — se verificó después, contra la documentación oficial de Mercado Pago
    ([Split de Pagos 1:1](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)),
    que **un reembolso sobre un pago con split siempre se reparte proporcional entre vendedor y marketplace**
    — no existe forma de pedirle a la API "sacale todo a uno, una porción distinta al otro" — así que ese
    diseño no lograba lo que pedía el contrato. Ahora se automatiza **una sola llamada** de reembolso parcial
    de `(total − CARGO_NO_COMPLETADO)` al tutor — eso sí es seguro, porque el tutor termina con el monto
    exacto que se le prometió. Lo que ese reembolso deja imperfecto es el reparto *interno* de los
    `CARGO_NO_COMPLETADO` retenidos entre vet y plataforma (proporcional, no 100% a la plataforma como pide
    el contrato) — esa diferencia se calcula y se anota (`Pago.montoPendienteAccionManual` /
    `notaAccionManual`) para que un admin la corrija a mano con el vet, en vez de intentar forzarla con una
    segunda llamada no verificable. El mismo problema de fondo hace que **el reembolso de disputas de
    calidad** (Sección 10 — "solo el cargo de plataforma, nunca el honorario del vet") ya no automatice
    ninguna llamada a la API: cualquier monto que se le pida reembolsar a Mercado Pago sobre este pago le
    descuenta proporcionalmente también al vet, violando esa regla — así que ahora queda 100% anotado para
    resolución manual.
  - **[Probable] — sin verificar contra un pago real**: dos puntos de esta integración siguen sin poder
    confirmarse contra la documentación oficial (no hay credenciales de Mercado Pago cargadas en este
    entorno, y no hay forma de probar contra su sandbox desde acá): (1) qué access_token corresponde usar
    para leer de vuelta el detalle de un pago split desde el webhook — se usa el de la plataforma
    (`MERCADOPAGO_ACCESS_TOKEN`), asumiendo que la app marketplace tiene visibilidad sobre los pagos de sus
    vendedores conectados; y (2) que el reembolso parcial automatizado (arriba) se pueda pedir con el
    access_token del VENDEDOR, colector del pago — si Mercado Pago lo rechaza, probablemente haga falta el
    token de la plataforma en su lugar. **Antes de ir a producción con plata real, esto se tiene que probar
    contra el sandbox real de Mercado Pago** — ver `apps/api/src/common/mercadopago-checkout.util.ts` para el
    detalle completo.
  - **Reconciliación manual (2026-09-29)**: si `liquidarSegunCierre()` falla al cerrar un caso, el pago queda
    colgado en `AUTORIZADO`. `PagosService.reconciliarPagosPendientes()` (`POST /pagos/reconciliar`, ADMIN)
    reintenta la liquidación de todo caso `CERRADO` con un pago sin liquidar, y hay un botón "Reconciliar
    pagos pendientes" en `/admin` que lo dispara. Se descartó a propósito un cron in-process
    (`@nestjs/schedule`): el plan free de Render suspende el web service tras inactividad, y un scheduler
    in-process no corre mientras está dormido ni tiene cola de alcance al despertar — daría una falsa
    sensación de cobertura. Si el volumen lo justifica, Sergio puede engancharle un pinger externo (un
    cron-job.io, un GitHub Action con `schedule`) al mismo endpoint — eso sí sería confiable, porque vive
    afuera de Render. `/admin` también lista los pagos con `montoPendienteAccionManual` pendiente (los dos
    casos de arriba), con el detalle de cuánto y por qué, para que se resuelvan a mano.
  - **Hallazgo de paso, mismo tipo de bug, fuera de alcance**: `revisarVencimientos()` en
    `veterinarios.service.ts` tiene un comentario que dice "corre periódicamente (cron)", pero no hay
    `@nestjs/schedule`, ningún `@Cron`, ni ningún endpoint o llamada que lo dispare — las suspensiones
    automáticas por matrícula/seguro vencidos no ocurren en la práctica. No se tocó en este trabajo (no era
    parte de lo pedido), queda anotado para cuando se lo priorice.
- **Sin pantalla dedicada de "gracias por tu pago"**: los `back_urls` (éxito/pendiente/fallo) de la
  preferencia de Mercado Pago apuntan los tres a `/panel` por ahora — el cliente vuelve ahí después de pagar
  y ve el estado actualizado del caso una vez que el webhook procesó (puede haber unos segundos de desfase
  entre el redirect y que `/panel` ya refleje el pago). Una pantalla propia por resultado es una mejora, no
  un bloqueante.
- **Proveedor de video**: sigue pendiente de la prueba de carga de Sergio (Twilio/Daily.co/Zoom Video SDK).
- **`GET /veterinarios/disponibles` (búsqueda por proximidad) sigue sin consumidor**: quedó explícitamente
  a propósito (Sergio, 2026-09-29) como opción futura para una consulta a domicilio separada de la
  plataforma online — no se toca ni se borra, es un feature distinto al matching por elección que sí se
  conectó esta vuelta.
- **Refresh token**: el JWT actual no tiene renovación automática — vence a las 12 h y hay que loguearse de
  nuevo (aceptable para el MVP). La revocación anticipada (logout forzado) sí está resuelta, ver arriba.
- **Onboarding de producto, cliente y veterinario ya resueltos** — ver arriba, ambos lados de `apps/web`. Sin
  Postgres corriendo en este entorno no se pudo probar ninguno de los dos flujos end-to-end contra una base
  real — sí se verificó `tsc --noEmit`, `nest build` (api) y `next build` (web) limpios en cada cambio.
- **`apps/web` y `apps/api` ya están deployados en Render** (ver "Deploy a Render" más arriba) — el link
  desde la landing de Wix hacia `/ingresar-veterinario` ya tiene una URL real a la que apuntar
  (`https://vet-teletriage-web.onrender.com/ingresar-veterinario`) y quedó agregado en el footer del HTML de
  la landing; falta que Sergio vuelva a subir ese HTML actualizado al sitio de Wix para que salga a
  producción.
- **Precio base y recargo de urgencia con valores placeholder**: `HONORARIO_BASE` y
  `RECARGO_URGENCIA_PORCENTAJE` en `packages/types/src/index.ts` arrancan con los mismos números que
  `CARGO_PLATAFORMA` para que el cálculo funcione de punta a punta — son un punto de partida, no precio de
  mercado real. Sergio los tiene que ajustar antes de producción (están los dos juntos, en un solo lugar).
- **Sin estilos globales hasta ahora**: `apps/web/app/globals.css` es la primera vez que la paleta de marca
  (terracota/oliva/crema/rosa/marrón) y las tipografías (Big Shoulders Display, Bricolage Grotesque, Nunito
  Sans) entran al código — antes la app no tenía ningún estilo propio aplicado. La landing pública en sí va
  a vivir en Wix (decisión de Sergio), así que este CSS es solo para las pantallas *dentro* del producto
  (login, panel, onboarding), no para el sitio de marketing.
- **Logotipo completo y aviso legal en todas las pantallas (Sergio, 2026-09-29)**: `components/Logo.tsx`
  (ícono + wordmark, el mismo SVG que ya está en vivo en la landing de Wix) y `components/LegalFooter.tsx`
  ahora aparecen, centrados, en las 10 pantallas de `apps/web` (home, ingresar cliente/veterinario/admin,
  intake, elegir-veterinario, panel cliente/veterinario/admin, ambos onboardings). El aviso usa © (derecho
  de autor, automático en Argentina por el Convenio de Berna) y no ® ni "marca registrada" — Sergio confirmó
  que el registro de marca ante el INPI todavía no se inició, lo va a hacer recién cuando toda la
  plataforma esté terminada y probada; ese día el texto pasa a ® en la misma sesión que se confirme el
  registro otorgado.

- **Credenciales reales de Truora sin configurar, y falta la pantalla de captura**: la habilitación
  automática (ver arriba) depende de que Truora esté conectado de verdad en producción — sin esas
  credenciales, todo veterinario nuevo cae en `PENDIENTE_VERIFICACION` y pasa por el panel admin como si
  fuera la excepción, cuando en realidad sería el camino normal. No es un bug del código nuevo: es que el
  circuito automático todavía no tiene con qué correr. Además, ni con credenciales reales hay hoy una
  pantalla en `apps/web` que dispare `POST /identidad/iniciar` y lleve al veterinario a subir
  documento/selfie (redirect u SDK embebido de Truora, según confirme su documentación viva) — falta
  construirla el día que se conecten las credenciales.
- **No hay alta pública de admins, a propósito**: la primera cuenta de staff (y cualquier otra) se crea con
  `POST /auth/admin/registrar` detrás de `ADMIN_API_KEY` — no hay ninguna pantalla para eso ni la va a haber,
  es deliberado (ver sección de disputas arriba).
- **Sin recupero de contraseña para veterinarios (encontrado 2026-09-29, Sergio confirmó: al final)**: un
  veterinario que se olvida la contraseña queda trabado del todo — no hay self-service ni forma de que un
  admin se la resetee desde el panel. A diferencia de otras situaciones probables arregladas esta vuelta,
  esto no es un fix puntual: necesita mandar un email (WhatsApp no aplica, el login del veterinario es por
  contraseña, no OTP) y hoy la plataforma no tiene ningún proveedor de email conectado — mismo tipo de
  bloqueo que Truora o Mercado Pago. Falta que Sergio elija proveedor (Resend, SendGrid, u otro) y cargue la
  API key.
- **Todavía sin proveedor de video real conectado**: la interfaz ya está (ver arriba), pero
  `PlaceholderVideoProvider` devuelve `null` siempre — hasta que Sergio corra la prueba de carga y elija
  Twilio / Daily.co / Zoom Video SDK, `salaVideoUrl` va a seguir vacío y las pantallas van a seguir mostrando
  "coordiná por WhatsApp". Conectar el proveedor real es escribir una clase nueva que implemente
  `ProveedorVideo` y cambiar un `useClass` en `video.module.ts` — no tocar `casos.service.ts` ni ninguna
  pantalla.

## Próximo paso sugerido

Con los tres flujos (paciente, veterinario, admin) conectados de punta a punta — matching por elección de
precio+rating, calificación y reporte de problemas ya alimentando el sistema, habilitación automática de
veterinarios, el caso cerrándose de verdad (con o sin sala de video real), y ahora también el alta de
veterinarios (`/registrar-veterinario`) y la conexión de cobros (`/veterinario/cobros`) — los dos huecos más
grandes que aparecieron en la revisión pantalla por pantalla — lo que queda es menos código y más
decisiones/infraestructura: elegir el **proveedor de video** (la interfaz ya está armada y lista para
recibirlo — ver arriba — solo falta la prueba de carga de Sergio y escribir una clase que implemente
`ProveedorVideo`), que Sergio reemplace los valores placeholder de
`HONORARIO_BASE`/`RECARGO_URGENCIA_PORCENTAJE` por precio de mercado real, cargue credenciales reales de
Truora para que la habilitación automática funcione de punta a punta (hoy el código está listo pero sin
credenciales todo cae en la cola manual — y además va a hacer falta construir la pantalla de captura de
documento/selfie que hoy tampoco existe), que re-suba `landing-full.html` a Wix para que el link a
`/ingresar-veterinario` salga a producción, y que cargue `MERCADOPAGO_APP_ID`/`CLIENT_SECRET`/
`OAUTH_REDIRECT_URI` en Render — recién ahí un veterinario real puede conectar su cuenta desde
`/veterinario/cobros` (la pantalla ya está lista para recibirlo) y se puede probar el checkout con split
contra la API real. También queda para el final elegir un
proveedor de email y cargar su API key, para poder armar el recupero de contraseña de veterinarios que hoy
no existe (Sergio, 2026-09-29: confirmado que va al final, junto con el resto de las credenciales). El
registro de marca ante el INPI queda para el final, cuando toda la plataforma esté terminada y probada
(decisión explícita de Sergio, 2026-09-29).
