"use client";

// Sesión de veterinario, guardada en localStorage. A diferencia de la del
// cliente (lib/sesion.ts), es una sesión larga (Sergio, 2026-10-27): el token
// de acceso dura 15 minutos y se renueva solo con un token de renovación de
// 30 días, así el veterinario puede quedar disponible todo el tiempo que
// quiera sin volver a ingresar. Se cierra cuando él se desconecta y sale, o
// si pasan 30 días sin usarla.
// Clave de storage distinta a propósito — un mismo navegador podría, en
// teoría, tener abierta una sesión de cliente Y una de veterinario (por
// ejemplo, un veterinario que también consulta como dueño de una mascota),
// y no queremos que una pise a la otra.

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPatch, apiPostAuth, registrarRenovadorVeterinario } from "./api";

const STORAGE_KEY = "va_sesion_veterinario";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Se renueva cuando faltan menos de 4 minutos para que venza el acceso.
const MARGEN_RENOVACION_MS = 4 * 60 * 1000;
const REVISION_CADA_MS = 60 * 1000;
const LATIDO_CADA_MS = 30 * 1000;

export type Presencia = "CONECTADO" | "STAND_BY" | "DESCONECTADO";

export interface SesionVeterinario {
  accessToken: string;
  // Token de renovación. Ausente en sesiones iniciadas antes de este cambio:
  // esas siguen funcionando hasta que venza su token de 12 horas.
  refreshToken?: string;
  // Cuándo vence accessToken (ms desde 1970).
  accesoVenceEl?: number;
  veterinarioId: string;
  nombre: string;
  apellido: string;
  estado: string;
  disponible: boolean;
  presencia: Presencia;
  margenPorcentaje: number;
  onboardingCompletado: boolean;
}

function leerStorage(): SesionVeterinario | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY);
    if (!crudo) return null;
    const sesion = JSON.parse(crudo) as SesionVeterinario;
    // Sesiones viejas no traían presencia: se deduce de `disponible`.
    if (!sesion.presencia) sesion.presencia = sesion.disponible ? "CONECTADO" : "DESCONECTADO";
    return sesion;
  } catch {
    // localStorage puede fallar (modo privado, storage bloqueado) — sin
    // sesión persistida no es un error fatal, es como si no hubiera logueado.
    return null;
  }
}

function escribirStorage(sesion: SesionVeterinario | null) {
  if (typeof window === "undefined") return;
  try {
    if (sesion) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort, ver comentario de arriba
  }
}

interface RespuestaRenovar {
  accessToken: string;
  refreshToken: string;
  accesoExpiraEnSegundos: number;
  estado: string;
  disponible: boolean;
  presencia: Presencia;
  margenPorcentaje: number;
  onboardingCompletado: boolean;
}

// Quienes quieren enterarse cuando la sesión se renueva por fuera del hook
// (por ejemplo, cuando lib/api.ts reintenta un pedido que volvió 401): el
// estado de React tiene que seguir al storage, o termina pisándolo con un
// token ya vencido.
const oyentes = new Set<(sesion: SesionVeterinario | null) => void>();
function avisar(sesion: SesionVeterinario | null) {
  oyentes.forEach((fn) => fn(sesion));
}

// Una sola renovación a la vez por pestaña.
let renovacionEnCurso: Promise<SesionVeterinario | null> | null = null;

// Renueva la sesión. Devuelve la sesión vigente, o null si ya no es válida
// (en ese caso borra el storage: hay que ingresar de nuevo). Si no hay red,
// devuelve la sesión actual sin cerrarla: un corte de internet no es un
// cierre de sesión.
export function renovarSesionVeterinario(): Promise<SesionVeterinario | null> {
  if (renovacionEnCurso) return renovacionEnCurso;
  renovacionEnCurso = (async () => {
    const actual = leerStorage();
    if (!actual?.refreshToken) return actual; // sesión vieja: sin renovación posible
    try {
      const respuesta = await fetch(`${API_URL}/auth/veterinario/renovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: actual.refreshToken }),
      });
      if (respuesta.ok) {
        const datos = (await respuesta.json()) as RespuestaRenovar;
        const nueva: SesionVeterinario = {
          ...actual,
          accessToken: datos.accessToken,
          refreshToken: datos.refreshToken,
          accesoVenceEl: Date.now() + datos.accesoExpiraEnSegundos * 1000,
          estado: datos.estado,
          disponible: datos.disponible,
          presencia: datos.presencia,
          margenPorcentaje: datos.margenPorcentaje,
          onboardingCompletado: datos.onboardingCompletado,
        };
        escribirStorage(nueva);
        avisar(nueva);
        return nueva;
      }
      if (respuesta.status === 401) {
        // Otra pestaña pudo haberla renovado un instante antes: si en el
        // storage hay un token de renovación distinto, esa es la vigente.
        const enStorage = leerStorage();
        if (enStorage && enStorage.refreshToken !== actual.refreshToken) {
          avisar(enStorage);
          return enStorage;
        }
        escribirStorage(null);
        avisar(null);
        return null;
      }
      return actual; // error del servidor: no cerrar la sesión por eso
    } catch {
      return actual; // sin red
    }
  })().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
}

// Para que lib/api.ts reintente solo un pedido que volvió 401. Solo actúa si
// el token que falló es el de esta sesión de veterinario.
registrarRenovadorVeterinario(async (tokenViejo) => {
  const actual = leerStorage();
  if (!actual || actual.accessToken !== tokenViejo) {
    // Otra pestaña ya renovó: usar su token si cambió.
    return actual && actual.accessToken !== tokenViejo && actual.refreshToken ? actual.accessToken : null;
  }
  const nueva = await renovarSesionVeterinario();
  return nueva && nueva.accessToken !== tokenViejo ? nueva.accessToken : null;
});

// Hook de sesión: undefined mientras no se confirmó (evita parpadeo de "no
// logueado" antes de leer localStorage), null si no hay sesión, o el objeto
// de sesión si la hay. Además renueva el token antes de que venza y se
// mantiene al día con lo que hagan otras pestañas.
export function useSesionVeterinario() {
  const [sesion, setSesion] = useState<SesionVeterinario | null | undefined>(undefined);

  useEffect(() => {
    setSesion(leerStorage());
  }, []);

  // Renovación preventiva.
  useEffect(() => {
    if (!sesion?.refreshToken) return;
    let activo = true;
    const revisar = async () => {
      const actual = leerStorage();
      if (!actual?.refreshToken) return;
      const vence = actual.accesoVenceEl ?? 0;
      if (vence - Date.now() > MARGEN_RENOVACION_MS) return;
      const nueva = await renovarSesionVeterinario();
      if (activo) setSesion(nueva);
    };
    revisar();
    const id = window.setInterval(revisar, REVISION_CADA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") revisar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", revisar);
    return () => {
      activo = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", revisar);
    };
  }, [sesion?.refreshToken]);

  // Renovaciones hechas por lib/api.ts (reintento tras un 401).
  useEffect(() => {
    oyentes.add(setSesion);
    return () => {
      oyentes.delete(setSesion);
    };
  }, []);

  // Cambios hechos desde otra pestaña (renovación, cierre de sesión).
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSesion(leerStorage());
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  const guardar = useCallback((nueva: SesionVeterinario) => {
    escribirStorage(nueva);
    setSesion(nueva);
  }, []);

  const modificar = useCallback((cambios: Partial<SesionVeterinario>) => {
    setSesion((prev) => {
      if (!prev) return prev;
      // Se parte de lo que hay en el storage (lo más nuevo), no del estado:
      // si el token se renovó por fuera, el estado puede estar atrasado.
      const base = leerStorage() ?? prev;
      const actualizada = { ...base, ...cambios };
      escribirStorage(actualizada);
      return actualizada;
    });
  }, []);

  const actualizarOnboarding = useCallback((completado: boolean) => modificar({ onboardingCompletado: completado }), [modificar]);
  const actualizarPresencia = useCallback(
    (presencia: Presencia) => modificar({ presencia, disponible: presencia === "CONECTADO" }),
    [modificar],
  );
  const actualizarMargen = useCallback((margenPorcentaje: number) => modificar({ margenPorcentaje }), [modificar]);

  // Salir: primero se avisa al servidor (queda Desconectado y se revoca el
  // token de renovación), sin hacer esperar al veterinario; la pantalla se
  // limpia de inmediato.
  const cerrarSesion = useCallback(() => {
    const actual = leerStorage();
    escribirStorage(null);
    setSesion(null);
    if (actual) {
      void (async () => {
        try {
          await apiPatch("/veterinarios/presencia", actual.accessToken, { presencia: "DESCONECTADO" });
        } catch {
          // best-effort: si el token ya estaba revocado, no hay nada que avisar
        }
        try {
          await fetch(`${API_URL}/auth/veterinario/cerrar-sesion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: actual.refreshToken }),
          });
        } catch {
          // best-effort
        }
      })();
    }
  }, []);

  return { sesion, guardar, actualizarOnboarding, actualizarPresencia, actualizarMargen, cerrarSesion, modificar };
}

// Latido: mientras el veterinario está Conectado o en Stand by y el panel
// está abierto, avisa al servidor cada 30 segundos que sigue ahí. Es lo que
// permite aparecer en la lista de los clientes (ver apps/api common/presencia.ts).
// El servidor responde con el estado real, y el panel se corrige solo si
// cambió por fuera (por ejemplo, una suspensión).
export function useLatidoVeterinario(
  sesion: SesionVeterinario | null | undefined,
  alSincronizar: (estado: { estado: string; presencia: Presencia; disponible: boolean }) => void,
) {
  const activo = !!sesion && sesion.presencia !== "DESCONECTADO";
  const tokenRef = useRef<string | undefined>(sesion?.accessToken);
  const callbackRef = useRef(alSincronizar);
  tokenRef.current = sesion?.accessToken;
  callbackRef.current = alSincronizar;

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    const enviar = async () => {
      const token = tokenRef.current;
      if (!token) return;
      try {
        const estado = await apiPostAuth<{ estado: string; presencia: Presencia; disponible: boolean }>(
          "/veterinarios/latido",
          token,
        );
        if (!cancelado && estado) callbackRef.current(estado);
      } catch {
        // sin red o sesión vencida: el próximo latido lo reintenta
      }
    };
    enviar();
    const id = window.setInterval(enviar, LATIDO_CADA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") enviar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo]);
}
