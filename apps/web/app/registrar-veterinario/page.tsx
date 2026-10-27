"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost, ApiError } from "../../lib/api";
import { useSesionVeterinario } from "../../lib/sesion-veterinario";
import { Logo } from "../../components/Logo";
import { Foto } from "../../components/Foto";
import { LegalFooter } from "../../components/LegalFooter";

// Situación probable, la más grande que se encontró en toda la revisión
// pantalla por pantalla del 2026-09-29: POST /auth/veterinario/registrar
// existía en el backend, completo, desde antes — pero NINGUNA pantalla de
// apps/web lo llamaba nunca. Un veterinario podía loguearse (/ingresar-
// veterinario) pero no había ninguna forma de crear la cuenta primero. Es
// el mismo patrón que calificación/disputa/cierre de caso (backend listo,
// pantalla faltante) pero acá es más grave: sin esto, nadie podía sumarse
// como colega — el corazón del negocio ("colegas se registran", según la
// descripción del proyecto).
//
// A propósito NO dispara automáticamente POST /identidad/iniciar acá — esa
// llamada requiere TRUORA_API_KEY/TRUORA_FLOW_ID configurados en el
// backend (ver README, "Credenciales reales de Truora sin configurar") y
// el flujo real de captura de documento/selfie del lado de Truora todavía
// no está confirmado contra su documentación viva (ver nota [Probable] en
// truora.util.ts). Mejor dejar al veterinario recién registrado en
// PENDIENTE_VERIFICACION, visible como excepción en el panel admin, que
// mandarlo a un botón que hoy tira un error 500 sin credenciales reales.
export default function RegistrarVeterinarioPage() {
  const router = useRouter();
  const { guardar } = useSesionVeterinario();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [dniONumero, setDniONumero] = useState("");
  const [matriculaNumero, setMatriculaNumero] = useState("");
  const [matriculaColegio, setMatriculaColegio] = useState("");
  const [matriculaVenceEl, setMatriculaVenceEl] = useState("");
  const [seguroAseguradora, setSeguroAseguradora] = useState("");
  const [seguroPoliza, setSeguroPoliza] = useState("");
  const [seguroVenceEl, setSeguroVenceEl] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsNoCoinciden = confirmarPassword.length > 0 && password !== confirmarPassword;

  const faltanCampos =
    !nombre ||
    !apellido ||
    !email ||
    !password ||
    password !== confirmarPassword ||
    !dniONumero ||
    !matriculaNumero ||
    !matriculaColegio ||
    !matriculaVenceEl ||
    !seguroAseguradora ||
    !seguroPoliza ||
    !seguroVenceEl;

  interface RespuestaRegistroVeterinario {
    accessToken: string;
    refreshToken: string;
    accesoExpiraEnSegundos: number;
    presencia: "CONECTADO" | "STAND_BY" | "DESCONECTADO";
    veterinarioId: string;
    nombre: string;
    apellido: string;
    estado: string;
    disponible: boolean;
    margenPorcentaje: number;
    onboardingCompletado: boolean;
  }

  async function registrar() {
    if (faltanCampos) return;
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await apiPost<RespuestaRegistroVeterinario>("/auth/veterinario/registrar", {
        nombre,
        apellido,
        email,
        telefono: telefono || undefined,
        password,
        dniONumero,
        matriculaNumero,
        matriculaColegio,
        matriculaVenceEl,
        seguroAseguradora,
        seguroPoliza,
        seguroVenceEl,
      });
      guardar({
        accessToken: respuesta.accessToken,
        refreshToken: respuesta.refreshToken,
        accesoVenceEl: Date.now() + respuesta.accesoExpiraEnSegundos * 1000,
        presencia: respuesta.presencia,
        veterinarioId: respuesta.veterinarioId,
        nombre: respuesta.nombre,
        apellido: respuesta.apellido,
        estado: respuesta.estado,
        disponible: respuesta.disponible,
        margenPorcentaje: respuesta.margenPorcentaje,
        onboardingCompletado: respuesta.onboardingCompletado,
      });
      // panel-veterinario ya sabe mostrar el onboarding de 3 pantallas
      // cuando onboardingCompletado es false (default para una cuenta
      // recién creada) — no hace falta ninguna pantalla intermedia acá.
      router.push("/panel-veterinario");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos crear tu cuenta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Sumate como veterinario
      </h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0, marginBottom: 24 }}>
        Con matrícula y seguro vigentes podés empezar a brindar asesoramiento online. Verificamos tu identidad y tus
        datos antes de habilitarte — mientras tanto tu cuenta queda pendiente de revisión.
      </p>

      <Foto
        src="/fotos/veterinario-escritorio.webp"
        alt="Las manos de un veterinario con guardapolvo, en su escritorio, durante una videollamada en la laptop"
        posicion="40% 50%"
        className="va-banner-ancho"
        style={{ borderRadius: 22, border: "1px solid var(--borde)", marginBottom: 8 }}
      >
        <span
          style={{
            position: "absolute",
            right: 10,
            bottom: 8,
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(12,42,36,0.7)",
            color: "var(--video-texto)",
            fontSize: 11,
          }}
        >
          Imagen ilustrativa
        </span>
      </Foto>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          registrar();
        }}
      >
        <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Tus datos</h2>
        <Campo etiqueta="Nombre" value={nombre} onChange={setNombre} autoComplete="given-name" />
        <Campo etiqueta="Apellido" value={apellido} onChange={setApellido} autoComplete="family-name" />
        <Campo etiqueta="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Campo etiqueta="Teléfono (opcional)" value={telefono} onChange={setTelefono} type="tel" autoComplete="tel" />
        <Campo etiqueta="DNI o número de documento" value={dniONumero} onChange={setDniONumero} />
        <Campo
          etiqueta="Contraseña"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
        />
        <Campo
          etiqueta="Confirmar contraseña"
          value={confirmarPassword}
          onChange={setConfirmarPassword}
          type="password"
          autoComplete="new-password"
          error={passwordsNoCoinciden ? "Las contraseñas no coinciden" : undefined}
        />

        <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
          Matrícula profesional
        </h2>
        <Campo etiqueta="Número de matrícula" value={matriculaNumero} onChange={setMatriculaNumero} />
        <Campo etiqueta="Colegio / jurisdicción" value={matriculaColegio} onChange={setMatriculaColegio} />
        <Campo etiqueta="Vencimiento de la matrícula" value={matriculaVenceEl} onChange={setMatriculaVenceEl} type="date" />

        <h2 style={{ fontSize: 15, opacity: 0.75, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>
          Seguro de responsabilidad civil profesional
        </h2>
        <Campo etiqueta="Aseguradora" value={seguroAseguradora} onChange={setSeguroAseguradora} />
        <Campo etiqueta="Número de póliza" value={seguroPoliza} onChange={setSeguroPoliza} />
        <Campo etiqueta="Vencimiento del seguro" value={seguroVenceEl} onChange={setSeguroVenceEl} type="date" />

        {error && (
          <p style={{ color: "var(--terracota)", fontSize: 13, marginTop: 12 }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="va-boton" disabled={enviando || faltanCampos} style={{ marginTop: 20 }}>
          {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
        </button>
      </form>

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.75, marginTop: 24, textDecoration: "underline", display: "block", textAlign: "center" }}
      >
        ¿Ya tenés cuenta? Ingresá acá
      </Link>

      <LegalFooter />
    </main>
  );
}

function Campo({
  etiqueta,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label style={{ display: "block", margin: "12px 0", fontSize: 14, fontWeight: 600 }}>
      {etiqueta}
      <input
        className="va-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{ marginTop: 6, fontWeight: 400 }}
      />
      {error && (
        <span style={{ display: "block", color: "var(--terracota)", fontSize: 12, fontWeight: 400, marginTop: 4 }}>
          {error}
        </span>
      )}
    </label>
  );
}
