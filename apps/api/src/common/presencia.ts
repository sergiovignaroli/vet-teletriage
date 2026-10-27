// Presencia del veterinario (Sergio, 2026-10-27).
//
// El panel abierto manda un latido cada 30 segundos. Sin avisos push, a un
// panel cerrado nadie puede avisarle de un cliente, así que solo se lista a
// quien tuvo señal en los últimos 5 minutos (un celular con la pestaña en
// segundo plano frena los temporizadores, por eso no son 90 segundos).
//
// Quien activó los avisos en su dispositivo SÍ puede enterarse con la
// pestaña cerrada, así que para ese veterinario la ventana es más larga.
// Si igual no responde, la solicitud vence a los 90 s y tres vencidas
// seguidas lo pasan a Stand by: el sistema se corrige solo.
export const SENAL_VIGENTE_MS = 5 * 60 * 1000;
export const SENAL_VIGENTE_CON_PUSH_MS = 2 * 60 * 60 * 1000;

export function desdeSenalVigente(ahora: number = Date.now()): Date {
  return new Date(ahora - SENAL_VIGENTE_MS);
}

// Filtro de Prisma para "veterinario con señal vigente" (con o sin push).
export function filtroSenalVigente(ahora: number = Date.now()) {
  return {
    OR: [
      { ultimaSenal: { gte: desdeSenalVigente(ahora) } },
      {
        ultimaSenal: { gte: new Date(ahora - SENAL_VIGENTE_CON_PUSH_MS) },
        pushSuscripciones: { some: {} },
      },
    ],
  };
}

export function tieneSenalVigente(
  ultimaSenal: Date | null | undefined,
  conPush = false,
  ahora: number = Date.now(),
): boolean {
  if (!ultimaSenal) return false;
  const ventana = conPush ? SENAL_VIGENTE_CON_PUSH_MS : SENAL_VIGENTE_MS;
  return ultimaSenal.getTime() >= ahora - ventana;
}
