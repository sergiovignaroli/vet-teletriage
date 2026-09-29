// Interfaz agnóstica al proveedor de video (Sergio, 2026-09-29: "armá la
// interfaz ahora" — todavía no eligió Twilio, Daily.co o Zoom Video SDK,
// pendiente de una prueba de carga que solo él puede correr). El objetivo
// de esta interfaz es que, el día que elija, conectar el SDK real sea
// escribir UNA clase nueva que la implemente — nunca tocar casos.service.ts
// ni las pantallas que ya consumen salaVideoUrl.
export interface ProveedorVideo {
  // Crea (o recupera, si ya existe) la sala para este caso puntual y
  // devuelve su URL — o null si todavía no hay un proveedor real conectado.
  // Devolver null, nunca una URL inventada: una URL que parece real pero no
  // funciona es peor que decir claramente "todavía no hay sala".
  crearSala(casoId: string): Promise<string | null>;
}

// Token de inyección — NestJS no puede inyectar por una interfaz TS sola
// (se borra en tiempo de ejecución), hace falta un token concreto.
export const PROVEEDOR_VIDEO = "PROVEEDOR_VIDEO";
