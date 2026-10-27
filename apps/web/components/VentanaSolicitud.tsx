"use client";

import { useEffect, useState } from "react";
import type { SolicitudParaVeterinario } from "@vet-teletriage/types";

// Ventana emergente de "te están pidiendo una consulta" (Sergio, 2026-10-27).
// Solo muestra contexto clínico: nunca datos de contacto de la persona.
export function VentanaSolicitud({
  solicitud,
  respondiendo,
  error,
  onAceptar,
  onRechazar,
}: {
  solicitud: SolicitudParaVeterinario;
  respondiendo: "aceptar" | "rechazar" | null;
  error: string | null;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  const [segundos, setSegundos] = useState(0);
  const total = Math.max(
    1,
    Math.round((new Date(solicitud.venceEl).getTime() - new Date(solicitud.creadaEl).getTime()) / 1000),
  );

  useEffect(() => {
    const calcular = () =>
      setSegundos(Math.max(0, Math.ceil((new Date(solicitud.venceEl).getTime() - Date.now()) / 1000)));
    calcular();
    const t = setInterval(calcular, 500);
    return () => clearInterval(t);
  }, [solicitud.venceEl]);

  const mm = Math.floor(segundos / 60);
  const ss = String(segundos % 60).padStart(2, "0");
  const ocupado = respondiendo !== null;
  const datos = [
    solicitud.especie,
    solicitud.raza,
    solicitud.edadAproximada,
    solicitud.pesoAproximadoKg != null ? `${solicitud.pesoAproximadoKg} kg` : null,
  ].filter(Boolean);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="va-solicitud-titulo"
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(20, 48, 42, 0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--bg, #f6f0e4)",
          borderRadius: 22,
          padding: "22px 20px 20px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.3)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="va-etiqueta" style={{ color: "var(--esmeralda)", letterSpacing: "0.1em" }}>
            Nueva consulta
          </span>
          <span className="va-titular" style={{ fontSize: 22 }} aria-label="Tiempo para responder">
            {mm}:{ss}
          </span>
        </div>
        <div
          aria-hidden
          style={{ height: 5, borderRadius: 3, background: "var(--borde)", overflow: "hidden", marginBottom: 16 }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (segundos / total) * 100)}%`,
              background: segundos <= 15 ? "var(--terracota)" : "var(--esmeralda)",
              transition: "width 0.5s linear",
            }}
          />
        </div>

        <h2 id="va-solicitud-titulo" className="va-titular" style={{ fontSize: 20, margin: "0 0 6px" }}>
          Una persona quiere hablar con vos
        </h2>
        <p style={{ fontSize: 14, margin: "0 0 10px", color: "var(--muted)" }}>{datos.join(" · ")}</p>

        {solicitud.hayBanderaRoja && (
          <div
            style={{
              background: "rgba(180, 67, 45, 0.1)",
              border: "1px solid var(--terracota)",
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 13.5,
            }}
          >
            <strong>Posible emergencia:</strong> {solicitud.banderasRojas.join(", ")}.
          </div>
        )}

        <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          <span className="va-etiqueta" style={{ color: "var(--muted)", display: "block", marginBottom: 2 }}>
            Motivo
          </span>
          {solicitud.motivoConsulta}
        </div>

        {solicitud.vetEnConsulta && (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
            Estás en una consulta. Si aceptás, esta persona queda esperando que termines y la atendés después.
          </p>
        )}

        {error && (
          <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 10 }} role="alert">
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="va-boton" onClick={onAceptar} disabled={ocupado} style={{ flex: 1 }}>
            {respondiendo === "aceptar" ? "Un momento…" : "Aceptar"}
          </button>
          <button
            type="button"
            className="va-boton va-boton-ghost"
            onClick={onRechazar}
            disabled={ocupado}
            style={{ flex: 1 }}
          >
            {respondiendo === "rechazar" ? "Un momento…" : "Rechazar"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0", textAlign: "center" }}>
          Si no respondés a tiempo, la persona elige a otro veterinario.
        </p>
      </div>
    </div>
  );
}
