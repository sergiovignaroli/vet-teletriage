"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { useSesionCliente } from "../../lib/sesion";

type Etapa = "telefono" | "codigo";

interface RespuestaOtpVerificado {
  accessToken: string;
  rol: "CLIENTE";
  clienteId: string;
  onboardingCompletado: boolean;
}

export default function IngresarPage() {
  const router = useRouter();
  const { guardar } = useSesionCliente();

  const [etapa, setEtapa] = useState<Etapa>("telefono");
  const [telefono, setTelefono] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedirCodigo() {
    setError(null);
    setCargando(true);
    try {
      await apiPost("/auth/cliente/otp/solicitar", { telefono });
      setEtapa("codigo");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos enviar el código. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function verificarCodigo() {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await apiPost<RespuestaOtpVerificado>("/auth/cliente/otp/verificar", {
        telefono,
        codigo,
      });
      guardar({
        accessToken: respuesta.accessToken,
        clienteId: respuesta.clienteId,
        onboardingCompletado: respuesta.onboardingCompletado,
      });
      router.push("/panel");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos verificar el código. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", textAlign: "center" }}>
      <div className="va-logo" style={{ fontSize: 20, marginBottom: 6 }}>
        Videollamada Animal
      </div>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 800, marginBottom: 40 }}>
        Teleasesoramiento veterinario
      </div>

      {etapa === "telefono" ? (
        <>
          <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
            Ingresá tu teléfono
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
            Te mandamos un código por WhatsApp. Sin contraseñas.
          </p>
          <input
            className="va-input"
            type="tel"
            placeholder="+54 9 341 ..."
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            style={{ marginBottom: 14 }}
          />
          {error && <p style={{ color: "var(--terracota)", fontSize: 13 }}>{error}</p>}
          <button type="button" className="va-boton" onClick={pedirCodigo} disabled={cargando || telefono.length < 8}>
            {cargando ? "Enviando…" : "Recibir código"}
          </button>
        </>
      ) : (
        <>
          <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 8 }}>
            Te escribimos por WhatsApp
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 24 }}>
            Ingresá el código de 6 dígitos que te llegó a {telefono}.
          </p>
          <input
            className="va-input"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={{ marginBottom: 14, textAlign: "center", letterSpacing: "0.3em", fontSize: 20 }}
          />
          {error && <p style={{ color: "var(--terracota)", fontSize: 13 }}>{error}</p>}
          <button type="button" className="va-boton" onClick={verificarCodigo} disabled={cargando || codigo.length !== 6}>
            {cargando ? "Verificando…" : "Ingresar"}
          </button>
          <button
            type="button"
            onClick={() => setEtapa("telefono")}
            style={{ background: "none", border: "none", opacity: 0.6, fontSize: 13, marginTop: 14, cursor: "pointer" }}
          >
            Cambiar número
          </button>
        </>
      )}

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 32, textDecoration: "underline" }}
      >
        ¿Sos veterinario? Ingresá acá
      </Link>
    </main>
  );
}
