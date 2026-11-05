"use client";

import Link from "next/link";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      await apiPost("/auth/veterinario/recuperar-contrasena", { email: email.trim() });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos procesar el pedido. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla titulo="Recuperar contraseña" variante="terracota" ancho={420} volver="/ingresar-veterinario" centrar>
      <MarcaGrande detalle="Panel de veterinarios" />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
        ¿Olvidaste tu contraseña?
      </h1>

      {enviado ? (
        <div role="status">
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Si ese email corresponde a una cuenta, te mandamos un enlace para elegir una contraseña nueva. Revisá también la carpeta de spam. El enlace vale 1 hora.
          </p>
          <Link href="/ingresar-veterinario" className="va-boton" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
            Volver a ingresar
          </Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
            Escribí el email con el que te registraste y te mandamos un enlace para crear una nueva.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <input
              className="va-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: 14 }}
              autoComplete="email"
            />
            {error && (
              <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="va-boton" disabled={cargando || !email.trim()}>
              {cargando ? "Enviando…" : "Enviarme el enlace"}
            </button>
          </form>
          <Link
            href="/recuperar-usuario"
            style={{ display: "block", fontSize: 13.5, color: "var(--esmeralda)", marginTop: 22, textDecoration: "underline", fontWeight: 700 }}
          >
            ¿No te acordás con qué email te registraste?
          </Link>
        </>
      )}
    </Pantalla>
  );
}
