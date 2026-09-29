"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { useSesionCliente } from "../../lib/sesion";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

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

  // Situación probable (encontrada 2026-09-29, no pedida puntualmente): el
  // backend ya soporta pedir un código nuevo sin cambiar de número (cada
  // /otp/solicitar resetea vencimiento e intentos — ver auth.service.ts),
  // pero acá no había ningún botón que lo hiciera directo. Los mensajes de
  // error de "código vencido" o "demasiados intentos" literalmente dicen
  // "pedí un código nuevo" y antes de esto la única salida era adivinar que
  // "Cambiar número" también servía para eso. WhatsApp puede tardar o el
  // código vence a los 5 minutos — es un caso frecuente, no una rareza.
  async function reenviarCodigo() {
    setCodigo("");
    await pedirCodigo();
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
      <Logo tagline="Teleasesoramiento veterinario" />

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
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}>
            <button
              type="button"
              onClick={reenviarCodigo}
              disabled={cargando}
              style={{ background: "none", border: "none", opacity: 0.6, fontSize: 13, cursor: "pointer" }}
            >
              Pedir un código nuevo
            </button>
            <button
              type="button"
              onClick={() => setEtapa("telefono")}
              style={{ background: "none", border: "none", opacity: 0.6, fontSize: 13, cursor: "pointer" }}
            >
              Cambiar número
            </button>
          </div>
        </>
      )}

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 32, textDecoration: "underline" }}
      >
        ¿Sos veterinario? Ingresá acá
      </Link>

      <LegalFooter />
    </main>
  );
}
