"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "../../lib/api";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

interface VeterinarioDirectorio {
  id: string;
  nombre: string;
  apellido: string;
  ratingPromedio: number | null;
  cantidadCalificaciones: number;
}

// Directorio público (situación probable, 2026-09-29): GET
// /calificaciones/veterinario/:id/promedio ya era público desde antes —
// pensado, según su propio comentario, para "el directorio" — pero ese
// directorio nunca se construyó, así que nunca tuvo desde dónde mostrarse.
// Página sin login: "testimonios estilo google por estrellitas" (como lo
// describe el propio proyecto) tiene que poder verse ANTES de registrarse,
// no solo al elegir veterinario en medio de una consulta ya iniciada.
export default function DirectorioVeterinariosPage() {
  const [veterinarios, setVeterinarios] = useState<VeterinarioDirectorio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<VeterinarioDirectorio[]>("/veterinarios/directorio")
      .then((datos) => {
        if (!cancelado) setVeterinarios(datos);
      })
      .catch((e) => {
        if (!cancelado) {
          setError(e instanceof ApiError ? e.message : "No pudimos cargar el directorio. Probá de nuevo.");
        }
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Nuestros veterinarios
      </h1>
      <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 24 }}>
        Todos matriculados y verificados. El rating es de dueños reales, después de cada consulta.
      </p>

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {!error && veterinarios === null && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {veterinarios && veterinarios.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.55 }}>
          Todavía no tenemos veterinarios habilitados para mostrar acá — pero ya podés iniciar una consulta
          y te conectamos apenas haya uno disponible.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {veterinarios?.map((v) => (
          <div
            key={v.id}
            style={{
              border: "1px solid rgba(64,53,47,0.15)",
              borderRadius: 14,
              padding: "14px 16px",
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {v.nombre} {v.apellido}
            </span>
            <span style={{ fontSize: 13, opacity: 0.65 }}>
              {v.ratingPromedio != null
                ? `★ ${v.ratingPromedio.toFixed(1)} (${v.cantidadCalificaciones})`
                : "Sin calificaciones todavía"}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/intake"
        className="va-boton"
        style={{ marginTop: 24, textDecoration: "none", display: "block", textAlign: "center" }}
      >
        Empezar una consulta
      </Link>

      <LegalFooter />
    </main>
  );
}
