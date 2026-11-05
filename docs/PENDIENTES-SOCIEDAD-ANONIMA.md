# Pendiente antes de salir: pasar la plataforma a una Sociedad Anónima

Decisión de Sergio (2026-11-03): hoy la plataforma figura con sus datos de AFIP
(persona humana). Antes del lanzamiento se constituye una **sociedad anónima** y
la plataforma pasa a su nombre. Este archivo lista todo lo que hay que cambiar
cuando eso ocurra. **Hasta entonces no se cambia nada.**

## 1. Datos que hay que reemplazar (un solo lugar en el código)

`apps/web/lib/datos-legales.ts`

| Constante | Hoy | Cambiar por |
| --- | --- | --- |
| `TITULAR` | Sergio Luis Vignaroli | Razón social completa de la S.A. |
| `CUIT` | 20-31116126-2 | CUIT de la S.A. |
| `DOMICILIO_COMERCIAL` | Montevideo 2620, Rosario, Santa Fe, Argentina | Domicilio legal/comercial de la S.A. |
| `TELEFONO_VISIBLE` / `TELEFONO_ENLACE` | +54 341 334-0156 | Solo si cambia el teléfono de contacto |

El correo de contacto no está en el código: se carga desde el panel de
administración (`GET/PATCH /configuracion` → `emailContacto`, más las redes).

## 2. Pantallas que leen esos datos (se actualizan solas, pero revisar la redacción)

- **Datos legales** (`/datos-legales`): "Titular (razón social)", CUIT, domicilio.
- **Pie de página** (`components/LegalFooter.tsx`): leyenda "… marcas registradas de {TITULAR}".
- **Convenio de adhesión** (`/convenio-veterinario`): encabezado "Entre {TITULAR}, CUIT …". Para una S.A. suele
  agregarse "representada por [apoderado/presidente]". Revisar la cláusula 15 (ley aplicable y jurisdicción).
- **Política de Privacidad** (`/privacidad`): responsable del tratamiento de datos.
- **Términos y Condiciones** (`/terminos`): no nombran al titular, pero hay que revisarlos con el abogado.

Si cambian los textos legales, subir las versiones en `packages/types` (`VERSION_TERMINOS`,
`VERSION_CONVENIO_VETERINARIO`, `VERSION_AVISO_PRECIOS`) para que el sistema vuelva a pedir la aceptación.

## 3. Cosas fuera del código que dependen del titular

- **Marca "Videollamada Animal" y logo (INPI):** al 2026-11-05 **todavía no está registrada** (se presenta en
  una o dos semanas), por eso la plataforma muestra ™. La titularidad hoy sería de la persona humana. Al
  constituir la S.A. hay que **ceder la marca (o su solicitud) a la sociedad** e inscribir la cesión. El
  símbolo ® solo puede usarse con la marca ya concedida: ahí se pone `MARCA_REGISTRADA = true` en
  `packages/types`.
- **Cuentas de cobro de la plataforma:** Mercado Pago (marketplace/OAuth) y PayPal deben quedar a nombre de la
  S.A. (CUIT de la sociedad). Esto cambia las credenciales en Render.
- **AFIP / ARCA:** alta de la S.A., punto de venta y facturación del cargo de servicio.
- **Proveedores:** cuentas de Agora, Truora, WhatsApp Cloud API, correo, dominio: titular y facturación.
- **Seguros, contratos y registros** que hoy estén a nombre personal.
- **Consultar con el abogado/contador:** el tratamiento impositivo de los cobros a veterinarios, el
  convenio vigente y si los veterinarios que ya aceptaron el convenio deben re-aceptarlo.
