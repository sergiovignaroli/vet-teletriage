// Presencia del veterinario (Sergio, 2026-10-27).
//
// El panel abierto manda un latido cada 30 segundos. Mientras no existan las
// notificaciones push, a un panel cerrado nadie puede avisarle de un cliente,
// así que la lista del cliente solo incluye a quien tuvo señal en los últimos
// 5 minutos (un celular con la pestaña en segundo plano frena los
// temporizadores, por eso no son 90 segundos). Cuando haya push, este
// vencimiento se relaja para quien tenga el aviso activado.
export const SENAL_VIGENTE_MS = 5 * 60 * 1000;

export function desdeSenalVigente(ahora: number = Date.now()): Date {
  return new Date(ahora - SENAL_VIGENTE_MS);
}

export function tieneSenalVigente(ultimaSenal: Date | null | undefined, ahora: number = Date.now()): boolean {
  return !!ultimaSenal && ultimaSenal.getTime() >= ahora - SENAL_VIGENTE_MS;
}
