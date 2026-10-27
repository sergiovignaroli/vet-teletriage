"use client";

// Avisos push del veterinario (Sergio, 2026-10-27, Fase 3): permiten recibir
// una nueva consulta con la pestaña cerrada o el celular bloqueado.
//
// Límites reales (no son un descuido de la plataforma):
//  - En iPhone/iPad los avisos web solo existen si la app está agregada a la
//    pantalla de inicio (iOS 16.4 o más) y se abre desde ahí.
//  - Un aviso web no suena como una llamada: usa el sonido de notificación del
//    teléfono. Para un timbre insistente haría falta una app nativa.

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPostAuth, ApiError } from "./api";

export type EstadoPush =
  | "cargando"
  | "no-configurado" // el servidor no tiene claves VAPID
  | "no-soportado" // navegador sin push
  | "ios-instalar" // iPhone/iPad sin la app en pantalla de inicio
  | "bloqueado" // la persona negó el permiso
  | "inactivo"
  | "activo";

function aBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const crudo = atob(base64);
  const salida = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) salida[i] = crudo.charCodeAt(i);
  return salida;
}

function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
}

function estaInstalada(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useAvisosPush(token: string | undefined) {
  const [estado, setEstado] = useState<EstadoPush>("cargando");
  const [clave, setClave] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instalar, setInstalar] = useState<EventoInstalar | null>(null);
  const [mensajeProbar, setMensajeProbar] = useState<string | null>(null);

  useEffect(() => {
    const alPedirInstalar = (e: Event) => {
      e.preventDefault();
      setInstalar(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alPedirInstalar);
    return () => window.removeEventListener("beforeinstallprompt", alPedirInstalar);
  }, []);

  const revisar = useCallback(async () => {
    if (!token) return;
    let clavePublica: string | null = null;
    try {
      clavePublica = (await apiGet<{ clavePublica: string | null }>("/notificaciones/push/clave")).clavePublica;
    } catch {
      setEstado("no-configurado");
      return;
    }
    setClave(clavePublica);
    if (!clavePublica) return setEstado("no-configurado");

    const soportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!soportado) return setEstado(esIOS() && !estaInstalada() ? "ios-instalar" : "no-soportado");
    if (Notification.permission === "denied") return setEstado("bloqueado");

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // Se vuelve a registrar en el servidor: cubre el caso de otra cuenta
        // o de una suscripción que el servidor ya había borrado.
        await apiPostAuth("/notificaciones/push/suscribir", token, sub.toJSON());
        return setEstado("activo");
      }
    } catch {
      // se muestra como inactivo; la persona puede reintentar
    }
    setEstado("inactivo");
  }, [token]);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const activar = useCallback(async () => {
    if (!token || !clave) return;
    setError(null);
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const previa = await reg.pushManager.getSubscription();
      const sub =
        previa ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) }));
      await apiPostAuth("/notificaciones/push/suscribir", token, sub.toJSON());
      setEstado("activo");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos activar los avisos en este dispositivo. Probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  }, [token, clave]);

  const desactivar = useCallback(async () => {
    if (!token) return;
    setError(null);
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await apiPostAuth("/notificaciones/push/desuscribir", token, { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setError("No pudimos desactivar los avisos. Probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  }, [token]);

  const probar = useCallback(async () => {
    if (!token) return;
    setMensajeProbar(null);
    try {
      const { enviados } = await apiPostAuth<{ enviados: number }>("/notificaciones/push/probar", token);
      setMensajeProbar(
        enviados > 0
          ? "Listo: en unos segundos te llega un aviso. Si estás mirando esta pantalla, el sistema no lo muestra."
          : "No se pudo enviar el aviso de prueba.",
      );
    } catch {
      setMensajeProbar("No se pudo enviar el aviso de prueba.");
    }
  }, [token]);

  const pedirInstalacion = useCallback(async () => {
    if (!instalar) return;
    await instalar.prompt();
    await instalar.userChoice.catch(() => null);
    setInstalar(null);
  }, [instalar]);

  return {
    estado,
    ocupado,
    error,
    activar,
    desactivar,
    probar,
    mensajeProbar,
    puedeInstalar: instalar !== null,
    pedirInstalacion,
  };
}
