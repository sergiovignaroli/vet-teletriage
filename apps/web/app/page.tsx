import Link from "next/link";
import "./portada.css";
import { LegalFooter } from "../components/LegalFooter";
import { Foto } from "../components/Foto";

// Portada nueva — aprobada por Sergio el 2026-11-02 (diseño en el lienzo
// "Portada Videollamada Animal"). Cambios respecto de la anterior:
//  - botón principal mucho más grande y la foto de abajo más chica;
//  - "Quiénes somos" salió de la portada: es una vista aparte (/quienes-somos);
//  - "Cómo funciona" en cuatro pasos simples;
//  - sección "Para veterinarios" llamativa, para atraer colegas.
//
// Sergio, 2026-09-30: "no quiero que aparezcan en la landing el precio que se
// queda la plataforma. ni el precio de los vetes" — por eso acá no hay ningún
// monto. El costo total se ve en la pantalla de elegir veterinario, y el
// detalle vive en Términos y Condiciones.
//
// A propósito NO hay veterinarios con nombre, calificaciones ni contadores
// inventados: serían datos falsos.
//
// Pendientes de contenido que NO se muestran todavía porque la página a la que
// llevarían no existe: "Convenio con el veterinario" y "Botón de arrepentimiento"
// (ver checklist en Notion, ítems B2 y C1). Cuando existan, se enlazan acá.

const HUELLA = (
  <>
    <ellipse cx="0" cy="8" rx="11" ry="9" />
    <ellipse cx="-15" cy="-3" rx="4.5" ry="6.5" transform="rotate(-22 -15 -3)" />
    <ellipse cx="-6" cy="-13" rx="4.5" ry="6.5" />
    <ellipse cx="6" cy="-13" rx="4.5" ry="6.5" />
    <ellipse cx="15" cy="-3" rx="4.5" ry="6.5" transform="rotate(22 15 -3)" />
  </>
);

function FondoHuellas() {
  const huellas: Array<[number, number, number, number]> = [
    [150, 560, -24, 2.6],
    [270, 430, -12, 2.2],
    [120, 300, -30, 1.8],
    [1210, 220, 22, 2.6],
    [1100, 380, 10, 2.1],
    [1240, 520, 28, 1.7],
  ];
  return (
    <div className="vp-hero-huellas" aria-hidden="true">
      <svg viewBox="0 0 1360 760" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: "block" }}>
        <g fill="#f6f0e4" opacity="0.07">
          {huellas.map(([x, y, giro, escala], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
              {HUELLA}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function LogoGrande() {
  return (
    <div className="vp-logo-caja">
      <svg
        className="vp-bigotes"
        viewBox="0 0 780 220"
        aria-hidden="true"
        fill="none"
        stroke="#f6f0e4"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M300 98 C 230 78, 140 66, 24 84" />
        <path d="M296 112 C 220 112, 124 118, 8 134" />
        <path d="M300 126 C 232 150, 146 172, 40 192" />
        <path d="M480 98 C 550 78, 640 66, 756 84" />
        <path d="M484 112 C 560 112, 656 118, 772 134" />
        <path d="M480 126 C 548 150, 634 172, 740 192" />
      </svg>
      <svg
        className="vp-logo"
        viewBox="0 0 64 64"
        role="img"
        aria-label="Logo de Videollamada Animal: un monitor de videollamada con un perro y un gato"
        fill="none"
        stroke="#f6f0e4"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="11" width="54" height="36" rx="7" />
        <path d="M22 54h20M32 47v7" strokeWidth="2.4" />
        <circle cx="58" cy="14" r="3" fill="#7fd8b8" stroke="none" />
        <path d="M14,24 C8,25 6,33 11,40 C14,35 15,29 14,24 Z" fill="#7fd8b8" stroke="none" />
        <path d="M27,24 C32,26 33,32 28,37 C26,32 26,28 27,24 Z" fill="#7fd8b8" stroke="none" />
        <circle cx="20" cy="31" r="8" stroke="#7fd8b8" strokeWidth="2.3" />
        <circle cx="17.3" cy="29.5" r="0.9" fill="#7fd8b8" stroke="none" />
        <circle cx="22.3" cy="29.5" r="0.9" fill="#7fd8b8" stroke="none" />
        <circle cx="20" cy="33.5" r="1" fill="#7fd8b8" stroke="none" />
        <path d="M20 34.5 L20 36 M20 36 Q17.5 37.5 16.5 36.5 M20 36 Q22.5 37.5 23.5 36.5" stroke="#7fd8b8" strokeWidth="1.6" />
        <path d="M38 22 L35.5 14 L42 19.5 Z" fill="#f0a58f" stroke="none" />
        <path d="M50 22 L53 14 L46 19.5 Z" fill="#f0a58f" stroke="none" />
        <circle cx="44" cy="29" r="7" stroke="#f0a58f" strokeWidth="2.3" />
        <circle cx="41.5" cy="28.5" r="0.8" fill="#f0a58f" stroke="none" />
        <circle cx="46.5" cy="28.5" r="0.8" fill="#f0a58f" stroke="none" />
        <path d="M43 31.5 L44 32.5 L45 31.5" stroke="#f0a58f" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

const ESTRELLA = "M0 -7 L2.1 -2.4 L7 -2.2 L3.2 1 L4.4 5.7 L0 3 L-4.4 5.7 L-3.2 1 L-7 -2.2 L-2.1 -2.4Z";

// Dibujos de los cuatro pasos: propios, sin caras ni calificaciones inventadas.
function DibujoPaso({ n }: { n: 1 | 2 | 3 | 4 }) {
  if (n === 1) {
    return (
      <svg viewBox="0 0 160 110" aria-hidden="true">
        <rect x="52" y="8" width="56" height="94" rx="11" fill="#fbf8f0" stroke="#14302a" strokeWidth="2.4" />
        {[34, 54].map((y) => (
          <g key={y}>
            <circle cx="66" cy={y} r="6" fill="#0a6b52" />
            <path d={`M63 ${y} l2.4 2.6 4.4-5`} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="78" y={y - 3} width={y === 34 ? 22 : 18} height="5" rx="2.5" fill="#c9d6cc" />
          </g>
        ))}
        <circle cx="66" cy="74" r="6" fill="none" stroke="#0a6b52" strokeWidth="1.8" />
        <rect x="78" y="71" width="22" height="5" rx="2.5" fill="#c9d6cc" />
        <path d="M118 30 L112 18 L124 20 Z" fill="#b4432d" />
        <path d="M134 30 L140 18 L128 20 Z" fill="#b4432d" />
        <circle cx="126" cy="38" r="11" fill="#b4432d" />
        <circle cx="122" cy="36" r="1.4" fill="#fbf8f0" />
        <circle cx="130" cy="36" r="1.4" fill="#fbf8f0" />
      </svg>
    );
  }
  if (n === 2) {
    return (
      <svg viewBox="0 0 160 110" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(18 ${8 + i * 32})`}>
            <rect width="124" height="26" rx="9" fill="#fbf8f0" stroke={i === 1 ? "#0a6b52" : "#ddd3be"} strokeWidth={i === 1 ? 1.6 : 1} />
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
  if (n === 3) {
    return (
      <svg viewBox="0 0 160 110" aria-hidden="true">
        <circle cx="76" cy="58" r="36" fill="#fbf8f0" stroke="#14302a" strokeWidth="2.4" />
        <path d="M76 36 L76 58 L92 66" fill="none" stroke="#14302a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M52 22 C 58 14, 66 12, 76 12 C 86 12, 94 14, 100 22" fill="none" stroke="#0a6b52" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
        <circle cx="116" cy="34" r="16" fill="#0a6b52" />
        <path d="M108 34 l5.6 6 9.6-11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true">
      <rect x="26" y="8" width="108" height="64" rx="12" fill="#0b3a30" />
      <path d="M64 84 L96 84 M80 72 L80 84" stroke="#14302a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="42" r="15" fill="none" stroke="#7fd8b8" strokeWidth="3" />
      <circle cx="54" cy="39" r="1.8" fill="#7fd8b8" />
      <circle cx="66" cy="39" r="1.8" fill="#7fd8b8" />
      <circle cx="104" cy="42" r="13" fill="none" stroke="#f0a58f" strokeWidth="3" />
      <path d="M96 32 L94 22 L103 29 Z" fill="#f0a58f" />
      <path d="M112 32 L114 22 L105 29 Z" fill="#f0a58f" />
      <g fill="none" stroke="#14302a" strokeWidth="1.6" strokeLinejoin="round">
        {[40, 60, 80, 100, 120].map((x) => (
          <path key={x} transform={`translate(${x} 98)`} d={ESTRELLA} />
        ))}
      </g>
    </svg>
  );
}

const PASOS: Array<{ n: 1 | 2 | 3 | 4; titulo: string; texto: string }> = [
  { n: 1, titulo: "Contanos qué pasa", texto: "Respondé unas preguntas cortas." },
  { n: 2, titulo: "Elegí un veterinario", texto: "Ves quién está conectado y cuánto cuesta." },
  { n: 3, titulo: "Acepta y pagás", texto: "Cuando el veterinario acepta, pagás con Mercado Pago o PayPal." },
  { n: 4, titulo: "Hablan por video", texto: "Te orienta y después podés calificar la atención." },
];

const BENEFICIOS_VET: Array<{ negrita: string; texto: string }> = [
  { negrita: "Vos decidís cuándo.", texto: "Conectado, Stand by o Desconectado: tu disponibilidad la manejás vos." },
  { negrita: "Te avisan y elegís.", texto: "Cuando un tutor te elige, te llega un aviso: aceptás, rechazás o proponés otro horario." },
  { negrita: "Cobrás tu honorario", texto: "por Mercado Pago, sin perseguir pagos." },
  { negrita: "Sin exclusividad ni horarios obligatorios.", texto: "Tu matrícula, tu criterio, tus tutores." },
];

const REGLAS: Array<{ titulo: string; texto: string; icono: React.ReactNode }> = [
  {
    titulo: "Ves el precio total antes de pagar",
    texto: "Un solo monto, con todo incluido. Nunca se cobra otro distinto.",
    icono: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5C9.5 8.4 10.6 8 12 8s2.5.5 2.5 1.6c0 2.4-5 1.4-5 3.8 0 1.1 1.1 1.6 2.5 1.6s2.5-.4 2.5-1.5" />
      </>
    ),
  },
  {
    titulo: "Pagás cuando el veterinario acepta",
    texto: "Si rechaza, no responde o no puede, no se cobra nada y elegís a otro.",
    icono: (
      <>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  {
    titulo: "Todo pasa dentro de la plataforma",
    texto: "No compartimos tu teléfono ni tu mail con el veterinario, ni los de él con vos.",
    icono: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" />
      </>
    ),
  },
  {
    titulo: "Tus datos están protegidos",
    texto:
      "Los tratamos según la Ley 25.326 de Protección de Datos Personales. Podés pedir verlos, corregirlos o borrarlos desde Contacto.",
    icono: (
      <>
        <path d="M12 3l7 3v5.5c0 4.2-2.9 7.7-7 9.5-4.1-1.8-7-5.3-7-9.5V6z" />
        <path d="M9 12l2.2 2.2L15 10.4" />
      </>
    ),
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ============ PORTADA ============ */}
      <section className="vp-hero">
        <FondoHuellas />
        <div className="vp-wrap" style={{ position: "relative" }}>
          <header className="vp-nav">
            <a className="vp-nav-enlace" href="#como-funciona">
              Cómo funciona
            </a>
            <Link className="vp-nav-enlace" href="/quienes-somos">
              Quiénes somos
            </Link>
            <a className="vp-nav-enlace" href="#veterinarios">
              Para veterinarios
            </a>
            <Link className="vp-nav-ingresar" href="/ingresar">
              Ingresar
            </Link>
          </header>

          <div className="vp-hero-centro">
            <LogoGrande />
            <div className="vp-disp vp-marca">Videollamada Animal</div>

            <div className="vp-chip">
              <span className="vp-punto" aria-hidden="true" />
              Veterinarios matriculados
            </div>

            <h1 className="vp-disp vp-h1">
              Si tu mascota te preocupa, hablá con un veterinario{" "}
              <span style={{ color: "var(--vp-menta)" }}>por video, ahora</span>
            </h1>
            <p className="vp-sub">
              Un veterinario matriculado evalúa qué tan urgente es y te orienta. Ves el precio total antes de pagar.
            </p>

            <Link href="/intake" className="vp-cta">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2.5" y="6" width="13" height="12" rx="3" />
                <path d="M15.5 10.5l6-3v9l-6-3z" />
              </svg>
              Hablar con un veterinario
            </Link>

            <Link href="/ingresar-veterinario" className="vp-enlace-vet">
              ¿Sos veterinario?&nbsp;<b style={{ textDecoration: "underline", color: "#f6f0e4" }}>Sumate como colega</b>
            </Link>
            <p className="vp-legal-mini">
              Al continuar aceptás los{" "}
              <Link href="/terminos" style={{ textDecoration: "underline" }}>
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" style={{ textDecoration: "underline" }}>
                Política de Privacidad
              </Link>
              .
            </p>

            <div className="vp-hero-foto">
              <Foto
                src="/fotos/hero-celular.webp"
                alt="Una mujer en el sillón, con su gato en brazos, habla por videollamada con un veterinario desde el celular"
                posicion="38% 50%"
                prioridad
              />
              <span className="vp-ilustrativa">Imagen ilustrativa</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CÓMO FUNCIONA ============ */}
      <section id="como-funciona" className="vp-como" aria-labelledby="como-titulo">
        <div className="vp-wrap">
          <div style={{ textAlign: "center" }}>
            <div className="vp-etq">Cómo funciona</div>
            <h2 id="como-titulo" className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(24px, 3.6vw, 42px)", lineHeight: 1.15, margin: "12px 0 0", textWrap: "balance" }}>
              Así de fácil, en cuatro pasos
            </h2>
          </div>
          <div className="vp-cols4" style={{ marginTop: 40 }}>
            {PASOS.map((p) => (
              <article key={p.n} className="vp-paso">
                <div className="vp-paso-dibujo">
                  <DibujoPaso n={p.n} />
                </div>
                <div>
                  <div className="vp-disp vp-paso-n">{p.n}</div>
                  <h3 style={{ fontSize: 20, lineHeight: 1.25, fontWeight: 800, margin: "8px 0 0" }}>{p.titulo}</h3>
                  <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--muted)", margin: "6px 0 0" }}>{p.texto}</p>
                </div>
              </article>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "18px 0 0", textAlign: "center" }}>Los dibujos son ilustrativos.</p>
        </div>
      </section>

      {/* ============ PARA VETERINARIOS ============ */}
      <section id="veterinarios" className="vp-vets" aria-labelledby="vets-titulo">
        <div className="vp-wrap">
          <div className="vp-cols2">
            <div>
              <div className="vp-vets-pill">Para veterinarios</div>
              <h2 id="vets-titulo" className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(25px, 4vw, 46px)", lineHeight: 1.12, margin: "20px 0 0", textWrap: "balance" }}>
                Ayudá a tutores que te necesitan, cuando vos quieras
              </h2>
              <p style={{ fontSize: 18, lineHeight: 1.55, color: "#fde8e0", margin: "16px 0 0", maxWidth: 520 }}>
                Atendé por videollamada desde donde estés. Vos ponés el criterio y el horario.
              </p>

              <ul className="vp-vets-lista">
                {BENEFICIOS_VET.map((b) => (
                  <li key={b.negrita}>
                    <span className="vp-tilde" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8f2f1d" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <b>{b.negrita}</b> {b.texto}
                    </span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 32 }}>
                <Link href="/ingresar-veterinario" className="vp-cta-vet">
                  Quiero sumarme
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#fde8e0", margin: "14px 0 0", maxWidth: 460 }}>
                Verificamos tu matrícula y tu seguro antes de habilitarte.
              </p>
            </div>

            <div className="vp-vets-media">
              <div style={{ position: "relative" }}>
                <Foto src="/fotos/veterinario-escritorio.webp" alt="Manos de un veterinario sobre su escritorio durante una videollamada" />
                <span className="vp-ilustrativa" style={{ top: 10, bottom: "auto" }}>
                  Imagen ilustrativa
                </span>
              </div>
              <div className="vp-aviso-vet" aria-hidden="true">
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--esmeralda)" }}>
                  Así te llega una consulta
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25, marginTop: 6 }}>Una persona quiere hablar con vos</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <span style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 999, background: "var(--esmeralda)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    Aceptar
                  </span>
                  <span style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 999, border: "1.5px solid var(--texto)", fontSize: 13, fontWeight: 700 }}>
                    Rechazar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DE NOCHE + EMERGENCIA ============ */}
      <section aria-labelledby="noche-titulo" style={{ paddingTop: 80, paddingBottom: 24 }}>
        <div className="vp-wrap">
          <div className="vp-cols2">
            <Foto
              src="/fotos/de-noche.webp"
              alt="Un hombre abraza a su perro en el sillón, de noche, mientras habla con un veterinario por videollamada"
              posicion="40% 50%"
              style={{ aspectRatio: "4 / 3", borderRadius: 28, border: "1px solid var(--borde)" }}
            />
            <div>
              <h2 id="noche-titulo" className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(22px, 3vw, 34px)", lineHeight: 1.15, margin: 0, textWrap: "balance" }}>
                ¿Se complicó de noche?
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--muted)", margin: "16px 0 0", maxWidth: 480 }}>
                Lo más difícil es decidir si podés esperar a la mañana o si tenés que ir a una guardia. Un veterinario
                matriculado evalúa qué tan urgente es y te orienta. Ves quién está conectado en ese momento.
              </p>
              <Link href="/intake" className="va-boton va-boton-ghost" style={{ width: "auto", minHeight: 56, padding: "0 32px", marginTop: 24, maxWidth: 300 }}>
                Empezar ahora
              </Link>
            </div>
          </div>

          <section
            role="note"
            aria-label="Qué hacer ante una emergencia"
            style={{ marginTop: 44, padding: "18px 20px", borderRadius: 22, background: "var(--alerta-fondo)", border: "1px solid var(--alerta-borde)", display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--alerta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18v.5" />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div className="vp-disp" style={{ fontSize: 15, fontWeight: 700 }}>
                Si está grave, no esperes
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 4 }}>
                Si le cuesta respirar, convulsiona, sangra sin parar o no responde, andá ya a la guardia veterinaria más cercana.
                Tené en claro que el asesoramiento por videollamada no reemplaza nunca la consulta presencial, es orientativo.
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* ============ REGLAS CLARAS ============ */}
      <section id="reglas" aria-labelledby="reglas-titulo" style={{ paddingTop: 56, paddingBottom: 72 }}>
        <div className="vp-wrap">
          <div className="vp-etq">Reglas claras</div>
          <h2 id="reglas-titulo" className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(23px, 3.4vw, 38px)", lineHeight: 1.15, margin: "12px 0 0", maxWidth: 720, textWrap: "balance" }}>
            Cada decisión queda a la vista, para las dos partes
          </h2>
          <div className="vp-cols4" style={{ marginTop: 32 }}>
            {REGLAS.map((r) => (
              <div key={r.titulo} className="vp-regla">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--esmeralda)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {r.icono}
                </svg>
                <h3 style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 800, margin: "10px 0 0" }}>{r.titulo}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "8px 0 0" }}>{r.texto}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <Link href="/terminos" className="va-boton va-boton-ghost" style={{ width: "auto", minHeight: 48, padding: "0 24px", fontSize: 13 }}>
              Términos y Condiciones
            </Link>
            <Link href="/privacidad" className="va-boton va-boton-ghost" style={{ width: "auto", minHeight: 48, padding: "0 24px", fontSize: 13 }}>
              Política de Privacidad
            </Link>
          </div>
        </div>
      </section>

      {/* ============ APPS ============ */}
      <section style={{ paddingBottom: 56 }}>
        <div className="vp-wrap" style={{ textAlign: "center" }}>
          <h2 className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(20px, 2.6vw, 28px)", lineHeight: 1.2, margin: 0, textWrap: "balance" }}>
            Muy pronto, también en tu celular
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "var(--muted)", margin: "12px auto 0", maxWidth: 560 }}>
            Estamos preparando la app para Android y para iPhone. Mientras tanto, podés usar Videollamada Animal desde el
            navegador.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <button disabled style={{ minHeight: 56, padding: "0 24px", borderRadius: 16, border: "1px solid var(--texto)", background: "transparent", color: "var(--texto)", fontSize: 15, fontWeight: 700, opacity: 0.85 }}>
              Android · Google Play, próximamente
            </button>
            <button disabled style={{ minHeight: 56, padding: "0 24px", borderRadius: 16, border: "1px solid var(--texto)", background: "transparent", color: "var(--texto)", fontSize: 15, fontWeight: 700, opacity: 0.85 }}>
              iPhone · App Store, próximamente
            </button>
          </div>
        </div>
      </section>

      {/* ============ PIE ============ */}
      <footer className="vp-wrap" style={{ paddingBottom: 32 }}>
        <nav
          aria-label="Otros accesos"
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 28px", paddingTop: 24, borderTop: "1px solid var(--borde)", fontSize: 14 }}
        >
          <Link href="/quienes-somos" style={{ textDecoration: "underline" }}>
            Quiénes somos
          </Link>
          <Link href="/ingresar" style={{ textDecoration: "underline" }}>
            Retomar mi asesoramiento
          </Link>
          <Link href="/veterinarios" style={{ textDecoration: "underline" }}>
            Conocé a nuestros veterinarios
          </Link>
        </nav>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", maxWidth: 720, margin: "20px auto 0", textAlign: "center" }}>
          Videollamada Animal es una plataforma tecnológica que conecta dueños de mascotas con veterinarios matriculados. Cada
          veterinario ejerce su profesión de forma independiente, bajo su matrícula y su responsabilidad. El servicio es una orientación a distancia y no reemplaza un examen presencial.
        </p>
        <LegalFooter />
      </footer>
    </main>
  );
}
