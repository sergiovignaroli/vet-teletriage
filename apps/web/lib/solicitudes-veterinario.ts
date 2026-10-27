"use client";

// Solicitudes de atención en el panel del veterinario (Sergio, 2026-10-27).
// Mientras la sesión está abierta y el estado no es Desconectado, el panel
// escucha un canal en tiempo real (SSE) y además consulta cada 15 s: si el
// canal se corta, ninguna solicitud se pierde. Al llegar una, suena, vibra y
// titila el título de la pestaña hasta que se responde o vence.

import { useCallback, useEffect, useRef, useState } from "react";
import type { SolicitudParaVeterinario } from "@vet-teletriage/types";
import { apiGet, apiPostAuth, ApiError } from "./api";
import type { SesionVeterinario } from "./sesion-veterinario";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CONSULTA_DE_RESPALDO_MS = 15_000;

// ---------------------------------------------------------------------------
// Sonido: WebAudio. Los navegadores no dejan sonar nada hasta que la persona
// toca la pantalla al menos una vez; por eso el panel pide "activar sonido".
// ---------------------------------------------------------------------------
let contexto: AudioContext | null = null;
const oyentesSonido = new Set<() => void>();

function obtenerContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!contexto) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    contexto = new Ctor();
    contexto.onstatechange = () => oyentesSonido.forEach((f) => f());
  }
  return contexto;
}

export function activarSonido(): boolean {
  const ctx = obtenerContexto();
  if (!ctx) return false;
  void ctx.resume().then(() => oyentesSonido.forEach((f) => f()));
  return ctx.state === "running";
}

function sonidoListo(): boolean {
  return contexto?.state === "running";
}

function pitido(ctx: AudioContext, inicio: number, frecuencia: number, duracion: number) {
  const osc = ctx.createOscillator();
  const ganancia = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frecuencia;
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(0.35, inicio + 0.02);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(ganancia).connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.05);
}

// Dos notas ascendentes, repetidas mientras haya una solicitud abierta.
export function tocarAviso() {
  const ctx = contexto;
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  pitido(ctx, t, 784, 0.22);
  pitido(ctx, t + 0.26, 1046, 0.32);
}

export function useSonidoActivo(): { activo: boolean; activar: () => void } {
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    const sync = () => setActivo(sonidoListo());
    oyentesSonido.add(sync);
    sync();
    // Cualquier toque o tecla en el panel alcanza para habilitar el sonido.
    const desbloquear = () => {
      activarSonido();
    };
    window.addEventListener("pointerdown", desbloquear, { once: true });
    window.addEventListener("keydown", desbloquear, { once: true });
    return () => {
      oyentesSonido.delete(sync);
      window.removeEventListener("pointerdown", desbloquear);
      window.removeEventListener("keydown", desbloquear);
    };
  }, []);
  return { activo, activar: () => void activarSonido() };
}

// ---------------------------------------------------------------------------
// Canal en tiempo real: fetch con el token en el header (EventSource no
// permite headers). Reconecta solo, con espera creciente.
// ---------------------------------------------------------------------------
function escucharCanal(obtenerToken: () => string | undefined, alEvento: (nombre: string) => void): () => void {
  let cerrado = false;
  let controlador: AbortController | null = null;
  let espera = 1000;

  const conectar = async () => {
    while (!cerrado) {
      const token = obtenerToken();
      if (token) {
        controlador = new AbortController();
        try {
          const r = await fetch(`${API_URL}/solicitudes/eventos`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
            signal: controlador.signal,
            cache: "no-store",
          });
          if (r.ok && r.body) {
            espera = 1000;
            const lector = r.body.getReader();
            const decodificador = new TextDecoder();
            let resto = "";
            for (;;) {
              const { value, done } = await lector.read();
              if (done) break;
              resto += decodificador.decode(value, { stream: true });
              let corte: number;
              while ((corte = resto.indexOf("\n\n")) !== -1) {
                const bloque = resto.slice(0, corte);
                resto = resto.slice(corte + 2);
                const linea = bloque.split("\n").find((l) => l.startsWith("event:"));
                if (linea) alEvento(linea.slice(6).trim());
              }
            }
          }
        } catch {
          // corte de red o cierre voluntario: se reintenta abajo
        }
      }
      if (cerrado) return;
      await new Promise((ok) => setTimeout(ok, espera));
      espera = Math.min(espera * 2, 30_000);
    }
  };
  void conectar();

  return () => {
    cerrado = true;
    controlador?.abort();
  };
}

// ---------------------------------------------------------------------------

export function useSolicitudesVeterinario(
  sesion: SesionVeterinario | null | undefined,
  alAceptar: () => void,
) {
  const activo = !!sesion && sesion.onboardingCompletado && sesion.presencia !== "DESCONECTADO";
  const tokenRef = useRef<string | undefined>(sesion?.accessToken);
  tokenRef.current = sesion?.accessToken;
  const alAceptarRef = useRef(alAceptar);
  alAceptarRef.current = alAceptar;

  const [solicitud, setSolicitud] = useState<SolicitudParaVeterinario | null>(null);
  const [respondiendo, setRespondiendo] = useState<"aceptar" | "rechazar" | "postergar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const p = await apiGet<SolicitudParaVeterinario | null>("/solicitudes/pendiente", token);
      setSolicitud((actual) => (actual?.id === p?.id ? (p ?? null) : (p ?? null)));
    } catch {
      // sin red o sesión en renovación: la próxima consulta lo reintenta
    }
  }, []);

  useEffect(() => {
    if (!activo) {
      setSolicitud(null);
      return;
    }
    void consultar();
    const cierre = escucharCanal(() => tokenRef.current, (nombre) => {
      if (nombre === "evento" || nombre === "listo") {
        void consultar();
        // Un turno pactado que llegó o se activó cambia las listas del panel.
        alAceptarRef.current();
      }
    });
    const id = window.setInterval(consultar, CONSULTA_DE_RESPALDO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    return () => {
      cierre();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
    };
  }, [activo, consultar]);

  // Aviso insistente mientras haya una solicitud abierta.
  const idAbierta = solicitud?.id ?? null;
  useEffect(() => {
    if (!idAbierta) return;
    const tituloOriginal = document.title;
    let alterno = false;
    const titilar = window.setInterval(() => {
      alterno = !alterno;
      document.title = alterno ? "🔔 ¡Nueva consulta!" : tituloOriginal;
    }, 900);
    const avisar = () => {
      tocarAviso();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([400, 150, 400]);
        } catch {}
      }
    };
    avisar();
    const repetir = window.setInterval(avisar, 2500);
    return () => {
      window.clearInterval(titilar);
      window.clearInterval(repetir);
      document.title = tituloOriginal;
      try {
        navigator.vibrate?.(0);
      } catch {}
    };
  }, [idAbierta]);

  const responder = useCallback(
    async (accion: "aceptar" | "rechazar" | "postergar", minutos?: number) => {
      const token = tokenRef.current;
      if (!token || !idAbierta) return;
      setError(null);
      setRespondiendo(accion);
      try {
        await apiPostAuth(`/solicitudes/${idAbierta}/${accion}`, token, accion === "postergar" ? { minutos } : undefined);
        setSolicitud(null);
        if (accion === "aceptar" || accion === "postergar") alAceptarRef.current();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "No pudimos enviar tu respuesta. Probá de nuevo.");
        // Si ya no está disponible (venció o la canceló el cliente), se cierra la ventana.
        if (e instanceof ApiError && e.status === 400) {
          setSolicitud(null);
        }
      } finally {
        setRespondiendo(null);
      }
    },
    [idAbierta],
  );

  return { solicitud, respondiendo, error, responder, limpiarError: () => setError(null) };
}
