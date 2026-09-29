"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { VeterinarioParaElegir } from "@vet-teletriage/types";
import { apiGet, apiPatch, ApiError } from "../../../lib/api";
import { useSesionCliente } from "../../../lib/sesion";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

// Pantalla que reemplaza al viejo "te vamos a contactar por WhatsApp"
// (2026-09-28): ahora el cliente ve el costo total de cada veterinario
// conectado ANTES de contratar, y elige — el precio que ve acá es
// exactamente el que va a pagar, no una estimación (Sergio, 2026-09-29).
export default function ElegirVeterinarioPage() {
  const router = useRouter();
  const params = useParams<{ casoId: string }>();
  const casoId = params.casoId;
  const { sesion } = useSesionCliente();

  const [veterinarios, setVeterinarios] = useState<VeterinarioParaElegir[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [asignado, setAsignado] = useState(false);

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  useEffect(() => {
    if (!sesion || !casoId) return;
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await apiGet<VeterinarioParaElegir[]>(`/casos/${casoId}/para-elegir`, sesion!.accessToken);
        if (!cancelado) setVeterinarios(datos);
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No pudimos cargar la lista de veterinarios. Probá de nuevo.",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [sesion, casoId]);

  async function elegir(veterinarioId: string) {
    if (!sesion) return;
    setError(null);
    setEligiendo(veterinarioId);
    try {
      await apiPatch(`/casos/${casoId}/asignar`, sesion.accessToken, { veterinarioId });
      setAsignado(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos asignarte ese veterinario. Puede que se haya desconectado — probá con otro.",
      );
      // Puede haberse desconectado justo ahora — refrescamos la lista para
      // no dejar al cliente eligiendo a alguien que ya no está.
      if (sesion) {
        apiGet<VeterinarioParaElegir[]>(`/casos/${casoId}/para-elegir`, sesion.accessToken)
          .then(setVeterinarios)
          .catch(() => {});
      }
    } finally {
      setEligiendo(null);
    }
  }

  if (!sesion) return null;

  if (asignado) {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 22px", textAlign: "center" }}>
        <Logo size="md" marginBottom={28} />
        <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 10 }}>
          Listo, ya está asignado
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 24 }}>
          Te vamos a avisar por WhatsApp apenas el veterinario inicie la videollamada.
        </p>
        <a href="/panel" className="va-boton" style={{ textDecoration: "none" }}>
          Volver al inicio
        </a>

        <LegalFooter />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Elegí quién te atiende
      </h1>
      <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 20 }}>
        El precio que ves es el total que vas a pagar — ya incluye el cargo de plataforma.
      </p>

      {cargando && <p style={{ fontSize: 14, opacity: 0.6 }}>Buscando veterinarios conectados…</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}
      {!cargando && veterinarios && veterinarios.length === 0 && (
        <div
          style={{
            background: "rgba(122, 139, 104, 0.12)",
            borderRadius: 14,
            padding: "16px",
            fontSize: 14,
          }}
        >
          No hay ningún veterinario conectado en este momento. Tu consulta queda registrada — te avisamos por
          WhatsApp apenas se conecte alguno.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {veterinarios?.map((v) => (
          <div
            key={v.id}
            style={{
              border: "1px solid rgba(64,53,47,0.15)",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {v.nombre} {v.apellido}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                {v.ratingPromedio != null
                  ? `★ ${v.ratingPromedio.toFixed(1)} (${v.cantidadCalificaciones})`
                  : "Sin calificaciones todavía"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6 }}>${v.costoTotal}</div>
            </div>
            <button
              type="button"
              className="va-boton"
              style={{ width: "auto", padding: "0 18px" }}
              onClick={() => elegir(v.id)}
              disabled={eligiendo === v.id}
            >
              {eligiendo === v.id ? "…" : "Elegir"}
            </button>
          </div>
        ))}
      </div>

      <LegalFooter />
    </main>
  );
}
