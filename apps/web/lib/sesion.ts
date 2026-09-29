"use client";

// Sesión de cliente (tutor), guardada en localStorage. Fase 1: sin refresh
// token (ver README, sección "Lo que falta") — el JWT vence a las 12 h y
// listo, no hay renovación automática. Esto es deliberadamente simple, no
// un descuido: escala hasta que haga falta lo otro.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "va_sesion_cliente";

export interface SesionCliente {
  accessToken: string;
  clienteId: string;
  onboardingCompletado: boolean;
}

function leerStorage(): SesionCliente | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY);
    return crudo ? (JSON.parse(crudo) as SesionCliente) : null;
  } catch {
    // localStorage puede fallar (modo privado, storage bloqueado) — sin
    // sesión persistida no es un error fatal, es como si no hubiera logueado.
    return null;
  }
}

function escribirStorage(sesion: SesionCliente | null) {
  if (typeof window === "undefined") return;
  try {
    if (sesion) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort, ver comentario de arriba
  }
}

// Hook de sesión: null mientras no se confirmó (evita parpadeo de "no
// logueado" antes de leer localStorage), undefined-como-null si no hay
// sesión, o el objeto de sesión si la hay.
export function useSesionCliente() {
  const [sesion, setSesion] = useState<SesionCliente | null | undefined>(undefined);

  useEffect(() => {
    setSesion(leerStorage());
  }, []);

  const guardar = useCallback((nueva: SesionCliente) => {
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

  const cerrarSesion = useCallback(() => {
    escribirStorage(null);
    setSesion(null);
  }, []);

  return { sesion, guardar, actualizarOnboarding, cerrarSesion };
}
