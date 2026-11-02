// Límite de intentos por clave (ej.: un número de teléfono), en memoria.
//
// Complementa al límite por IP (@nestjs/throttler): un atacante puede cambiar
// de IP, pero no de número de teléfono si quiere molestar a una persona
// concreta, ni gastar el mensaje de WhatsApp de un número en particular.
//
// OJO (limitación conocida): vive en la memoria del proceso. Con una sola
// instancia en Render (el caso actual) funciona bien; si algún día hay
// varias instancias, hay que pasarlo a Redis o a la base de datos, porque
// cada instancia llevaría su propia cuenta. Se reinicia con cada deploy.
const intentos = new Map<string, number[]>();

export interface ReglaLimite {
  maximo: number; // cuántos eventos se permiten dentro de la ventana
  ventanaMs: number;
  espacioMinimoMs?: number; // tiempo mínimo entre un evento y el siguiente
}

// Devuelve null si se puede seguir (y registra el evento), o los segundos
// que hay que esperar si se superó el límite.
export function consumirLimite(clave: string, regla: ReglaLimite, ahora = Date.now()): number | null {
  const desde = ahora - regla.ventanaMs;
  const vigentes = (intentos.get(clave) ?? []).filter((t) => t > desde);

  if (regla.espacioMinimoMs && vigentes.length > 0) {
    const ultimo = vigentes[vigentes.length - 1];
    const faltaMs = ultimo + regla.espacioMinimoMs - ahora;
    if (faltaMs > 0) return Math.ceil(faltaMs / 1000);
  }
  if (vigentes.length >= regla.maximo) {
    return Math.ceil((vigentes[0] + regla.ventanaMs - ahora) / 1000);
  }

  vigentes.push(ahora);
  intentos.set(clave, vigentes);

  // Limpieza ocasional para que el mapa no crezca sin límite.
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) {
      if (v.every((t) => t <= desde)) intentos.delete(k);
    }
  }
  return null;
}
