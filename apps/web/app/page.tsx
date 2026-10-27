import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { LegalFooter } from "../components/LegalFooter";
import { Foto } from "../components/Foto";

// Sergio, 2026-09-30: "no quiero que aparezcan en la landing el precio que
// se queda la plataforma. ni el precio de los vetes" — por eso acá no hay
// ningún monto. El costo total sigue viéndose, íntegro, en la pantalla de
// elegir veterinario (es el momento en que el cliente decide y paga, ahí SÍ
// tiene que verlo) — el detalle completo de precios vive en Términos y
// Condiciones.
//
// Diseño G (2026-10-27): home adaptable — una columna en celular, dos en
// laptop. A propósito NO muestra veterinarios con nombre ni un contador de
// "conectados ahora": el diseño de referencia los traía de ejemplo, pero acá
// serían datos inventados. Cuando exista un endpoint público de conectados,
// se agrega ese dato real.

const PASOS = [
  {
    n: "01",
    titulo: "Contanos qué le pasa",
    texto: "Respondés unas preguntas cortas. Si hay señales de urgencia, te avisamos al instante.",
  },
  {
    n: "02",
    titulo: "Elegí con quién hablar",
    texto:
      "Ves quién está conectado, cómo lo calificaron otros tutores y cuánto cuesta en total. Pagás con Mercado Pago o PayPal.",
  },
  {
    n: "03",
    titulo: "Hablan por video",
    texto: "Entrás desde tu panel. Al terminar, calificás la atención con estrellas.",
  },
];

function IconoVideo({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "#123a32",
        border: "1px solid var(--video-borde)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f4f1e6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <main>
      <div className="va-contenedor">
        <header className="va-cabecera">
          <Logo size="md" horizontal marginBottom={0} />
          <nav className="va-nav" aria-label="Principal">
            <a href="#como-funciona" className="va-nav-enlace">
              Cómo funciona
            </a>
            <Link href="/veterinarios" className="va-nav-enlace">
              Nuestros veterinarios
            </Link>
            <Link href="/ingresar-veterinario" className="va-nav-enlace">
              Sumate como veterinario
            </Link>
            <Link href="/ingresar" className="va-boton-chico">
              Ingresar
            </Link>
          </nav>
        </header>

        <section className="va-hero">
          <div className="va-hero-texto">
            <div className="va-chip">
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--esmeralda)",
                  boxShadow: "0 0 0 4px rgba(var(--esmeralda-rgb), 0.2)",
                }}
              />
              Veterinarios matriculados
            </div>
            <h1 className="va-titular">
              Si tu mascota te preocupa, hablá con un veterinario{" "}
              <span style={{ color: "var(--esmeralda)" }}>por video, ahora</span>
            </h1>
            <p
              style={{
                fontSize: "clamp(15px, 1.6vw, 17px)",
                lineHeight: 1.55,
                color: "var(--muted)",
                margin: "16px 0 0",
                maxWidth: 520,
              }}
            >
              Un veterinario matriculado evalúa qué tan urgente es y te orienta sobre qué hacer, en una
              videollamada.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 28 }}>
              <Link href="/intake" className="va-boton" style={{ width: "auto", minHeight: 60, padding: "0 34px", flex: "1 1 260px", maxWidth: 360 }}>
                Hablar con un veterinario
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)", margin: "12px 0 0", maxWidth: 460 }}>
              Primero contás qué le pasa. Después ves quién está conectado y cuánto cuesta en total, antes de
              pagar. Sin sorpresas.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", margin: "10px 0 0" }}>
              Al continuar, aceptás nuestros{" "}
              <Link href="/terminos" style={{ textDecoration: "underline" }}>
                Términos y Condiciones
              </Link>{" "}
              y nuestra{" "}
              <Link href="/privacidad" style={{ textDecoration: "underline" }}>
                Política de Privacidad
              </Link>
              .
            </p>
          </div>

          <div className="va-hero-media">
            <Foto
              src="/fotos/hero-tutor-gato.jpg"
              alt="Una persona con su gato en brazos, en videollamada con un veterinario"
              style={{
                height: "clamp(330px, 40vw, 470px)",
                borderRadius: 30,
                border: "1px solid var(--video-borde)",
                color: "var(--video-texto)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -70,
                  bottom: -70,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(127,224,184,0.28) 0%, rgba(127,224,184,0) 70%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(12,42,36,0.78)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--video-acento)" }}
                />
                Asesoramiento por video
              </div>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  width: "26%",
                  maxWidth: 120,
                  aspectRatio: "3 / 4",
                  borderRadius: 18,
                  background: "#184a40",
                  border: "1px solid var(--video-borde)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#7fe0b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                </svg>
                <span style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--video-muted)" }}>
                  Tu veterinario
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 18,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <IconoVideo>
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </IconoVideo>
                <IconoVideo>
                  <rect x="3" y="6" width="13" height="12" rx="3" />
                  <path d="M16 10l5-3v10l-5-3z" />
                </IconoVideo>
              </div>
            </Foto>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" style={{ paddingTop: 8 }}>
          <h2 id="como-funciona-titulo" className="va-etiqueta" style={{ margin: "0 0 8px" }}>
            Cómo funciona
          </h2>
          <div className="va-pasos">
            {PASOS.map((p) => (
              <div key={p.n} className="va-paso">
                <div
                  className="va-titular"
                  style={{ fontSize: 24, color: "var(--esmeralda)", width: 44, flexShrink: 0 }}
                >
                  {p.n}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{p.titulo}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", marginTop: 3 }}>{p.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          role="note"
          aria-label="Qué hacer ante una emergencia"
          style={{
            marginTop: 20,
            padding: "16px 18px",
            borderRadius: 20,
            background: "var(--alerta-fondo)",
            border: "1px solid var(--alerta-borde)",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--alerta)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            <path d="M12 3l10 18H2z" />
            <path d="M12 10v5M12 18v.5" />
          </svg>
          <div>
            <div className="va-titular" style={{ fontSize: 14 }}>
              Si está grave, no esperes
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>
              Si le cuesta respirar, convulsiona, sangra sin parar o no responde, andá ya a la guardia veterinaria
              más cercana. Esta videollamada es orientación: no reemplaza un examen presencial ni da diagnóstico.
            </div>
          </div>
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
          <span className="va-chip">Veterinarios matriculados</span>
          <span className="va-chip">Calificados por otros tutores</span>
          <span className="va-chip">Pagás con Mercado Pago o PayPal</span>
        </div>

        <nav
          aria-label="Otros accesos"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px 28px",
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid var(--borde)",
            fontSize: 14,
          }}
        >
          <Link href="/ingresar" style={{ textDecoration: "underline" }}>
            Retomar mi asesoramiento
          </Link>
          <Link href="/ingresar-veterinario" style={{ textDecoration: "underline" }}>
            ¿Sos veterinario? Sumate como colega
          </Link>
          <Link href="/veterinarios" style={{ textDecoration: "underline" }}>
            Conocé a nuestros veterinarios
          </Link>
        </nav>

        <LegalFooter />
        <div style={{ height: 24 }} />
      </div>
    </main>
  );
}
