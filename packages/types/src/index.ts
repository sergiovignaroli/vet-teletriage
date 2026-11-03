// Tipos compartidos entre apps/api y apps/web.
// Reflejan 1 a 1 los enums de apps/api/prisma/schema.prisma — si cambia el
// schema, este archivo se actualiza en el mismo commit.

export type FranjaHoraria = "DIURNA" | "NOCTURNA";

export function franjaHorariaDe(fecha: Date): FranjaHoraria {
  const minutos = fecha.getHours() * 60 + fecha.getMinutes();
  const inicioDiurna = 8 * 60 + 30; // 08:30
  const finDiurna = 20 * 60; // 20:00
  return minutos >= inicioDiurna && minutos <= finDiurna ? "DIURNA" : "NOCTURNA";
}

// -----------------------------------------------------------------------
// Precio (Sergio, 2026-09-30): TODOS los valores de acá abajo dejaron de
// ser constantes fijas en el código — viven en la tabla
// ConfiguracionPlataforma (fila única, id "global") y se editan desde el
// panel de administrador (ver apps/api/src/modules/configuracion y
// apps/web/app/admin/precios). Este archivo solo se queda con el TIPO que
// describe esa fila y las funciones puras de cálculo, que ahora reciben
// esos valores como parámetro en vez de leerlos de una constante del
// módulo — así packages/types no tiene que saber de dónde salen.
//
// Quedan afuera de este panel (siguen siendo constantes fijas en el
// código, Sergio no las pidió editables): MARGEN_PORCENTAJE_MIN/MAX y
// CARGO_NO_COMPLETADO, más abajo.
export interface ConfiguracionPlataforma {
  cargoPlataformaDiurna: number;
  cargoPlataformaNocturna: number;
  // Honorario del veterinario (Sergio, 2026-09-30: reemplaza al esquema
  // anterior de franja horaria + recargo %) — dos valores fijos nomás,
  // normal y urgencia, sin importar la hora del día. La franja horaria
  // sigue existiendo (arriba) pero ya solo afecta el cargo de plataforma.
  honorarioBaseNormal: number;
  honorarioBaseUrgencia: number;
  // Precio fijo para PayPal, en USD (Sergio, 2026-09-30) — PayPal no
  // soporta ARS (verificado contra developer.paypal.com/reports/reference/
  // supported-currencies), así que esto NO es una conversión del precio de
  // arriba, es un precio propio e independiente. Sin margen individual por
  // veterinario ni premio por volumen — ver honorarioPaypalDe más abajo.
  honorarioPaypalNormalUsd: number;
  honorarioPaypalUrgenciaUsd: number;
  cargoPlataformaPaypalUsd: number;
  // Comisión de la plataforma, en % del honorario del veterinario (Sergio,
  // 2026-11-03). Los cargoPlataformaDiurna/Nocturna de arriba pasan a ser el
  // mínimo de esa comisión.
  porcentajePlataforma: number;
  // Premio por volumen: a partir de superar `umbralSesionesVeterano`
  // sesiones cerradas (Veterinario.sesionesCompletadas), se suma
  // `bonusVeteranoPorcentaje` arriba del margenPorcentaje propio del
  // veterinario — lo paga el cliente, automático.
  umbralSesionesVeterano: number;
  bonusVeteranoPorcentaje: number;
  emailContacto: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
}

// Rango dentro del cual cada veterinario puede mover su honorario final
// respecto del honorarioBase (Sergio, 2026-09-29: por porcentaje, igual
// para todos — no por monto fijo ni por tope individual por veterinario).
// No es parte de ConfiguracionPlataforma — Sergio no pidió que esto sea
// editable desde el panel, solo los precios y el premio por volumen.
export const MARGEN_PORCENTAJE_MIN = -20;
export const MARGEN_PORCENTAJE_MAX = 20;

export function honorarioBaseDe(config: Pick<ConfiguracionPlataforma, "honorarioBaseNormal" | "honorarioBaseUrgencia">, hayUrgencia: boolean): number {
  return hayUrgencia ? config.honorarioBaseUrgencia : config.honorarioBaseNormal;
}

// Análogo a honorarioBaseDe, para el precio fijo en USD de PayPal — sin
// margen individual del veterinario ni premio por volumen (Sergio,
// 2026-09-30: simplificación deliberada, ver comentario en
// PagosService.crearCheckout).
export function honorarioPaypalDe(config: Pick<ConfiguracionPlataforma, "honorarioPaypalNormalUsd" | "honorarioPaypalUrgenciaUsd">, hayUrgencia: boolean): number {
  return hayUrgencia ? config.honorarioPaypalUrgenciaUsd : config.honorarioPaypalNormalUsd;
}

// bonusVeteranoPorcentaje: 0 si el veterinario no llegó a
// umbralSesionesVeterano todavía — quien llama decide eso (ver
// CasosService), acá solo se suma lo que llega.
export function honorarioFinalDe(honorarioBase: number, margenPorcentaje: number, bonusVeteranoPorcentaje = 0): number {
  return Math.round(honorarioBase * (1 + (margenPorcentaje + bonusVeteranoPorcentaje) / 100));
}

// -----------------------------------------------------------------------
// Precios propios del veterinario (Sergio, 2026-11-03)
//
// Cuatro precios por veterinario: Normal y Urgencia, cada uno diurno y
// nocturno. El dueño define por país, para cada uno de los cuatro, un piso,
// un precio aconsejado y un techo; el veterinario elige su precio dentro de
// esa banda y, si no eligió, rige el aconsejado. La comisión de la
// plataforma es un porcentaje del honorario del veterinario con un mínimo
// fijo (los cargos de plataforma que ya existían). Todo son funciones puras:
// reciben los valores como parámetro, no leen nada de ningún lado.
// -----------------------------------------------------------------------
export type TipoConsulta = "NORMAL" | "URGENCIA";
export type ClaveTarifa = "NORMAL_DIURNA" | "NORMAL_NOCTURNA" | "URGENCIA_DIURNA" | "URGENCIA_NOCTURNA";
export const CLAVES_TARIFA: ClaveTarifa[] = ["NORMAL_DIURNA", "NORMAL_NOCTURNA", "URGENCIA_DIURNA", "URGENCIA_NOCTURNA"];

export function claveTarifa(tipo: TipoConsulta, franja: FranjaHoraria): ClaveTarifa {
  return `${tipo}_${franja}` as ClaveTarifa;
}

// Banda que define el dueño para una de las cuatro combinaciones.
export interface TarifaCelda {
  piso: number;
  aconsejado: number;
  techo: number;
}
export type TarifasPais = Record<ClaveTarifa, TarifaCelda>;

// Cuándo es de día y cuándo de noche en un país. La zona horaria es un
// nombre IANA (America/Argentina/Buenos_Aires, Europe/Madrid): nunca un
// desfase fijo, porque España cambia de horario en verano y Argentina no.
export interface ReglaFranja {
  zonaHoraria: string;
  inicioDiurno: string; // "HH:MM"
  finDiurno: string; // "HH:MM", inclusive
  domingoNocturno: boolean;
  feriadoNocturno: boolean;
  feriados: string[]; // "YYYY-MM-DD" en la zona del país
}

export const ZONA_HORARIA_ARGENTINA = "America/Argentina/Buenos_Aires";

function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const DIAS_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Fecha (YYYY-MM-DD), minutos desde medianoche y día de la semana de un
// instante, vistos desde una zona horaria. Usa Intl: no depende de la zona
// del servidor (Render corre en UTC y la hora local de Argentina es UTC−3).
export function partesLocales(instante: Date, zonaHoraria: string): { fecha: string; minutos: number; diaSemana: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
    minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
    diaSemana: DIAS_SEMANA[valor("weekday")] ?? 0,
  };
}

// Sergio, 2026-11-03: el sábado es diurno; el domingo y los feriados, nocturnos.
export function franjaEnZona(instante: Date, regla: ReglaFranja): FranjaHoraria {
  const p = partesLocales(instante, regla.zonaHoraria);
  if (regla.domingoNocturno && p.diaSemana === 0) return "NOCTURNA";
  if (regla.feriadoNocturno && regla.feriados.includes(p.fecha)) return "NOCTURNA";
  return p.minutos >= minutosDeHora(regla.inicioDiurno) && p.minutos <= minutosDeHora(regla.finDiurno) ? "DIURNA" : "NOCTURNA";
}

// El veterinario elige su precio; si no eligió, rige el aconsejado. En
// cualquier caso queda dentro de la banda: si el dueño sube el piso, nadie
// queda por debajo sin tener que reescribir lo que cada uno guardó.
export function precioEfectivo(celda: TarifaCelda, precioPropio: number | null | undefined): number {
  const base = precioPropio == null ? celda.aconsejado : precioPropio;
  return Math.round(Math.min(celda.techo, Math.max(celda.piso, base)));
}

// Comisión: porcentaje del honorario, con un mínimo fijo.
export function cargoPlataformaPorcentual(honorario: number, porcentaje: number, minimo: number): number {
  return Math.max(Math.round((honorario * porcentaje) / 100), minimo);
}

// Corre un porcentaje (positivo o negativo) a una banda completa.
export function ajustarCeldaPorPorcentaje(celda: TarifaCelda, porcentaje: number): TarifaCelda {
  const f = 1 + porcentaje / 100;
  return { piso: Math.round(celda.piso * f), aconsejado: Math.round(celda.aconsejado * f), techo: Math.round(celda.techo * f) };
}

// Devuelve el motivo si la banda no es coherente, o null si está bien.
export function motivoCeldaInvalida(celda: TarifaCelda): string | null {
  for (const v of [celda.piso, celda.aconsejado, celda.techo]) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return "Los tres valores tienen que ser números mayores a 0";
  }
  if (celda.piso > celda.aconsejado) return "El piso no puede ser mayor que el precio aconsejado";
  if (celda.aconsejado > celda.techo) return "El precio aconsejado no puede ser mayor que el techo";
  return null;
}

// Aviso que el veterinario ve y acepta antes de poner su propio precio
// (nunca lo ve el tutor). Si cambia el texto, hay que subir la versión.
// ⚠ Texto a revisar por el abogado antes de lanzar.
export const VERSION_AVISO_PRECIOS = "2026-11-03";
export const TEXTO_AVISO_PRECIOS =
  "El servicio que prestás en esta plataforma es de orientación y triage por videollamada, no una consulta clínica. " +
  "Por eso el valor tiene que ser accesible para el tutor. Te recomendamos verificar con tu colegio veterinario si su " +
  "nomenclador contempla este tipo de servicio. Vos decidís tu precio dentro del rango que se muestra.";

// Lo que devuelve GET /veterinarios/mis-precios.
export interface MisPreciosVeterinario {
  moneda: string;
  zonaHoraria: string;
  porcentajePlataforma: number;
  cargoMinimoDiurno: number;
  cargoMinimoNocturno: number;
  franjaAhora: FranjaHoraria;
  celdas: Array<TarifaCelda & { clave: ClaveTarifa; propio: number | null; efectivo: number }>;
  aviso: { version: string; texto: string; aceptado: boolean };
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

// Análogo a CARGO_NO_COMPLETADO, para pagos en PayPal (USD) — mismo
// criterio: constante fija en el código, no editable desde el panel
// (Sergio no lo pidió para la versión en pesos, se mantiene igual acá).
export const CARGO_NO_COMPLETADO_USD = 5;

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

const ETIQUETAS_BANDERAS_ROJAS: Record<keyof BanderasRojasIntake, string> = {
  dificultadRespiratoria: "Dificultad para respirar",
  inconsciente: "Inconsciente",
  sangradoActivo: "Sangrado activo",
  sospechaIngestaToxico: "Sospecha de ingesta de tóxico",
  convulsionEnCurso: "Convulsión en curso",
  noPuedeParseCaminar: "No puede pararse ni caminar",
  distensionAbdominal: "Distensión abdominal",
  traumatismoMayor: "Traumatismo mayor",
};

// Lista legible de las banderas rojas marcadas (para la ventana de solicitud).
export function listarBanderasRojas(banderas: BanderasRojasIntake): string[] {
  return CLAVES_BANDERAS_ROJAS.filter((clave) => banderas[clave]).map((clave) => ETIQUETAS_BANDERAS_ROJAS[clave]);
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
  costoTotal: number; // honorarioFinal + cargoPlataforma del caso, en ARS (Mercado Pago)
  // Franja con la que se calculó este precio (según la hora local DEL
  // VETERINARIO): la pantalla rotula "tarifa nocturna" antes de elegir.
  franja: FranjaHoraria;
  // Precio fijo de PayPal (USD) para ESTE caso — null si el veterinario no
  // tiene un email de PayPal cargado (Sergio, 2026-09-30: sin PayPal
  // conectado, ese veterinario no puede ofrecerse como opción de pago en
  // PayPal, mismo criterio que ya existía para Mercado Pago). Es el MISMO
  // monto para cualquier veterinario que sí lo tenga — ver nota en
  // honorarioPaypalDe sobre por qué PayPal no tiene margen individual.
  costoTotalPaypalUsd: number | null;
  ratingPromedio: number | null; // null si todavía no tiene calificaciones
  cantidadCalificaciones: number;
  // Está en una consulta ahora: puede demorar en responder (Sergio, 2026-10-27).
  enConsulta: boolean;
  // En Stand by: sigue con la sesión abierta pero puede no estar atento.
  enStandBy: boolean;
}

// Versión vigente de los Términos y Condiciones. Se guarda con cada
// aceptación (SolicitudAtencion.terminosVersion): al cambiar el texto de los
// Términos hay que subir esta fecha.
export const VERSION_TERMINOS = "2026-10-27";

// Tiempo que tiene el veterinario para responder una solicitud (Sergio,
// 2026-10-27): 90 segundos si está libre, 2 minutos si está en una consulta.
export const SOLICITUD_SEGUNDOS_LIBRE = 90;
export const SOLICITUD_SEGUNDOS_EN_CONSULTA = 120;

export type EstadoSolicitudAtencion =
  | "PENDIENTE"
  | "POSTERGADA"
  | "PACTADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "VENCIDA"
  | "CANCELADA_POR_CLIENTE";

// Lo que ve el CLIENTE de su solicitud (nunca datos de contacto del veterinario).
export interface SolicitudParaCliente {
  id: string;
  casoId: string;
  estado: EstadoSolicitudAtencion;
  venceEl: string;
  veterinario: { id: string; nombre: string; apellido: string };
  vetEnConsulta: boolean;
  // Horario propuesto por el veterinario al postergar (POSTERGADA) o acordado (PACTADA).
  propuestaPara: string | null;
}

// Turno acordado que ve el VETERINARIO en su panel (solo contexto clínico).
export interface TurnoPactadoParaVeterinario {
  id: string;
  casoId: string;
  propuestaPara: string;
  especie: string;
  motivoConsulta: string;
}

// Opciones de "Postergar" para el veterinario, en minutos.
export const POSTERGAR_OPCIONES_MINUTOS = [15, 30, 60, 120] as const;
// Tiempo que tiene el cliente para responder a una propuesta de postergación.
export const PROPUESTA_SEGUNDOS = 180;

// Lo que ve el VETERINARIO de una solicitud entrante: contexto clínico del
// intake, sin ningún dato de contacto del cliente (la plataforma es siempre
// la mediadora).
export interface SolicitudParaVeterinario {
  id: string;
  casoId: string;
  estado: EstadoSolicitudAtencion;
  venceEl: string;
  creadaEl: string;
  vetEnConsulta: boolean;
  hayBanderaRoja: boolean;
  banderasRojas: string[];
  especie: string;
  raza: string | null;
  edadAproximada: string | null;
  pesoAproximadoKg: number | null;
  motivoConsulta: string;
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
  // moneda: Mercado Pago siempre es ARS; PayPal siempre USD (ver nota en
  // Pago.moneda de schema.prisma) — sin esto, cualquier pantalla que
  // muestre montoTotal no tiene cómo saber con qué símbolo formatearlo.
  pago: {
    estado: EstadoPagoCliente;
    montoTotal: number;
    moneda: "ARS" | "USD";
    medioDeCobro: "MERCADO_PAGO" | "STRIPE" | "PAYPAL";
  } | null;
  yaCalificado: boolean;
  disputaCalidad: { id: string; estado: "ABIERTA" | "EN_REVISION" | "RESUELTA"; resolucion: string | null } | null;
}
