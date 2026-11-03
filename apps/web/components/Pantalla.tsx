// Marco común de todas las pantallas internas (dirección G, tal como quedó
// aprobada en el diseño de celular): una barra de color arriba con el título
// (y la flecha para volver), y el contenido sobre fondo arena. Reemplaza al
// viejo bloque "logo arriba y tarjeta de vidrio" que tenía cada pantalla por su
// cuenta. No cambia ninguna lógica: solo el marco visual.
//
// variante:
//   "menta"    — tutor y pantallas públicas (barra menta, texto verde profundo)
//   "profundo" — espera/consulta y administración (barra verde profundo)
//   "terracota"— zona del veterinario (barra terracota, texto blanco)
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { LegalFooter } from "./LegalFooter";
import { LogoIcon } from "./Logo";
import { Sello } from "./Sello";

interface PantallaProps {
  titulo: string;
  volver?: string;
  variante?: "menta" | "profundo" | "terracota";
  // Ancho máximo del contenido en laptop (en celular siempre ocupa todo).
  ancho?: number;
  centrar?: boolean;
  pie?: boolean;
  // Si viene, muestra "Cerrar sesión" en la barra (paneles con sesión).
  salir?: () => void;
  // Si viene, muestra un botón chico "Ayuda" en la barra que lleva al centro de
  // ayuda de ese rol (tutor: /ayuda, veterinario: /veterinario/ayuda).
  ayuda?: string;
  children: ReactNode;
}

export function Pantalla({ titulo, volver, variante = "menta", ancho = 480, centrar = false, pie = true, salir, ayuda, children }: PantallaProps) {
  const estilo = { "--va-ancho": `${ancho}px` } as CSSProperties;
  return (
    <div className="va-app" style={estilo}>
      <header className={`va-barra va-barra-${variante}`}>
        <div className="va-barra-in">
          {volver ? (
            <Link href={volver} aria-label="Volver" className="va-barra-volver">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </Link>
          ) : null}
          <span className="va-barra-titulo">{titulo}</span>
          {salir && (
            <button type="button" onClick={salir} className="va-barra-salir">
              Cerrar sesión
            </button>
          )}
          {ayuda && (
            <Link href={ayuda} className="va-barra-ayuda" aria-label="Ayuda">
              <span aria-hidden="true">?</span>
              <span className="va-barra-ayuda-txt">Ayuda</span>
            </Link>
          )}
          <span className="va-barra-marca">
            <span className="va-barra-nombre">
              Videollamada Animal
              <Sello />
            </span>
            <LogoIcon size={30} tono={variante === "menta" ? "oscuro" : "claro"} />
          </span>
        </div>
      </header>
      <main className={`va-cuerpo${centrar ? " va-centrado" : ""}`}>
        {children}
        {pie && <LegalFooter />}
      </main>
    </div>
  );
}

// Bloque de marca grande para las pantallas de ingreso y registro: es el mismo
// logo de siempre, sobre el contenido, para que quien llega vea la marca.
export function MarcaGrande({ detalle }: { detalle?: string }) {
  return (
    <div className="va-marca-grande">
      <LogoIcon size={64} />
      <div className="va-logo">
        Videollamada Animal
        <Sello />
      </div>
      {detalle && <div className="va-marca-detalle">{detalle}</div>}
    </div>
  );
}
