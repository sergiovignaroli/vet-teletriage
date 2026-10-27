"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// Espacio reservado para una foto. Si en public/fotos/ existe el archivo que
// se le indica en `src`, se muestra; si todavía no está, queda un fondo con
// la marca y una huella — sin texto de relleno, para que el sitio no se vea
// roto mientras llegan las fotos reales. Para sumar una foto alcanza con
// copiar el archivo con el nombre esperado (ver public/fotos/LEEME.md).
export function Foto({
  src,
  alt,
  style,
  children,
}: {
  src: string;
  alt: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [fallo, setFallo] = useState(false);

  return (
    <div className="va-foto" style={style}>
      {!fallo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFallo(true)} loading="lazy" />
      ) : (
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "46%",
            width: "34%",
            maxWidth: 150,
            transform: "translate(-50%, -50%)",
            opacity: 0.16,
          }}
          fill="#f4f1e6"
        >
          <ellipse cx="32" cy="42" rx="13" ry="11" />
          <ellipse cx="14" cy="26" rx="6" ry="8" transform="rotate(-18 14 26)" />
          <ellipse cx="25" cy="16" rx="6" ry="8.5" />
          <ellipse cx="39" cy="16" rx="6" ry="8.5" />
          <ellipse cx="50" cy="26" rx="6" ry="8" transform="rotate(18 50 26)" />
        </svg>
      )}
      {children}
    </div>
  );
}
