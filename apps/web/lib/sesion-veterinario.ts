"use client";

// Sesión de veterinario, guardada en localStorage. Mismo criterio que
// lib/sesion.ts (cliente): sin refresh token, Fase 1 (ver README).
// Clave de storage distinta a propósito — un mismo navegador podría, en
// teoría, tener abierta una sesión de cliente Y una de veterinario (por
// ejemplo, un veterinario que también consulta como dueño de una mascota),
// y no queremos que una pise a la otra.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "va_sesion_veterinario";

export interface SesionVeterinario {
  accessToken: string;
  veterinarioId: string;
  nombre: string;
  apellido: string;
  estado: string;
  disponible: boolean;
  onboardingCompletado: boolean;
}

function leerStorage(): SesionVeterinario | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY);
    return crudo ? (JSON.parse(crudo) as SesionVeterinario) : null;
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

// Hook de sesión: undefined mientras no se confirmó (evita parpadeo de "no
// logueado" antes de leer localStorage), null si no hay sesión, o el objeto
// de sesión si la hay.
export function useSesionVeterinario() {
  const [sesion, setSesion] = useState<SesionVeterinario | null | undefined>(undefined);

  useEffect(() => {
    setSesion(leerStorage());
  }, []);

  const guardar = useCallback((nueva: SesionVeterinario) => {
    escribirStorage(nueva);
    setSesion(nueva);
  }, []);

  const actualizarOnboarding = useCallback((completado: boolean) => {
    setSesion((prev) => {
      if (!prev) return prev;
      const actualizada = { ...prev, onboardingCompletado: completado };
      escribirStorage(actualizada);
      return actualizada;
    });
  }, []);

  const actualizarDisponible = useCallback((disponible: boolean) => {
    setSesion((prev) => {
      if (!prev) return prev;
      const actualizada = { ...prev, disponible };
      escribirStorage(actualizada);
      return actualizada;
    });
  }, []);

  const cerrarSesion = useCallback(() => {
    escribirStorage(null);
    setSesion(null);
  }, []);

  return { sesion, guardar, actualizarOnboarding, actualizarDisponible, cerrarSesion };
}
