"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CasoParaVeterinario } from "@vet-teletriage/types";
import { hayBanderaRoja } from "@vet-teletriage/types";
import { apiGet, apiPatch, ApiError } from "../../lib/api";
import { useSesionVeterinario } from "../../lib/sesion-veterinario";
import { Onboarding } from "../../components/Onboarding";

type Vista = "disponibles" | "mios";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ETIQUETA_ESTADO: Record<string, string> = {
  INTAKE: "Nuevo",
  BANDERA_ROJA_MOSTRADA: "Nuevo — posible emergencia",
  ASIGNADO: "Asignado",
  EN_SESION: "En sesión",
  CERRADO: "Cerrado",
  CANCELADO_FALLA_PLATAFORMA: "Cancelado",
};

export default function PanelVeterinarioPage() {
  const router = useRouter();
  const { sesion, actualizarOnboarding, cerrarSesion } = useSesionVeterinario();
  const [enviandoOnboarding, setEnviandoOnboarding] = useState(false);

  const [vista, setVista] = useState<Vista>("disponibles");
  const [casos, setCasos] = useState<CasoParaVeterinario[] | null>(null);
  const [cargandoCasos, setCargandoCasos] = useState(false);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);

  // Honorario que el veterinario está por declarar, por caso — solo tiene
  // sentido mientras el caso está en "disponibles" y no fue tomado todavía.
  const [honorarioPorCaso, setHonorarioPorCaso] = useState<Record<string, string>>({});
  const [tomando, setTomando] = useState<string | null>(null);
  const [errorTomar, setErrorTomar] = useState<string | null>(null);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar-veterinario.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar-veterinario");
  }, [sesion, router]);

  const cargarCasos = useCallback(
    async (destino: Vista) => {
      if (!sesion) return;
      setCargandoCasos(true);
      setErrorCasos(null);
      try {
        const ruta = destino === "disponibles" ? "/casos/disponibles" : "/casos/mios";
        const datos = await apiGet<CasoParaVeterinario[]>(ruta, sesion.accessToken);
        setCasos(datos);
      } catch (e) {
        setErrorCasos(e instanceof ApiError ? e.message : "No pudimos cargar los casos. Probá de nuevo.");
      } finally {
        setCargandoCasos(false);
      }
    },
    [sesion],
  );

  useEffect(() => {
    if (sesion && sesion.onboardingCompletado) cargarCasos(vista);
  }, [sesion, vista, cargarCasos]);

  async function terminarOnboarding() {
    if (!sesion) return;
    setEnviandoOnboarding(true);
    try {
      await apiPatch("/auth/onboarding-completado", sesion.accessToken);
    } catch (e) {
      // Si falla (red caída, token vencido), no dejamos al veterinario
      // trabado en el onboarding — el flag se reintenta la próxima vez.
      console.error("No se pudo registrar el onboarding en el servidor", e instanceof ApiError ? e.message : e);
    } finally {
      actualizarOnboarding(true);
      setEnviandoOnboarding(false);
    }
  }

  async function tomarCaso(casoId: string) {
    if (!sesion) return;
    const honorarioTexto = honorarioPorCaso[casoId];
    const honorarioDeclarado = Number(honorarioTexto);
    if (!honorarioTexto || Number.isNaN(honorarioDeclarado) || honorarioDeclarado <= 0) {
      setErrorTomar("Declará un honorario válido antes de tomar el caso.");
      return;
    }
    setErrorTomar(null);
    setTomando(casoId);
    try {
      await apiPatch(`/casos/${casoId}/iniciar`, sesion.accessToken, { honorarioDeclarado });
      // El caso ya no está "disponible" — lo sacamos de la lista actual y
      // dejamos que el veterinario lo vea en "Mis casos" si cambia de vista.
      setCasos((prev) => prev?.filter((c) => c.id !== casoId) ?? prev);
    } catch (e) {
      setErrorTomar(e instanceof ApiError ? e.message : "No pudimos tomar el caso. Puede que ya lo haya tomado otro veterinario.");
    } finally {
      setTomando(null);
    }
  }

  if (!sesion) {
    // undefined (cargando) o null (ya redirigiendo) — no hay nada útil que mostrar.
    return null;
  }

  if (!sesion.onboardingCompletado) {
    return <Onboarding variante="veterinario" onTerminar={terminarOnboarding} enviando={enviandoOnboarding} />;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div className="va-logo" style={{ fontSize: 16 }}>
          Videollamada Animal
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          style={{ background: "none", border: "none", opacity: 0.5, fontSize: 13, cursor: "pointer" }}
        >
          Cerrar sesión
        </button>
      </div>

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Hola, {sesion.nombre}
      </h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 0, marginBottom: 24 }}>
        Estado de tu cuenta: {sesion.estado}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          className={vista === "disponibles" ? "va-boton" : "va-boton va-boton-ghost"}
          style={{ width: "auto", padding: "10px 18px", fontSize: 14 }}
          onClick={() => setVista("disponibles")}
        >
          Casos disponibles
        </button>
        <button
          type="button"
          className={vista === "mios" ? "va-boton" : "va-boton va-boton-ghost"}
          style={{ width: "auto", padding: "10px 18px", fontSize: 14 }}
          onClick={() => setVista("mios")}
        >
          Mis casos
        </button>
      </div>

      {cargandoCasos && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {errorCasos && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorCasos}
        </p>
      )}
      {errorTomar && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorTomar}
        </p>
      )}

      {!cargandoCasos && casos && casos.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          {vista === "disponibles" ? "No hay casos esperando ahora mismo." : "Todavía no tomaste ningún caso."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {casos?.map((caso) => (
          <div
            key={caso.id}
            style={{
              border: "1px solid rgba(64,53,47,0.15)",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <strong style={{ fontSize: 15 }}>{caso.intake.especie}</strong>
              <span style={{ fontSize: 12, opacity: 0.6 }}>{FORMATO_FECHA.format(new Date(caso.creadoEl))}</span>
            </div>

            {hayBanderaRoja(caso.intake) && (
              <div
                style={{
                  display: "inline-block",
                  background: "#fdecea",
                  color: "#c0392b",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                Posible emergencia
              </div>
            )}

            <p style={{ fontSize: 14, margin: "0 0 10px", opacity: 0.85 }}>{caso.intake.motivoConsulta}</p>

            <p style={{ fontSize: 12, opacity: 0.6, margin: "0 0 10px" }}>
              {ETIQUETA_ESTADO[caso.estado] ?? caso.estado} · Franja {caso.franjaHoraria.toLowerCase()} · Cargo
              plataforma ${caso.cargoPlataforma}
              {caso.honorarioDeclarado != null && <> · Tu honorario: ${caso.honorarioDeclarado}</>}
            </p>

            {vista === "disponibles" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="va-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="Tu honorario ($)"
                  value={honorarioPorCaso[caso.id] ?? ""}
                  onChange={(e) => setHonorarioPorCaso((prev) => ({ ...prev, [caso.id]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="va-boton"
                  style={{ width: "auto", padding: "0 18px" }}
                  onClick={() => tomarCaso(caso.id)}
                  disabled={tomando === caso.id}
                >
                  {tomando === caso.id ? "Tomando…" : "Tomar caso"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
