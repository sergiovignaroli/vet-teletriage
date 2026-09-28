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
cp .env.example .env   # completar con las credenciales reales de cada proveedor
cd apps/api && npx prisma migrate dev --name init
npm run dev             # desde la raíz, levanta api y web en paralelo (turbo)
```

## Lo que ya está implementado (compilado y buildeado, no solo escrito)

- **Schema de Prisma completo**: Veterinario, Cliente, Caso, IntakeFormulario, CierreCaso,
  VerificacionIdentidad, Pago, DisputaIdentidad, DisputaCalidad, Calificacion, PuntoPremio.
- **Módulo `veterinarios`**: búsqueda por proximidad y la suspensión automática (no disciplinaria) por
  vencimiento de matrícula o seguro — Sección 2 del contrato.
- **Módulo `casos`**: creación de caso con intake de dos capas, cálculo del cargo de plataforma según
  franja horaria en el momento real de inicio de sesión (no el de la reserva) — Sección 4 — y cierre de
  caso con el checklist estructurado — Sección 9.
- **Módulo `pagos`**: la regla de reembolso de la Sección 8, codificada — solo `NO_COMPLETADO` habilita
  reembolso, y ese reembolso alcanza únicamente al cargo de plataforma, nunca al honorario. Incluye un
  stub del webhook de Mercado Pago (falta la verificación de firma antes de producción, marcada con TODO).
- **Formulario de intake en `apps/web/app/intake`**: las 8 banderas rojas de la Sección 9, con el aviso de
  emergencia calculado en el cliente en tiempo real y sin bloquear el flujo — tal como lo describe el
  contrato.

## Lo que falta (a propósito, no por error)

- **Módulos `disputas` y `calificaciones`**: los modelos de Prisma ya existen (`DisputaIdentidad`,
  `DisputaCalidad`, `Calificacion`, `PuntoPremio`); falta escribir el controller/service siguiendo el mismo
  patrón que `veterinarios` y `casos`.
- **Integraciones reales** de Mercado Pago (OAuth por veterinario + captura/reembolso vía API, no solo el
  webhook), Truora, y el proveedor de video que salga ganador de la prueba de carga.
- **Autenticación** (todavía no hay login ni JWT — los endpoints están abiertos, no usar así en producción).
- **Verificación de firma del webhook de Mercado Pago** (marcado con TODO en `pagos.controller.ts`).

## Próximo paso sugerido

Elegir el proveedor de video (punto pendiente del documento de proveedores) antes de construir la pantalla
de videollamada — es la única pieza del frontend que cambia de forma significativa según cuál se elija.
