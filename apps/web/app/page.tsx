import Link from "next/link";
import { franjaHorariaDe, CARGO_PLATAFORMA } from "@vet-teletriage/types";

export default function HomePage() {
  const franja = franjaHorariaDe(new Date());

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
      <div className="va-logo" style={{ fontSize: 24, marginBottom: 6 }}>
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
        Teleasesoramiento veterinario
      </div>

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
        Cargo de plataforma ahora ({franja === "DIURNA" ? "horario diurno" : "horario nocturno"}):{" "}
        <strong style={{ fontSize: 15 }}>${CARGO_PLATAFORMA[franja]}</strong>
        <br />
        <span style={{ opacity: 0.65 }}>+ el honorario que fije el veterinario que te atienda</span>
      </div>

      <Link href="/intake" className="va-boton" style={{ marginBottom: 20, textDecoration: "none" }}>
        Empezar una consulta
      </Link>

      <Link href="/ingresar" style={{ fontSize: 13, opacity: 0.55, textDecoration: "underline" }}>
        Ya empecé una consulta, quiero ingresar
      </Link>

      <Link
        href="/ingresar-veterinario"
        style={{ fontSize: 13, opacity: 0.55, marginTop: 14, textDecoration: "underline" }}
      >
        ¿Sos veterinario? Ingresá acá
      </Link>
    </main>
  );
}
