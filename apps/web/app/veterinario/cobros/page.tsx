"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, ApiError } from "../../../lib/api";
import { useSesionVeterinario } from "../../../lib/sesion-veterinario";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

// Situación probable, la segunda más grande de la revisión de 2026-09-29
// (después de /registrar-veterinario): pagos.service.ts ya tenía toda la
// conexión OAuth de Mercado Pago escrita y verificada contra la doc
// oficial (Split 1:1 — cada veterinario conecta SU cuenta antes de poder
// cobrar), pero ningún botón de apps/web la llamaba nunca, y el callback
// del backend redirige codificado a esta ruta exacta
// (`${WEB_APP_URL}/veterinario/cobros?mercadopago=conectado`) — sin esta
// pantalla, ese redirect caía en un 404. Sin esto, NINGÚN veterinario
// tenía forma de conectar su cuenta y cobrar, aunque todo lo demás
// funcionara perfecto.
//
// Si MERCADOPAGO_APP_ID/CLIENT_SECRET/OAUTH_REDIRECT_URI no están
// configurados en el backend todavía (ver README), el botón "Conectar" va
// a mostrar un error inline como cualquier otra pantalla — no hace falta
// nada especial acá, el patrón de error ya es el mismo de siempre.
export default function CobrosVeterinarioPage() {
  // useSearchParams exige un límite de Suspense para el prerender estático
  // de Next — sin esto, `next build` falla derecho (probado: rompía el
  // build antes de este wrapper).
  return (
    <Suspense fallback={null}>
      <CobrosVeterinarioContenido />
    </Suspense>
  );
}

function CobrosVeterinarioContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sesion } = useSesionVeterinario();

  const [estado, setEstado] = useState<{ medioDeCobro: string; mercadoPagoConectado: boolean } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reciénConectado = searchParams.get("mercadopago") === "conectado";

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar-veterinario");
  }, [sesion, router]);

  const cargarEstado = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await apiGet<{ medioDeCobro: string; mercadoPagoConectado: boolean }>(
        "/veterinarios/mi-cobro",
        sesion.accessToken,
      );
      setEstado(datos);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar tu estado de cobro. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [sesion]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  async function conectarMercadoPago() {
    if (!sesion) return;
    setError(null);
    setConectando(true);
    try {
      const { url } = await apiGet<{ url: string }>("/pagos/mercadopago/oauth/iniciar", sesion.accessToken);
      window.location.href = url;
    } catch {
      // A diferencia del resto de la app, acá NO mostramos e.message: si
      // MERCADOPAGO_APP_ID/CLIENT_SECRET no están configurados, el backend
      // tira un Error crudo (requerirEnv en mercadopago-oauth.util.ts), no
      // una excepción con mensaje pensado para el usuario — sin un filtro
      // de excepciones global, eso le llega al cliente como el genérico
      // "Internal server error" de Nest, que no le dice nada útil a un
      // veterinario. Mejor un mensaje propio que cubra el caso real.
      setError("No pudimos iniciar la conexión con Mercado Pago. Puede que todavía no esté configurada — probá más tarde.");
      setConectando(false);
    }
  }

  if (!sesion) return null;

  const conectado = reciénConectado || estado?.mercadoPagoConectado;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Medios de cobro
      </h1>
      <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 24 }}>
        Conectá tu propia cuenta de Mercado Pago para poder cobrar tu honorario directamente — la plataforma
        nunca ve ni guarda tu contraseña, solo un permiso de acceso que Mercado Pago emite.
      </p>

      {cargando && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13, marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      {!cargando && (
        <div
          style={{
            border: "1px solid rgba(64,53,47,0.15)",
            borderRadius: 14,
            padding: 16,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: conectado ? "var(--oliva)" : "rgba(64,53,47,0.3)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {conectado ? "Mercado Pago conectado" : "Mercado Pago sin conectar"}
            </span>
          </div>
          {conectado ? (
            <p style={{ fontSize: 13, opacity: 0.65, margin: 0 }}>
              Ya podés recibir pagos por tus asesoramientos. Si necesitás reconectar la cuenta (por ejemplo, si
              cambiaste de titular), podés volver a hacerlo cuando quieras.
            </p>
          ) : (
            <p style={{ fontSize: 13, opacity: 0.65, margin: "0 0 12px" }}>
              Todavía no cobrás por acá — sin esto, no vas a poder recibir el pago de tus asesoramientos.
            </p>
          )}
          <button
            type="button"
            className={conectado ? "va-boton va-boton-ghost" : "va-boton"}
            style={{ width: "auto", padding: "0 18px", marginTop: 10 }}
            onClick={conectarMercadoPago}
            disabled={conectando}
          >
            {conectando ? "Redirigiendo…" : conectado ? "Reconectar cuenta" : "Conectar mi cuenta de Mercado Pago"}
          </button>
        </div>
      )}

      <LegalFooter />
    </main>
  );
}
