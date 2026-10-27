// Ícono de marca — monitor de videollamada con un perro (esmeralda) y un gato
// (ladrillo) adentro: "la videollamada" + "el animal" en un solo dibujo. Es el
// mismo trazo de siempre; en la dirección G (2026-10-27) solo cambian los
// colores para acompañar la paleta nueva.
export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="#14302A"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="54" height="36" rx="7" />
      <path d="M22 54h20M32 47v7" strokeWidth={2.4} />
      <circle cx="58" cy="14" r="3" fill="#0A6B52" stroke="none" />
      <path d="M14,24 C8,25 6,33 11,40 C14,35 15,29 14,24 Z" fill="#0A6B52" stroke="none" />
      <path d="M27,24 C32,26 33,32 28,37 C26,32 26,28 27,24 Z" fill="#0A6B52" stroke="none" />
      <circle cx="20" cy="31" r="8" stroke="#0A6B52" strokeWidth={2.3} />
      <circle cx="17.3" cy="29.5" r="0.9" fill="#0A6B52" stroke="none" />
      <circle cx="22.3" cy="29.5" r="0.9" fill="#0A6B52" stroke="none" />
      <circle cx="20" cy="33.5" r="1" fill="#0A6B52" stroke="none" />
      <path
        d="M20 34.5 L20 36 M20 36 Q17.5 37.5 16.5 36.5 M20 36 Q22.5 37.5 23.5 36.5"
        stroke="#0A6B52"
        strokeWidth={1.6}
      />
      <path d="M38 22 L35.5 14 L42 19.5 Z" fill="#B4432D" stroke="none" />
      <path d="M50 22 L53 14 L46 19.5 Z" fill="#B4432D" stroke="none" />
      <circle cx="44" cy="29" r="7" stroke="#B4432D" strokeWidth={2.3} />
      <circle cx="41.5" cy="28.5" r="0.8" fill="#B4432D" stroke="none" />
      <circle cx="46.5" cy="28.5" r="0.8" fill="#B4432D" stroke="none" />
      <path d="M43 31.5 L44 32.5 L45 31.5" stroke="#B4432D" strokeWidth={1.6} />
    </svg>
  );
}

interface LogoProps {
  tagline?: string;
  size?: "sm" | "md" | "lg";
  // Margen inferior del bloque completo — cada pantalla tenía un valor
  // distinto y a mano; se deja como prop para no perder ese ajuste fino.
  marginBottom?: number;
  // Versión de cabecera: ícono a la izquierda y nombre en dos líneas a la
  // derecha (la que usa el home en celular y laptop). Sin esto, el bloque
  // sigue siendo el de siempre: ícono arriba, nombre abajo, centrado.
  horizontal?: boolean;
}

const TAMANIOS = {
  sm: { icono: 26, letra: 11 },
  md: { icono: 34, letra: 13 },
  lg: { icono: 44, letra: 16 },
};

// Bloque de marca único — SIEMPRE el mismo en toda la app (Sergio,
// 2026-09-29): que la marca se vea igual y armónica en cada pantalla.
export function Logo({ tagline, size = "md", marginBottom = 24, horizontal = false }: LogoProps) {
  const { icono, letra } = TAMANIOS[size];

  if (horizontal) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom }}>
        <LogoIcon size={icono} />
        <div className="va-logo" style={{ fontSize: letra }}>
          Videollamada
          <br />
          Animal
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom }}>
      <LogoIcon size={icono} />
      <div className="va-logo" style={{ fontSize: letra, marginTop: 8 }}>
        Videollamada Animal
      </div>
      {tagline && (
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 800,
            marginTop: 4,
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
