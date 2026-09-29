"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiPatch, ApiError } from "../../lib/api";
import { useSesionCliente } from "../../lib/sesion";
import { Onboarding } from "../../components/Onboarding";

export default function PanelPage() {
  const router = useRouter();
  const { sesion, actualizarOnboarding, cerrarSesion } = useSesionCliente();
  const [enviandoOnboarding, setEnviandoOnboarding] = useState(false);

  // sesion === undefined: todavía no se leyó localStorage (primer render).
  // sesion === null: se leyó y no hay nadie logueado -> a /ingresar.
  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
  }, [sesion, router]);

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
      <div className="va-logo" style={{ fontSize: 18, marginBottom: 28 }}>
        Videollamada Animal
      </div>

      <h1 className="va-titular" style={{ fontSize: 24, marginBottom: 10 }}>
        ¿Qué necesitás hoy?
      </h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 28 }}>
        Contanos qué le pasa a tu mascota y te conectamos con un veterinario matriculado.
      </p>

      <Link href="/intake" className="va-boton" style={{ textDecoration: "none", display: "block" }}>
        Iniciar una consulta
      </Link>

      <button
        type="button"
        onClick={cerrarSesion}
        style={{ background: "none", border: "none", opacity: 0.5, fontSize: 13, marginTop: 24, cursor: "pointer" }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
