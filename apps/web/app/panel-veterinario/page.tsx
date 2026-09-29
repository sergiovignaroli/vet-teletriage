"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CasoParaVeterinario } from "@vet-teletriage/types";
import { hayBanderaRoja, MARGEN_PORCENTAJE_MAX, MARGEN_PORCENTAJE_MIN } from "@vet-teletriage/types";
import { apiGet, apiPatch, ApiError } from "../../lib/api";
import { useSesionVeterinario } from "../../lib/sesion-veterinario";
import { Onboarding } from "../../components/Onboarding";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ETIQUETA_ESTADO: Record<string, string> = {
  INTAKE: "Nuevo",
  BANDERA_ROJA_MOSTRADA: "Nuevo — posible emergencia",
  ASIGNADO: "Te eligieron — esperando que arranques",
  EN_SESION: "En sesión",
  CERRADO: "Cerrado",
  CANCELADO_FALLA_PLATAFORMA: "Cancelado",
};

export default function PanelVeterinarioPage() {
  const router = useRouter();
  const { sesion, actualizarOnboarding, actualizarDisponible, actualizarMargen, cerrarSesion } =
    useSesionVeterinario();
  const [enviandoOnboarding, setEnviandoOnboarding] = useState(false);
  const [cambiandoConexion, setCambiandoConexion] = useState(false);
  const [errorConexion, setErrorConexion] = useState<string | null>(null);

  const [casos, setCasos] = useState<CasoParaVeterinario[] | null>(null);
  const [cargandoCasos, setCargandoCasos] = useState(false);
  const [errorCasos, setErrorCasos] = useState<string | null>(null);

  const [margenTexto, setMargenTexto] = useState("0");
  const [guardandoMargen, setGuardandoMargen] = useState(false);
  const [errorMargen, setErrorMargen] = useState<string | null>(null);

  const [iniciando, setIniciando] = useState<string | null>(null);
  const [errorIniciar, setErrorIniciar] = useState<string | null>(null);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar-veterinario.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar-veterinario");
  }, [sesion, router]);

  useEffect(() => {
    if (sesion) setMargenTexto(String(sesion.margenPorcentaje));
  }, [sesion?.margenPorcentaje]);

  const cargarCasos = useCallback(async () => {
    if (!sesion) return;
    setCargandoCasos(true);
    setErrorCasos(null);
    try {
      const datos = await apiGet<CasoParaVeterinario[]>("/casos/mios", sesion.accessToken);
      setCasos(datos);
    } catch (e) {
      setErrorCasos(e instanceof ApiError ? e.message : "No pudimos cargar los casos. Probá de nuevo.");
    } finally {
      setCargandoCasos(false);
    }
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !sesion.onboardingCompletado) return;
    cargarCasos();
  }, [sesion, cargarCasos]);

  async function alternarConexion() {
    if (!sesion) return;
    setErrorConexion(null);
    setCambiandoConexion(true);
    const conectando = !sesion.disponible;
    try {
      await apiPatch(conectando ? "/veterinarios/conectar" : "/veterinarios/desconectar", sesion.accessToken);
      actualizarDisponible(conectando);
    } catch (e) {
      setErrorConexion(e instanceof ApiError ? e.message : "No pudimos cambiar tu estado. Probá de nuevo.");
    } finally {
      setCambiandoConexion(false);
    }
  }

  async function guardarMargen() {
    if (!sesion) return;
    const margenPorcentaje = Number(margenTexto);
    if (
      !Number.isFinite(margenPorcentaje) ||
      margenPorcentaje < MARGEN_PORCENTAJE_MIN ||
      margenPorcentaje > MARGEN_PORCENTAJE_MAX
    ) {
      setErrorMargen(`Tiene que estar entre ${MARGEN_PORCENTAJE_MIN}% y ${MARGEN_PORCENTAJE_MAX}%`);
      return;
    }
    setErrorMargen(null);
    setGuardandoMargen(true);
    try {
      await apiPatch("/veterinarios/margen", sesion.accessToken, { margenPorcentaje });
      actualizarMargen(margenPorcentaje);
    } catch (e) {
      setErrorMargen(e instanceof ApiError ? e.message : "No pudimos guardar el margen. Probá de nuevo.");
    } finally {
      setGuardandoMargen(false);
    }
  }

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

  async function iniciarCaso(casoId: string) {
    if (!sesion) return;
    setErrorIniciar(null);
    setIniciando(casoId);
    try {
      await apiPatch(`/casos/${casoId}/iniciar`, sesion.accessToken);
      setCasos(
        (prev) => prev?.map((c) => (c.id === casoId ? { ...c, estado: "EN_SESION" as const } : c)) ?? prev,
      );
    } catch (e) {
      setErrorIniciar(e instanceof ApiError ? e.message : "No pudimos iniciar el caso. Probá de nuevo.");
    } finally {
      setIniciando(null);
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
      {/* La marca siempre centrada (pedido explícito de Sergio, 2026-09-29),
          aunque este panel necesite además un link de "Cerrar sesión" —
          por eso va en una esquina, no compitiendo por el centro con el logo. */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <button
          type="button"
          onClick={cerrarSesion}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "none",
            border: "none",
            opacity: 0.5,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
        <Logo size="sm" marginBottom={0} />
      </div>

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4, textAlign: "center" }}>
        Hola, {sesion.nombre}
      </h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginTop: 0, marginBottom: 16, textAlign: "center" }}>
        Estado de tu cuenta: {sesion.estado}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid rgba(64,53,47,0.15)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 12,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: sesion.disponible ? "var(--oliva)" : "rgba(64,53,47,0.3)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{sesion.disponible ? "Conectado" : "Desconectado"}</span>
        </div>
        <button
          type="button"
          className={sesion.disponible ? "va-boton va-boton-ghost" : "va-boton"}
          style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}
          onClick={alternarConexion}
          disabled={cambiandoConexion || (!sesion.disponible && sesion.estado !== "HABILITADO")}
        >
          {cambiandoConexion ? "Un momento…" : sesion.disponible ? "Desconectarme" : "Conectarme"}
        </button>
      </div>
      {!sesion.disponible && sesion.estado !== "HABILITADO" && (
        <p style={{ fontSize: 12, color: "var(--terracota)", marginTop: -6, marginBottom: 16 }}>
          Todavía no podés conectarte — tu cuenta no está habilitada.
        </p>
      )}
      {errorConexion && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorConexion}
        </p>
      )}

      {/* Mientras estás conectado, los clientes te ven en la lista con este
          margen ya aplicado sobre el precio base de cada caso — por eso no
          hace falta declarar honorario caso por caso, como antes. */}
      <div
        style={{
          border: "1px solid rgba(64,53,47,0.15)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 24,
          background: "#fff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tu margen sobre el precio base</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="va-input"
            type="number"
            inputMode="numeric"
            value={margenTexto}
            onChange={(e) => setMargenTexto(e.target.value)}
            min={MARGEN_PORCENTAJE_MIN}
            max={MARGEN_PORCENTAJE_MAX}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 14, opacity: 0.6 }}>%</span>
          <button
            type="button"
            className="va-boton"
            style={{ width: "auto", padding: "0 16px" }}
            onClick={guardarMargen}
            disabled={guardandoMargen || Number(margenTexto) === sesion.margenPorcentaje}
          >
            {guardandoMargen ? "…" : "Guardar"}
          </button>
        </div>
        <p style={{ fontSize: 11, opacity: 0.55, margin: "6px 0 0" }}>
          Entre {MARGEN_PORCENTAJE_MIN}% y {MARGEN_PORCENTAJE_MAX}% sobre la base de cada caso — el cliente ve el
          total ya calculado con esto antes de elegirte.
        </p>
        {errorMargen && (
          <p style={{ color: "var(--terracota)", fontSize: 12, marginTop: 6 }} role="alert">
            {errorMargen}
          </p>
        )}
      </div>

      <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginBottom: 10 }}>Mis casos</h2>

      {cargandoCasos && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {errorCasos && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorCasos}
        </p>
      )}
      {errorIniciar && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {errorIniciar}
        </p>
      )}
      {!cargandoCasos && casos && casos.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Todavía nadie te eligió. Mientras estés conectado, vas a aparecer en la lista que ve el cliente al
          terminar su consulta.
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
              {ETIQUETA_ESTADO[caso.estado] ?? caso.estado} · Franja {caso.franjaHoraria.toLowerCase()}
              {caso.honorarioDeclarado != null && <> · Tu honorario: ${caso.honorarioDeclarado}</>}
            </p>

            {caso.estado === "ASIGNADO" && (
              <button
                type="button"
                className="va-boton"
                style={{ width: "auto", padding: "0 18px" }}
                onClick={() => iniciarCaso(caso.id)}
                disabled={iniciando === caso.id}
              >
                {iniciando === caso.id ? "Iniciando…" : "Iniciar videollamada"}
              </button>
            )}
          </div>
        ))}
      </div>

      <LegalFooter />
    </main>
  );
}
