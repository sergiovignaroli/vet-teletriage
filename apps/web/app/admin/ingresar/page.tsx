"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "../../../lib/api";
import { useSesionAdmin } from "../../../lib/sesion-admin";
import { Logo } from "../../../components/Logo";
import { LegalFooter } from "../../../components/LegalFooter";

interface RespuestaLoginAdmin {
  accessToken: string;
  rol: "ADMIN";
}

export default function IngresarAdminPage() {
  const router = useRouter();
  const { guardar } = useSesionAdmin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar() {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await apiPost<RespuestaLoginAdmin>("/auth/admin/login", { email, password });
      guardar({ accessToken: respuesta.accessToken });
      router.push("/admin");
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
      <Logo tagline="Administración" />

      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
        Panel de administración
      </h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
        Acceso restringido a staff.
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

      <LegalFooter />
    </main>
  );
}
