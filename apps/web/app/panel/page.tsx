"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CasoParaCliente } from "@vet-teletriage/types";
import { apiGet, apiPatch, ApiError } from "../../lib/api";
import { useSesionCliente } from "../../lib/sesion";
import { Onboarding } from "../../components/Onboarding";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Copy desde el punto de vista del CLIENTE — mismos estados que ve el
// veterinario, pero con otras palabras (Sergio, 2026-09-29: cerrar el
// circuito de calificación, que hasta ahora no tenía ninguna pantalla).
const ETIQUETA_ESTADO: Record<string, string> = {
  INTAKE: "Elegí un veterinario para continuar",
  BANDERA_ROJA_MOSTRADA: "Elegí un veterinario para continuar",
  ASIGNADO: "Esperando que el veterinario inicie",
  EN_SESION: "En sesión ahora",
  CERRADO: "Asesoramiento finalizado",
  CANCELADO_FALLA_PLATAFORMA: "Cancelado",
};

export default function PanelPage() {
  const router = useRouter();
  const { sesion, actualizarOnboarding, cerrarSesion } = useSesionCliente();
  const [enviandoOnboarding, setEnviandoOnboarding] = useState(false);

  const [casos, setCasos] = useState<CasoParaCliente[] | null>(null);
  const [cargandoCasos, setCargandoCasos] = useState(false);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

  const cargarCasos = useCallback(async () => {
    if (!sesion || !sesion.onboardingCompletado) return;
    setCargandoCasos(true);
    setErrorCasos(null);
    try {
      const datos = await apiGet<CasoParaCliente[]>("/casos/mios-cliente", sesion.accessToken);
      setCasos(datos);
    } catch (e) {
      setErrorCasos(e instanceof ApiError ? e.message : "No pudimos cargar tus asesoramientos. Probá de nuevo.");
    } finally {
      setCargandoCasos(false);
    }
  }, [sesion]);

  useEffect(() => {
    cargarCasos();
  }, [cargarCasos]);

  async function terminarOnboarding() {
    if (!sesion) return;
    setEnviandoOnboarding(true);
    try {
      await apiPatch("/auth/onboarding-completado", sesion.accessToken);
    } catch (e) {
      // Si falla la llamada (red caída, token vencido), no dejamos al
      // usuario trabado en el onboarding — lo dejamos pasar igual y el
      // flag se intentará de nuevo la próxima vez que lo veamos en false.
      console.error("No se pudo registrar el onboarding en el servidor", e instanceof ApiError ? e.message : e);
    } finally {
      actualizarOnboarding(true);
      setEnviandoOnboarding(false);
    }
  }

  if (!sesion) {
    // undefined (cargando) o null (ya redirigiendo) — no hay nada útil que mostrar.
    return null;
  }

  if (!sesion.onboardingCompletado) {
    return <Onboarding onTerminar={terminarOnboarding} enviando={enviandoOnboarding} />;
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "40px 22px", textAlign: "center" }}>
      <Logo size="md" marginBottom={28} />

      <h1 className="va-titular" style={{ fontSize: 24, marginBottom: 10 }}>
        ¿Qué necesitás hoy?
      </h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 28 }}>
        Contanos qué le pasa a tu mascota y te conectamos con un veterinario matriculado.
      </p>

      <Link href="/intake" className="va-boton" style={{ textDecoration: "none", display: "block" }}>
        Iniciar un asesoramiento
      </Link>

      <button
        type="button"
        onClick={cerrarSesion}
        style={{ background: "none", border: "none", opacity: 0.5, fontSize: 13, marginTop: 24, marginBottom: 8, cursor: "pointer" }}
      >
        Cerrar sesión
      </button>

      <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 24, marginBottom: 10, textAlign: "left" }}>
        Mis asesoramientos
      </h2>

      {cargandoCasos && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {errorCasos && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorCasos}
        </p>
      )}
      {!cargandoCasos && casos && casos.length === 0 && (
        <p style={{ fontSize: 13, opacity: 0.55, textAlign: "left" }}>Todavía no iniciaste ningún asesoramiento.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {casos?.map((caso) => (
          <div
            key={caso.id}
            style={{
              border: "1px solid rgba(64,53,47,0.15)",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <strong style={{ fontSize: 14 }}>{caso.intake.especie}</strong>
              <span style={{ fontSize: 11, opacity: 0.55 }}>{FORMATO_FECHA.format(new Date(caso.creadoEl))}</span>
            </div>
            <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 6px" }}>
              {ETIQUETA_ESTADO[caso.estado] ?? caso.estado}
              {caso.veterinario && (
                <>
                  {" "}
                  · {caso.veterinario.nombre} {caso.veterinario.apellido}
                </>
              )}
            </p>

            {(caso.estado === "INTAKE" || caso.estado === "BANDERA_ROJA_MOSTRADA") && (
              <Link
                href={`/elegir-veterinario/${caso.id}`}
                className="va-boton"
                style={{ width: "auto", padding: "6px 14px", fontSize: 13, textDecoration: "none", display: "inline-block" }}
              >
                Elegir veterinario
              </Link>
            )}

            {caso.estado === "EN_SESION" &&
              (caso.salaVideoUrl ? (
                <a
                  href={caso.salaVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="va-boton"
                  style={{ width: "auto", padding: "6px 14px", fontSize: 13, textDecoration: "none", display: "inline-block" }}
                >
                  Entrar a la videollamada
                </a>
              ) : (
                <span style={{ fontSize: 12, opacity: 0.55 }}>
                  Tu veterinario te va a contactar por WhatsApp para la videollamada.
                </span>
              ))}

            {caso.estado === "CERRADO" && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                {!caso.yaCalificado ? (
                  <Link
                    href={`/calificar/${caso.id}`}
                    className="va-boton"
                    style={{ width: "auto", padding: "6px 14px", fontSize: 13, textDecoration: "none", display: "inline-block" }}
                  >
                    Calificar asesoramiento
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.55 }}>Ya lo calificaste — gracias</span>
                )}

                {!caso.disputaCalidad ? (
                  <Link href={`/reportar-problema/${caso.id}`} style={{ fontSize: 12, opacity: 0.55, textDecoration: "underline" }}>
                    ¿Hubo un problema? Reportalo
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.55 }}>
                    {caso.disputaCalidad.estado === "RESUELTA" ? "Reporte resuelto" : "Reporte en revisión"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <LegalFooter />
    </main>
  );
}
