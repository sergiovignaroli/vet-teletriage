import Link from "next/link";
import { Logo } from "../components/Logo";
import { LegalFooter } from "../components/LegalFooter";

// Sergio, 2026-09-30: "no quiero que aparezcan en la landing el precio que
// se queda la plataforma. ni el precio de los vetes" — antes acá se
// mostraba el cargo de plataforma en pesos (import de CARGO_PLATAFORMA,
// ahora borrado). El costo total sigue viéndose, íntegro, en la pantalla
// de elegir veterinario (es el momento en que el cliente decide y paga,
// ahí SÍ tiene que verlo) — el detalle completo de precios vive en
// Términos y Condiciones.
export default function HomePage() {
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
      <Logo tagline="Teleasesoramiento veterinario" size="lg" marginBottom={36} />

      <h1 className="va-titular" style={{ fontSize: 24, marginBottom: 12, lineHeight: 1.15 }}>
        Un veterinario matriculado, por video, cuando el tuyo no está
      </h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0, marginBottom: 28, lineHeight: 1.5 }}>
        Orientación y evaluación de urgencia online. No reemplaza un examen físico ni constituye
        diagnóstico: ante una emergencia, acudí a tu guardia veterinaria más cercana.
      </p>

      <div
        style={{
          background: "rgba(122, 139, 104, 0.12)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 28,
          fontSize: 13,
        }}
      >
        Vas a ver el costo total de cada veterinario conectado antes de elegir y pagar — sin sorpresas.
      </div>

      <Link href="/intake" className="va-boton" style={{ marginBottom: 6, textDecoration: "none" }}>
        Empezar video
      </Link>
      <p style={{ fontSize: 10.5, opacity: 0.5, marginTop: 0, marginBottom: 20 }}>
        Al continuar, aceptás nuestros{" "}
        <Link href="/terminos" style={{ color: "inherit", textDecoration: "underline" }}>
          Términos y Condiciones
        </Link>
        .
      </p>

      <Link href="/ingresar" style={{ fontSize: 13, opacity: 0.55, textDecoration: "underline" }}>
        Ya empecé un asesoramiento, quiero ingresar
      </Link>

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 14, textDecoration: "underline" }}
      >
        ¿Sos veterinario? Ingresá acá
      </Link>

      <Link
        href="/veterinarios"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 14, textDecoration: "underline" }}
      >
        Conocé a nuestros veterinarios
      </Link>

      <LegalFooter />
    </main>
  );
}
