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

export function hayBanderaRoja(banderas: BanderasRojasIntake): boolean {
  return Object.values(banderas).some(Boolean);
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
  // null hasta que un veterinario toma el caso — lo declara él, libremente,
  // recién en PATCH /casos/:id/iniciar (ver comentario en schema.prisma).
  honorarioDeclarado: number | null;
  cargoPlataforma: number;
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

// Lo que devuelven GET /casos/disponibles y GET /casos/mios — un CasoResumen
// con el intake adentro, para que el veterinario decida si lo toma sin tener
// que abrir el caso primero. creadoEl llega como string ISO (JSON no tiene
// tipo Date), no como Date.
export interface CasoParaVeterinario extends CasoResumen {
  creadoEl: string;
  intake: IntakeResumen;
  cierre?: { clasificacion: ClasificacionCierre; notas?: string | null } | null;
}
