"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { useSesionVeterinario } from "../../lib/sesion-veterinario";

interface RespuestaLoginVeterinario {
  accessToken: string;
  veterinarioId: string;
  nombre: string;
  apellido: string;
  estado: string;
  onboardingCompletado: boolean;
}

export default function IngresarVeterinarioPage() {
  const router = useRouter();
  const { guardar } = useSesionVeterinario();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar() {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await apiPost<RespuestaLoginVeterinario>("/auth/veterinario/login", {
        email,
        password,
      });
      guardar({
        accessToken: respuesta.accessToken,
        veterinarioId: respuesta.veterinarioId,
        nombre: respuesta.nombre,
        apellido: respuesta.apellido,
        estado: respuesta.estado,
        onboardingCompletado: respuesta.onboardingCompletado,
      });
      router.push("/panel-veterinario");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 380,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 22px",
        textAlign: "center",
      }}
    >
      <div className="va-logo" style={{ fontSize: 20, marginBottom: 6 }}>
        Videollamada Animal
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent)",
          fontWeight: 800,
          marginBottom: 40,
        }}
      >
        Panel de veterinarios
      </div>

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
        Ingresá a tu cuenta
      </h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
        Con el email y la contraseña que usaste al registrarte.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ingresar();
        }}
      >
        <input
          className="va-input"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 12 }}
          autoComplete="email"
        />
        <input
          className="va-input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 14 }}
          autoComplete="current-password"
        />
        {error && (
          <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="va-boton" disabled={cargando || !email || !password}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <Link
        href="/ingresar"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 32, textDecoration: "underline" }}
      >
        ¿Sos dueño de una mascota? Ingresá acá
      </Link>
    </main>
  );
}
