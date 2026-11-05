// Datos del titular de la plataforma — una sola fuente para las pantallas que
// los muestran (Datos legales y Contacto). Cargados por Sergio el 2026-11-02.
//
// OJO: acá NO va el domicilio real (particular) del titular; solo el comercial.
// El correo de contacto NO está acá: se carga desde el panel de administración
// (/configuracion → emailContacto), igual que las redes sociales, porque
// Sergio todavía está creando la casilla nueva de la plataforma.
//
// ⚠ PENDIENTE ANTES DE SALIR A PRODUCCIÓN (Sergio, 2026-11-03): hoy TITULAR,
// CUIT y DOMICILIO_COMERCIAL son los datos personales que figuran en AFIP.
// La idea es constituir una SOCIEDAD ANÓNIMA antes del lanzamiento y pasar la
// plataforma a su nombre. Cuando esté constituida, cambiar SOLO estas tres
// constantes (razón social, CUIT, domicilio): Términos, Privacidad, Convenio,
// Datos legales, Contacto y el pie de página las leen de acá. Lista completa
// de lo que hay que revisar a mano: docs/PENDIENTES-SOCIEDAD-ANONIMA.md.
export const TITULAR = "Sergio Luis Vignaroli";
export const NOMBRE_COMERCIAL = "Videollamada Animal";
export const CUIT = "20-31116126-2";
export const DOMICILIO_COMERCIAL = "Montevideo 2620, Rosario, Santa Fe, Argentina";
export const TELEFONO_VISIBLE = "+54 341 334-0156";
export const TELEFONO_ENLACE = "tel:+543413340156";

// La marca ("Videollamada Animal" y su logo, hoy con ™ porque aún no está
// registrada): ver MARCA_REGISTRADA en packages/types.
export { MARCA_REGISTRADA, SIMBOLO_MARCA, NOMBRE_CON_MARCA } from "@vet-teletriage/types";
