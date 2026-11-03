"use client";

import { useEffect, useState } from "react";
import type { SolicitudParaVeterinario } from "@vet-teletriage/types";
import { nombreDeEspecie, POSTERGAR_OPCIONES_MINUTOS } from "@vet-teletriage/types";

// Ventana emergente de "te están pidiendo una consulta" (Sergio, 2026-10-27).
// Solo muestra contexto clínico: nunca datos de contacto de la persona.
export function VentanaSolicitud({
  solicitud,
  respondiendo,
  error,
  onAceptar,
  onRechazar,
  onPostergar,
}: {
  solicitud: SolicitudParaVeterinario;
  respondiendo: "aceptar" | "rechazar" | "postergar" | null;
  error: string | null;
  onAceptar: () => void;
  onRechazar: () => void;
  onPostergar: (minutos: number) => void;
}) {
  const [segundos, setSegundos] = useState(0);
  const [eligiendoHorario, setEligiendoHorario] = useState(false);
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
    nombreDeEspecie(solicitud.especie),
    solicitud.raza,
    solicitud.edadAproximada,
    solicitud.pesoAproximadoKg != null ? `${solicitud.pesoAproximadoKg} kg` : null,
  ].filter(Boolean);

  const urgente = segundos <= 15;

  return (
    <div className="va-velo" style={{ zIndex: 1000 }}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="va-solicitud-titulo"
        aria-live="assertive"
        className="va-hoja"
        style={{ zIndex: 1001 }}
      >
        <div className="va-hoja-asa" aria-hidden="true" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="va-etiqueta" style={{ color: "var(--alerta)" }}>
            Nueva consulta
          </span>
          <span
            aria-label="Tiempo para responder"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: urgente ? "var(--alerta)" : "var(--profundo)",
              color: "#fff",
              fontFamily: '"Unbounded", sans-serif',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span className="va-punto" style={{ background: urgente ? "#fff" : "var(--menta)" }} />
            {mm}:{ss}
          </span>
        </div>
        <div
          aria-hidden
          style={{ height: 6, borderRadius: 3, background: "var(--card2)", overflow: "hidden", marginBottom: 16 }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (segundos / total) * 100)}%`,
              background: urgente ? "var(--alerta)" : "var(--esmeralda)",
              transition: "width 0.5s linear",
            }}
          />
        </div>

        <h2 id="va-solicitud-titulo" className="va-titular" style={{ fontSize: 20, margin: "0 0 6px" }}>
          Una persona quiere hablar con vos
        </h2>
        <p style={{ fontSize: 14, margin: "0 0 12px", color: "var(--muted)" }}>{datos.join(" · ")}</p>

        {solicitud.hayBanderaRoja && (
          <div
            style={{
              background: "var(--alerta-fondo)",
              border: "1px solid var(--alerta-borde)",
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 13.5,
            }}
          >
            <strong>Posible emergencia:</strong> {solicitud.banderasRojas.join(", ")}.
          </div>
        )}

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 14,
            padding: "12px 14px",
            background: "var(--card2)",
            borderRadius: 14,
          }}
        >
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
          <p style={{ color: "var(--alerta)", fontSize: 13, marginBottom: 10 }} role="alert">
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
        {/* Con una posible emergencia no se puede postergar (decisión de Sergio, 27/10/2026). */}
        {!solicitud.hayBanderaRoja && (
          <div style={{ marginTop: 12 }}>
            {!eligiendoHorario ? (
              <button
                type="button"
                className="va-chip-boton"
                onClick={() => setEligiendoHorario(true)}
                disabled={ocupado}
                style={{ width: "100%" }}
              >
                Postergar: atenderla más tarde
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px", textAlign: "center" }}>
                  Le proponemos a la persona atenderla en:
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {POSTERGAR_OPCIONES_MINUTOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="va-chip-boton"
                      disabled={ocupado}
                      onClick={() => onPostergar(m)}
                    >
                      {m < 60 ? `${m} min` : `${m / 60} h`}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEligiendoHorario(false)}
                  style={{ background: "none", border: "none", minHeight: 44, fontSize: 13, textDecoration: "underline", margin: "4px auto 0", display: "block", cursor: "pointer", color: "var(--texto)" }}
                >
                  Volver
                </button>
              </div>
            )}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 0", textAlign: "center" }}>
          Si no respondés a tiempo, la persona elige a otro veterinario.
        </p>
      </div>
    </div>
  );
}
