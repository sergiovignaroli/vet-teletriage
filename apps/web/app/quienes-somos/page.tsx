import Link from "next/link";
import "../portada.css";
import { Foto } from "../../components/Foto";
import { LegalFooter } from "../../components/LegalFooter";
import { NombreMarca } from "../../components/Marca";
import { NOMBRE_CON_MARCA, SIMBOLO_MARCA } from "../../lib/datos-legales";

// Vista aparte "Quiénes somos" (Sergio, 2026-11-02): antes estaba dentro de la
// portada. Texto pedido: una plataforma que reúne a tutores con un problema o
// que necesitan ayuda y a veterinarios dispuestos a dársela, para sacarse
// dudas y orientarse — "ellos van a estar". Sin la lista de funciones
// (videollamada, cobro seguro…): "eso no vende".

export const metadata = {
  title: `Quiénes somos · ${NOMBRE_CON_MARCA}`,
  description:
    "Reunimos a tutores de mascotas que necesitan ayuda con veterinarios dispuestos a dársela. Ellos van a estar.",
};

export default function QuienesSomosPage() {
  return (
    <main>
      <header style={{ background: "var(--esmeralda)", color: "#fff" }}>
        <div className="vp-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 64 }}>
          <Link href="/" className="vp-disp" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, lineHeight: 1.3, textDecoration: "none", padding: "10px 0" }}>
            Videollamada
            <br />
            Animal
          </Link>
          <Link href="/" style={{ fontWeight: 700, fontSize: 14, textDecoration: "underline", padding: "12px 4px" }}>
            Volver al inicio
          </Link>
        </div>
      </header>

      <section style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="vp-wrap" style={{ maxWidth: 1100 }}>
          <div className="vp-cols2">
            <div>
              <div className="vp-etq">Quiénes somos</div>
              <h1 className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(27px, 4.4vw, 46px)", lineHeight: 1.12, margin: "14px 0 0", textWrap: "balance" }}>
                Para que nadie se quede solo con la duda
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.6, margin: "22px 0 0", maxWidth: 540 }}>
                <NombreMarca /> reúne a dos tipos de personas: tutores de mascotas que tienen un problema o necesitan ayuda, y
                veterinarios que están dispuestos a dársela.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--muted)", margin: "16px 0 0", maxWidth: 540 }}>
                Si tenés una duda, si necesitás que alguien te oriente o simplemente saber si tu mascota está bien, del otro lado hay
                un veterinario que te va a escuchar. Ellos van a estar.
              </p>
            </div>
            <div style={{ position: "relative" }}>
              <Foto
                src="/fotos/mascotas.webp"
                alt="Un perro, un gato, un cobayo y un periquito juntos"
                style={{ aspectRatio: "4 / 3", borderRadius: 30, border: "1px solid var(--borde)" }}
              />
              <span className="vp-ilustrativa">Imagen ilustrativa</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--vp-profundo)", color: "var(--vp-crema)", padding: "72px 0" }}>
        <div className="vp-wrap" style={{ maxWidth: 820, textAlign: "center" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="#7fd8b8" aria-hidden="true">
            <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c2 0 3.8 1.1 5.7 3.3C13.9 6.1 15.7 5 17.7 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
          </svg>
          <p className="vp-disp" style={{ fontWeight: 600, fontSize: "clamp(20px, 2.8vw, 30px)", lineHeight: 1.35, margin: "20px 0 0", textWrap: "balance" }}>
            Son las diez de la noche, tu perro no quiere comer o tu gato respira raro, y la cabeza no para.
          </p>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: "#dfe9e1", margin: "24px 0 0" }}>
            Buscar en internet solo asusta más. Lo que te calma es que alguien que sabe te escuche, te explique con paciencia qué
            puede estar pasando y qué conviene hacer ahora. Tener a quién preguntarle cambia todo.
          </p>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: "#dfe9e1", margin: "16px 0 0" }}>
            Por eso existimos: para que la persona que más quiere a ese animal no tenga que decidir sola ni a ciegas.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 72, paddingBottom: 24 }}>
        <div className="vp-wrap" style={{ maxWidth: 1100 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", background: "var(--card-solida)", border: "1px solid var(--borde)", borderRadius: 28, padding: "24px 12px" }}>
            <svg viewBox="0 0 520 240" width="100%" role="img" aria-label="Esquema: vos y tu mascota pedís ayuda, Videollamada Animal los reúne y un veterinario te orienta" style={{ display: "block", maxWidth: "100%", height: "auto" }}>
              <path d="M130 110 L200 110 M320 110 L390 110" stroke="#0a6b52" strokeWidth="2.4" strokeDasharray="6 6" strokeLinecap="round" fill="none" />
              <path d="M194 104 L202 110 L194 116 M384 104 L392 110 L384 116" stroke="#0a6b52" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="80" cy="110" r="48" fill="#ede4d1" stroke="#ddd3be" strokeWidth="1.5" />
              <circle cx="70" cy="94" r="11" fill="#14302a" />
              <path d="M46 138 C 48 112, 92 112, 94 138 Z" fill="#0a6b52" />
              <path d="M92 118 L89 110 L96 114 Z" fill="#b4432d" />
              <path d="M108 118 L111 110 L104 114 Z" fill="#b4432d" />
              <circle cx="100" cy="124" r="9" fill="#b4432d" />
              <rect x="206" y="68" width="108" height="76" rx="14" fill="#0b3a30" />
              <path d="M240 156 L280 156 M260 144 L260 156" stroke="#0b3a30" strokeWidth="4" strokeLinecap="round" />
              <circle cx="238" cy="104" r="15" fill="none" stroke="#7fd8b8" strokeWidth="3" />
              <circle cx="232" cy="101" r="1.8" fill="#7fd8b8" />
              <circle cx="244" cy="101" r="1.8" fill="#7fd8b8" />
              <circle cx="284" cy="104" r="13" fill="none" stroke="#f0a58f" strokeWidth="3" />
              <path d="M276 94 L274 84 L283 91 Z M292 94 L294 84 L285 91 Z" fill="#f0a58f" />
              <circle cx="440" cy="110" r="48" fill="#ede4d1" stroke="#ddd3be" strokeWidth="1.5" />
              <circle cx="440" cy="92" r="11" fill="#14302a" />
              <path d="M410 142 C 412 112, 468 112, 470 142 Z" fill="#fbf8f0" stroke="#14302a" strokeWidth="2" />
              <path d="M428 124 C 428 140, 452 140, 452 124" fill="none" stroke="#0a6b52" strokeWidth="3" strokeLinecap="round" />
              <circle cx="440" cy="142" r="4" fill="#0a6b52" />
              <g textAnchor="middle" fontFamily="Figtree, system-ui, sans-serif">
                <text x="80" y="190" fontSize="15" fontWeight="700" fill="#14302a">Vos y tu mascota</text>
                <text x="80" y="210" fontSize="13" fill="#4f625a">Pedís ayuda</text>
                <text x="260" y="190" fontSize="15" fontWeight="700" fill="#14302a">{`Videollamada Animal${SIMBOLO_MARCA}`}</text>
                <text x="260" y="210" fontSize="13" fill="#4f625a">Los reúne</text>
                <text x="440" y="190" fontSize="15" fontWeight="700" fill="#14302a">Veterinario matriculado</text>
                <text x="440" y="210" fontSize="13" fill="#4f625a">Te orienta</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 48, paddingBottom: 56 }}>
        <div className="vp-wrap" style={{ maxWidth: 1100 }}>
          <div className="vp-cols2" style={{ alignItems: "stretch" }}>
            <div style={{ background: "var(--card-solida)", border: "1px solid var(--borde)", borderRadius: 28, padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="vp-etq">Si sos tutor</div>
              <h2 className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(20px, 2.4vw, 26px)", lineHeight: 1.2, margin: 0 }}>
                Necesitás una mano con tu mascota
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
                Sacate la duda, pedí orientación y enterate si podés esperar o tenés que ir a una guardia. Contanos qué pasa y hablá
                con un veterinario por video.
              </p>
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <Link href="/intake" className="va-boton" style={{ width: "auto", minHeight: 60, padding: "0 34px" }}>
                  Hablar con un veterinario
                </Link>
              </div>
            </div>
            <div style={{ background: "var(--card-solida)", border: "1px solid var(--borde)", borderRadius: 28, padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="vp-etq" style={{ color: "var(--alerta)" }}>Si sos veterinario</div>
              <h2 className="vp-disp" style={{ fontWeight: 700, fontSize: "clamp(20px, 2.4vw, 26px)", lineHeight: 1.2, margin: 0 }}>
                Querés ayudar a tu manera
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
                Sumate como colega, elegí cuándo estar disponible y acompañá a tutores que necesitan orientación. Con tu matrícula y tu
                criterio.
              </p>
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <Link
                  href="/ingresar-veterinario"
                  className="va-boton"
                  style={{ width: "auto", minHeight: 60, padding: "0 34px", background: "var(--alerta)" }}
                >
                  Quiero sumarme
                </Link>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.55, margin: "36px auto 0", maxWidth: 720, padding: "14px 18px", borderRadius: 16, background: "var(--alerta-fondo)", border: "1px solid var(--alerta-borde)" }}>
            Tené en claro que el asesoramiento por videollamada no reemplaza nunca la consulta presencial, es orientativo.
          </p>
        </div>
      </section>

      <div className="vp-wrap" style={{ paddingBottom: 32 }}>
        <LegalFooter />
      </div>
    </main>
  );
}
