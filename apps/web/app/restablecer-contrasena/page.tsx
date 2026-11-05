"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { CampoContrasena } from "../../components/CampoContrasena";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";

function Formulario() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const corta = password.length > 0 && password.length < 8;
  const distintas = confirmar.length > 0 && password !== confirmar;

  async function guardar() {
    setError(null);
    setCargando(true);
    try {
      await apiPost("/auth/veterinario/restablecer-contrasena", { token, password });
      setListo(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cambiar la contraseña. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div role="status">
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          Listo, cambiaste tu contraseña. Por seguridad cerramos las sesiones que tenías abiertas: ingresá de nuevo con la nueva.
        </p>
        <Link href="/ingresar-veterinario" className="va-boton" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
          Ir a ingresar
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <p style={{ fontSize: 14 }}>Este enlace está incompleto. Pedí uno nuevo desde la pantalla de ingreso.</p>
        <Link href="/recuperar-contrasena" className="va-boton" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 20 }}>Elegí una contraseña nueva (mínimo 8 caracteres).</p>
      <CampoContrasena placeholder="Contraseña nueva" value={password} onChange={setPassword} autoComplete="new-password" style={{ marginBottom: 12 }} />
      <CampoContrasena placeholder="Repetí la contraseña" value={confirmar} onChange={setConfirmar} autoComplete="new-password" style={{ marginBottom: 14 }} />
      {corta && <p style={{ color: "var(--terracota)", fontSize: 13 }}>Tiene que tener al menos 8 caracteres.</p>}
      {distintas && <p style={{ color: "var(--terracota)", fontSize: 13 }}>Las contraseñas no coinciden</p>}
      {error && (
        <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
          {error}{" "}
          <Link href="/recuperar-contrasena" style={{ textDecoration: "underline" }}>
            Pedir un enlace nuevo
          </Link>
        </p>
      )}
      <button type="submit" className="va-boton" disabled={cargando || password.length < 8 || password !== confirmar}>
        {cargando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Pantalla titulo="Nueva contraseña" variante="terracota" ancho={420} volver="/ingresar-veterinario" centrar>
      <MarcaGrande detalle="Panel de veterinarios" />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
        Nueva contraseña
      </h1>
      <Suspense fallback={null}>
        <Formulario />
      </Suspense>
    </Pantalla>
  );
}
