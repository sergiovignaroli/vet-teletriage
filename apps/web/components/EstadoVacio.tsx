import type { ReactNode } from "react";

// Estado "todavía no hay nadie": el gatito dormido de Sergio (ilustración con
// fondo transparente) y un mensaje. Es decorativo: el texto lleva el sentido.
export function EstadoVacio({ children }: { children: ReactNode }) {
  return (
    <div className="va-vacio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fotos/gato-dormido.webp" alt="" loading="lazy" decoding="async" />
      <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 420 }}>{children}</div>
    </div>
  );
}
