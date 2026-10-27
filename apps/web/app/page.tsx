import Link from "next/link";
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

// Cada paso lleva su miniatura. La del paso 02 es un dibujo propio (sin
// caras ni estrellas): las imágenes de IA mostraban veterinarios con 5
// estrellas, que eran calificaciones inventadas.
const PASOS = [
  {
    n: "01",
    foto: "/fotos/paso-1.webp",
    alt: "Un celular con una lista de preguntas tildadas y un gatito que se asoma",
    titulo: "Contanos qué le pasa",
    texto: "Respondés unas preguntas cortas. Si hay señales de urgencia, te avisamos al instante.",
  },
  {
    n: "02",
    foto: null,
    alt: "",
    titulo: "Elegí con quién hablar",
    texto:
      "Ves quién está conectado, cómo lo calificaron otros tutores y cuánto cuesta en total. Pagás con Mercado Pago o PayPal.",
  },
  {
    n: "03",
    foto: "/fotos/paso-3.webp",
    alt: "Una laptop con una videollamada: un perro de un lado y un veterinario del otro",
    titulo: "Hablan por video",
    texto: "Entrás desde tu panel. Al terminar, calificás la atención con estrellas.",
  },
];

// Tres filas con un círculo para elegir: "elegí con quién hablar". Dibujo
// propio, a propósito sin caras, nombres ni estrellas.
function DibujoElegir() {
  return (
    <svg viewBox="0 0 160 120" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="160" height="120" fill="#ede4d1" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(18 ${14 + i * 32})`}>
          <rect width="124" height="26" rx="9" fill="#fbf8f0" stroke="#ddd3be" />
          <circle cx="15" cy="13" r="8" fill={i === 1 ? "#0a6b52" : "#c9d6cc"} />
          <rect x="32" y="7" width="52" height="5" rx="2.5" fill="#c9d6cc" />
          <rect x="32" y="16" width="34" height="4" rx="2" fill="#dfe6dd" />
          <circle cx="108" cy="13" r="6" fill={i === 1 ? "#0a6b52" : "none"} stroke="#0a6b52" strokeWidth="1.6" />
          {i === 1 && <path d="M105 13l2.2 2.4 4-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
    </svg>
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
              src="/fotos/hero-celular.webp"
              alt="Una mujer en el sillón, con su gato en brazos, habla por videollamada con un veterinario desde el celular"
              posicion="38% 50%"
              prioridad
              style={{
                aspectRatio: "4 / 3",
                borderRadius: 30,
                border: "1px solid var(--borde)",
                boxShadow: "0 30px 70px -40px rgba(var(--esmeralda-rgb), 0.55)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(12,42,36,0.78)",
                  color: "var(--video-texto)",
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
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 10,
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
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" style={{ paddingTop: 8 }}>
          <h2 id="como-funciona-titulo" className="va-etiqueta" style={{ margin: "0 0 8px" }}>
            Cómo funciona
          </h2>
          <div className="va-pasos">
            {PASOS.map((p) => (
              <div key={p.n} className="va-paso">
                <div className="va-paso-cuerpo">
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
                {p.foto ? (
                  <Foto src={p.foto} alt={p.alt} className="va-paso-mini" />
                ) : (
                  <div className="va-paso-mini va-paso-mini-dibujo" aria-hidden="true">
                    <DibujoElegir />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "10px 0 0" }}>
            Imágenes ilustrativas.
          </p>
        </section>

        <section className="va-franja" aria-labelledby="noche-titulo">
          <Foto
            src="/fotos/de-noche.webp"
            alt="Un hombre abraza a su perro en el sillón, de noche, mientras habla con un veterinario por videollamada"
            posicion="40% 50%"
            className="va-franja-foto"
            style={{ borderRadius: 26, border: "1px solid var(--borde)" }}
          />
          <div className="va-franja-texto">
            <h2 id="noche-titulo" className="va-titular" style={{ fontSize: "clamp(20px, 2.6vw, 28px)", margin: 0 }}>
              ¿Se complicó de noche?
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "12px 0 0", maxWidth: 460 }}>
              Lo más difícil es decidir si podés esperar a la mañana o si tenés que ir a una guardia. Un
              veterinario matriculado evalúa qué tan urgente es y te orienta. Ves quién está conectado en ese
              momento.
            </p>
            <Link
              href="/intake"
              className="va-boton va-boton-ghost"
              style={{ width: "auto", minHeight: 52, padding: "0 30px", marginTop: 20, maxWidth: 300 }}
            >
              Empezar ahora
            </Link>
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
