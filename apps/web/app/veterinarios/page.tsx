"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "../../lib/api";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { Avatar, Calificacion } from "../../components/Veterinario";

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
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Nuestros veterinarios
      </h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0, marginBottom: 24 }}>
        Todos matriculados y verificados. El rating es de dueños reales, después de cada asesoramiento.
      </p>

      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {!error && veterinarios === null && <p style={{ fontSize: 14, opacity: 0.75 }}>Cargando…</p>}
      {veterinarios && veterinarios.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.75 }}>
          Todavía no tenemos veterinarios habilitados para mostrar acá — pero ya podés iniciar un asesoramiento
          y te conectamos apenas haya uno disponible.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {veterinarios?.map((v) => (
          <div
            key={v.id}
            className="va-tarjeta"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <Avatar nombre={v.nombre} apellido={v.apellido} size={46} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {v.nombre} {v.apellido}
              </div>
              <div style={{ marginTop: 3 }}>
                <Calificacion promedio={v.ratingPromedio} cantidad={v.cantidadCalificaciones} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/intake"
        className="va-boton"
        style={{ marginTop: 28, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}
      >
        Hablar con un veterinario
      </Link>

      <LegalFooter />
    </main>
  );
}
