"use client";

import Link from "next/link";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";

export default function RecuperarUsuarioPage() {
  const [dni, setDni] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cargando, setCargando] = useState(false);
  const [emailParcial, setEmailParcial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setError(null);
    setCargando(true);
    try {
      const r = await apiPost<{ emailParcial: string }>("/auth/veterinario/recordar-usuario", {
        dniONumero: dni,
        matriculaNumero: matricula,
      });
      setEmailParcial(r.emailParcial);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos procesar el pedido. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Pantalla titulo="Recuperar usuario" variante="terracota" ancho={420} volver="/ingresar-veterinario" centrar>
      <MarcaGrande detalle="Panel de veterinarios" />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
        ¿Olvidaste tu usuario?
      </h1>

      {emailParcial ? (
        <div role="status">
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Tu usuario es el email con el que te registraste. Por seguridad te lo mostramos parcialmente:
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.3, wordBreak: "break-all" }}>{emailParcial}</p>
          <Link href="/ingresar-veterinario" className="va-boton" style={{ display: "block", textAlign: "center", marginTop: 18 }}>
            Ir a ingresar
          </Link>
          <Link
            href="/recuperar-contrasena"
            style={{ display: "block", fontSize: 13.5, color: "var(--esmeralda)", marginTop: 18, textDecoration: "underline", fontWeight: 700 }}
          >
            También olvidé la contraseña
          </Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
            Tu usuario es el email con el que te registraste. Para recordarlo, escribí el DNI y el número de matrícula que cargaste en el registro.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscar();
            }}
          >
            <input
              className="va-input"
              placeholder="DNI o número de documento"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              style={{ marginBottom: 12 }}
              inputMode="text"
              autoComplete="off"
            />
            <input
              className="va-input"
              placeholder="Número de matrícula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              style={{ marginBottom: 14 }}
              autoComplete="off"
            />
            {error && (
              <p style={{ color: "var(--terracota)", fontSize: 13 }} role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="va-boton" disabled={cargando || !dni.trim() || !matricula.trim()}>
              {cargando ? "Buscando…" : "Recordar mi usuario"}
            </button>
          </form>
        </>
      )}
    </Pantalla>
  );
}
