"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// Foto del sitio con red de seguridad. Si el archivo de `src` (en
// public/fotos/) no se puede cargar, queda un fondo de marca con una huella,
// sin texto de relleno, para que la pantalla no se vea rota.
//
// - `posicion`: qué parte de la foto se prioriza cuando el recuadro la recorta
//   (por ejemplo "62% 50%"). Es el object-position de CSS.
// - `prioridad`: para la foto que aparece arriba de todo (carga inmediata);
//   el resto se carga recién cuando está por verse.
// - `className`: para darle proporciones distintas en celular y laptop.
export function Foto({
  src,
  alt,
  style,
  className,
  posicion,
  prioridad = false,
  children,
}: {
  src: string;
  alt: string;
  style?: CSSProperties;
  className?: string;
  posicion?: string;
  prioridad?: boolean;
  children?: ReactNode;
}) {
  const [fallo, setFallo] = useState(false);

  return (
    <div className={className ? `va-foto ${className}` : "va-foto"} style={style}>
      {!fallo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setFallo(true)}
          loading={prioridad ? "eager" : "lazy"}
          decoding="async"
          style={posicion ? { objectPosition: posicion } : undefined}
        />
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
