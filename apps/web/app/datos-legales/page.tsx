import Link from "next/link";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { CUIT, DOMICILIO_COMERCIAL, NOMBRE_COMERCIAL, TELEFONO_ENLACE, TELEFONO_VISIBLE, TITULAR } from "../../lib/datos-legales";

// Datos legales del titular de la plataforma (Sergio, 2026-11-02).
//
// Sergio pidió que estos datos no figuren a la vista en la portada sino en
// una vista aparte. Las normas de comercio electrónico (Resolución GMC 21/04
// del Mercosur, incorporada en Argentina por la Res. 104/2005, y el art. 4 de
// la Ley 24.240) piden que el sitio informe "en forma clara y de fácil
// acceso" la identificación del proveedor, su domicilio y su contacto. Por
// eso esta página se enlaza desde el pie de TODAS las pantallas (ver
// LegalFooter.tsx): queda fuera de la vista principal pero accesible.
//
// A propósito NO figura el domicilio real (particular) del titular: alcanza
// con el domicilio comercial. Faltan todavía, y NO se inventan acá: el correo de
// contacto (se carga desde el panel de admin) y el enlace del organismo de
// Defensa del Consumidor (ver checklist en Notion, ítem A3).

export const metadata = { title: "Datos legales · Videollamada Animal" };

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--borde)" }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
        {titulo}
      </div>
      <div style={{ fontSize: 16, marginTop: 4 }}>{children}</div>
    </div>
  );
}

export default function DatosLegalesPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 22px 60px" }}>
      <Logo size="sm" marginBottom={20} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 4 }}>
        Datos legales
      </h1>
      <p style={{ fontSize: 13, opacity: 0.8, marginTop: 0, marginBottom: 20 }}>
        Quién está detrás de Videollamada Animal.
      </p>

      <Fila titulo="Titular (razón social)">{TITULAR}</Fila>
      <Fila titulo="Nombre comercial">{NOMBRE_COMERCIAL}</Fila>
      <Fila titulo="CUIT">{CUIT}</Fila>
      <Fila titulo="Domicilio comercial">{DOMICILIO_COMERCIAL}</Fila>
      <Fila titulo="Teléfono de atención">
        <a href={TELEFONO_ENLACE} style={{ color: "var(--esmeralda)", textDecoration: "underline" }}>
          {TELEFONO_VISIBLE}
        </a>
      </Fila>
      <Fila titulo="Contacto">
        <Link href="/contacto" style={{ color: "var(--esmeralda)", textDecoration: "underline" }}>
          Escribinos desde la página de contacto
        </Link>
      </Fila>

      <p style={{ fontSize: 13.5, lineHeight: 1.6, opacity: 0.85, marginTop: 22 }}>
        Videollamada Animal es una plataforma intermediaria: conecta a tutores de mascotas con veterinarios matriculados que
        ejercen su profesión de forma independiente. Para saber cómo se usa el servicio y cómo se tratan tus datos, mirá los{" "}
        <Link href="/terminos" style={{ color: "var(--esmeralda)", textDecoration: "underline" }}>
          Términos y Condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" style={{ color: "var(--esmeralda)", textDecoration: "underline" }}>
          Política de Privacidad
        </Link>
        .
      </p>

      <LegalFooter />
    </main>
  );
}
