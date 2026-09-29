"use client";

// Sesión de admin, guardada en localStorage. Mismo criterio que
// lib/sesion.ts y lib/sesion-veterinario.ts, pero más chica: un admin no
// tiene onboarding de producto ni datos de perfil que mostrar en el panel —
// solo necesita el token para pegarle a los endpoints @Roles("ADMIN").

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "va_sesion_admin";

export interface SesionAdmin {
  accessToken: string;
}

function leerStorage(): SesionAdmin | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY);
    return crudo ? (JSON.parse(crudo) as SesionAdmin) : null;
  } catch {
    return null;
  }
}

function escribirStorage(sesion: SesionAdmin | null) {
  if (typeof window === "undefined") return;
  try {
    if (sesion) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort, ver comentario de arriba
  }
}

// undefined mientras no se confirmó (primer render), null si no hay sesión,
// el objeto si la hay — mismo contrato que los otros dos hooks de sesión.
export function useSesionAdmin() {
  const [sesion, setSesion] = useState<SesionAdmin | null | undefined>(undefined);

  useEffect(() => {
    setSesion(leerStorage());
  }, []);

  const guardar = useCallback((nueva: SesionAdmin) => {
    escribirStorage(nueva);
    setSesion(nueva);
  }, []);

  const cerrarSesion = useCallback(() => {
    escribirStorage(null);
    setSesion(null);
  }, []);

  return { sesion, guardar, cerrarSesion };
}
