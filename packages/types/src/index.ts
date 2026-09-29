// Tipos compartidos entre apps/api y apps/web.
// Reflejan 1 a 1 los enums de apps/api/prisma/schema.prisma — si cambia el
// schema, este archivo se actualiza en el mismo commit.

export type FranjaHoraria = "DIURNA" | "NOCTURNA";

// Sección 4 del contrato: cargos fijos por franja horaria.
export const CARGO_PLATAFORMA: Record<FranjaHoraria, number> = {
  DIURNA: 3500, // 08:30–20:00
  NOCTURNA: 4000, // 20:01–08:29
};

export function franjaHorariaDe(fecha: Date): FranjaHoraria {
  const minutos = fecha.getHours() * 60 + fecha.getMinutes();
  const inicioDiurna = 8 * 60 + 30; // 08:30
  const finDiurna = 20 * 60; // 20:00
  return minutos >= inicioDiurna && minutos <= finDiurna ? "DIURNA" : "NOCTURNA";
}

// -----------------------------------------------------------------------
// Precio (decisión de Sergio, 2026-09-29): el cliente tiene que ver el
// costo total ANTES de contratar y poder elegir veterinario — el honorario
// ya no lo declara el veterinario libremente. La plataforma calcula un
// honorarioBase por franja horaria + urgencia (banderas rojas del intake,
// señal que ya existe, no hace falta pedir nada nuevo); cada veterinario
// conectado aplica su propio margenPorcentaje sobre esa base.
//
// Precio de mercado real, definido por Sergio el 2026-09-29 (reemplaza a
// los valores placeholder $3.500/$4.000 con los que se armó el cálculo).
export const HONORARIO_BASE: Record<FranjaHoraria, number> = {
  DIURNA: 30000,
  NOCTURNA: 40000,
};

// % que se suma al honorario base cuando el intake disparó alguna bandera
// roja (más urgencia). Definido por Sergio el 2026-09-29 (reemplaza el 20%
// placeholder).
export const RECARGO_URGENCIA_PORCENTAJE = 5;

// Rango dentro del cual cada veterinario puede mover su honorario final
// respecto del honorarioBase (Sergio, 2026-09-29: por porcentaje, igual
// para todos — no por monto fijo ni por tope individual por veterinario).
export const MARGEN_PORCENTAJE_MIN = -20;
export const MARGEN_PORCENTAJE_MAX = 20;

export function honorarioBaseDe(franjaHoraria: FranjaHoraria, hayUrgencia: boolean): number {
  const base = HONORARIO_BASE[franjaHoraria];
  return hayUrgencia ? Math.round(base * (1 + RECARGO_URGENCIA_PORCENTAJE / 100)) : base;
}

export function honorarioFinalDe(honorarioBase: number, margenPorcentaje: number): number {
  return Math.round(honorarioBase * (1 + margenPorcentaje / 100));
}

// Penalización de NO_COMPLETADO (decisión de Sergio, 2026-09-29): si el
// veterinario cierra un caso como "no se pudo completar la consulta", se le
// reembolsa TODO al tutor — incluido el honorario que ya estaba depositado
// en la cuenta del veterinario (se le retira vía refund) — MENOS este monto
// fijo, que se lo queda la plataforma. No es un % del cargo de plataforma:
// es un número fijo en pesos, ajustable "cada 3 meses de acuerdo lo
// disponga la plataforma" (palabras de Sergio) — cuando lo cambie, un solo
// lugar para tocar.
export const CARGO_NO_COMPLETADO = 2500;

export type ClasificacionCierre =
  | "RESUELTO_POR_ORIENTACION"
  | "DERIVADO_A_EMERGENCIA"
  | "NO_COMPLETADO";

// Sección 8 del contrato: solo estas dos clasificaciones cierran el caso
// como "servicio cumplido" (honorario completo, sin derecho a reembolso).
export const CIERRES_SIN_REEMBOLSO: ClasificacionCierre[] = [
  "RESUELTO_POR_ORIENTACION",
  "DERIVADO_A_EMERGENCIA",
];

// Sección 11/12 del contrato — piso de calidad y puntos-premio (decisión de
// negocio de Sergio, 2026-09-28): la escala de calificación es de 1 a 5
// estrellas; 3 es el piso — por debajo, el veterinario queda fuera del gate
// de elegibilidad del matching (Fase 2, todavía no implementado: en la Fase
// 1 el dispatch es manual). Los puntos-premio solo se otorgan con 5
// estrellas, no con 4 — el "casi perfecto" no suma puntos, la calificación
// perfecta sí.
export const PISO_CALIDAD_ESTRELLAS = 3;
export const ESTRELLAS_PARA_PUNTO_PREMIO = 5;
export const PUNTOS_POR_CALIFICACION_PERFECTA = 10;

export interface BanderasRojasIntake {
  dificultadRespiratoria: boolean;
  inconsciente: boolean;
  sangradoActivo: boolean;
  sospechaIngestaToxico: boolean;
  convulsionEnCurso: boolean;
  noPuedeParseCaminar: boolean;
  distensionAbdominal: boolean;
  traumatismoMayor: boolean;
}

// OJO acá: recorrer con Object.values() asume que el objeto recibido tiene
// SOLO estos 8 campos booleanos. `IntakeResumen` (más abajo) extiende
// BanderasRojasIntake agregando motivoConsulta/especie/etc — campos de
// texto no vacíos, que Object.values().some(Boolean) cuenta como "true" sin
// que haya ninguna bandera roja real. Bug real que hizo que el panel del
// veterinario mostrara "Posible emergencia" en TODOS los casos, encontrado
// recién al verificar la pantalla con una captura (2026-09-29) — antes de
// este fix, nada distinguía un caso urgente de uno que no lo era. Por eso
// se listan las claves explícitas en vez de confiar en Object.values.
const CLAVES_BANDERAS_ROJAS: Array<keyof BanderasRojasIntake> = [
  "dificultadRespiratoria",
  "inconsciente",
  "sangradoActivo",
  "sospechaIngestaToxico",
  "convulsionEnCurso",
  "noPuedeParseCaminar",
  "distensionAbdominal",
  "traumatismoMayor",
];

export function hayBanderaRoja(banderas: BanderasRojasIntake): boolean {
  return CLAVES_BANDERAS_ROJAS.some((clave) => banderas[clave]);
}

export interface VeterinarioResumen {
  id: string;
  nombre: string;
  apellido: string;
  estado:
    | "PENDIENTE_VERIFICACION"
    | "HABILITADO"
    | "SUSPENDIDO_MATRICULA_VENCIDA"
    | "SUSPENDIDO_SEGURO_VENCIDO"
    | "SUSPENDIDO_DISPUTA_IDENTIDAD"
    | "SUSPENDIDO_INCUMPLIMIENTO"
    | "DESVINCULADO";
  disponible: boolean;
  calificacionPromedio?: number;
  distanciaKm?: number;
}

export interface CasoResumen {
  id: string;
  estado:
    | "INTAKE"
    | "BANDERA_ROJA_MOSTRADA"
    | "ASIGNADO"
    | "EN_SESION"
    | "CERRADO"
    | "CANCELADO_FALLA_PLATAFORMA";
  franjaHoraria: FranjaHoraria;
  // Precio de referencia calculado por la plataforma al crear el caso (ver
  // honorarioBaseDe) — la base sobre la que cada veterinario aplica su
  // margen en la pantalla de "elegí veterinario".
  honorarioBase: number | null;
  // Se completa recién cuando el cliente ELIGE veterinario (PATCH
  // /casos/:id/asignar) — honorarioBase × margen del elegido, congelado
  // desde ese momento.
  honorarioDeclarado: number | null;
  cargoPlataforma: number;
  // Se completa al pasar a EN_SESION (ver CasosService.iniciarSesion) —
  // null hasta entonces, y también null si todavía no hay un proveedor de
  // video real conectado (Sergio, 2026-09-29: interfaz agnóstica lista,
  // proveedor pendiente de una prueba de carga). Nunca asumir que null acá
  // significa "sesión no arrancó" sin mirar `estado` primero.
  salaVideoUrl: string | null;
}

// Lo que devuelve GET /casos/:id/para-elegir — un veterinario conectado y
// habilitado, con el precio YA calculado para este caso puntual (para que
// el cliente compare costo total, no un margen abstracto) y su rating.
export interface VeterinarioParaElegir {
  id: string;
  nombre: string;
  apellido: string;
  honorarioFinal: number;
  costoTotal: number; // honorarioFinal + cargoPlataforma del caso
  ratingPromedio: number | null; // null si todavía no tiene calificaciones
  cantidadCalificaciones: number;
}

// Contexto clínico que ve el veterinario al mirar un caso — Capa 2 del
// intake (Sección 9 del contrato). Las banderas rojas de Capa 1 están en
// BanderasRojasIntake, arriba.
export interface IntakeResumen extends BanderasRojasIntake {
  especie: string;
  raza?: string;
  edadAproximada?: string;
  pesoAproximadoKg?: number;
  motivoConsulta: string;
  tiempoEvolucion?: string;
  medicacionActual?: string;
  antecedentes?: string;
}

// Lo que devuelve GET /casos/mios (veterinario) — un CasoResumen con el
// intake adentro, para que el veterinario decida/revise sin tener que abrir
// el caso primero. creadoEl llega como string ISO (JSON no tiene tipo
// Date), no como Date.
export interface CasoParaVeterinario extends CasoResumen {
  creadoEl: string;
  intake: IntakeResumen;
  cierre?: { clasificacion: ClasificacionCierre; notas?: string | null } | null;
}

// Espejo (solo los valores que puede ver un cliente, nunca un Decimal de
// Prisma) del enum EstadoPago de apps/api/prisma/schema.prisma — ver ese
// archivo para el detalle de qué significa cada uno.
export type EstadoPagoCliente =
  | "PENDIENTE"
  | "AUTORIZADO"
  | "CAPTURADO"
  | "REEMBOLSADO_TOTAL"
  | "REEMBOLSADO_PARCIAL"
  | "CANCELADO";

// Lo que devuelve GET /casos/mios-cliente — el historial del cliente, con
// el veterinario asignado (si ya eligió uno), si ese caso ya fue
// calificado, y si tiene una disputa de calidad abierta/resuelta — para
// que la pantalla sepa cuándo mostrar cada CTA sin tener que pegarle a
// /calificaciones ni a /disputas aparte por cada caso.
export interface CasoParaCliente extends CasoResumen {
  creadoEl: string;
  intake: IntakeResumen;
  veterinario: { id: string; nombre: string; apellido: string } | null;
  // null hasta que el cliente arranca el checkout (crearCheckout) — ver
  // /pago/[estado], la pantalla de resultado post-Mercado Pago, que es la
  // que más depende de esto para no confiar ciegamente en el back_url por
  // el que Mercado Pago redirigió (ese solo refleja lo que el navegador
  // del cliente vio, no necesariamente lo que el webhook ya confirmó).
  pago: { estado: EstadoPagoCliente; montoTotal: number } | null;
  yaCalificado: boolean;
  disputaCalidad: { id: string; estado: "ABIERTA" | "EN_REVISION" | "RESUELTA"; resolucion: string | null } | null;
}
