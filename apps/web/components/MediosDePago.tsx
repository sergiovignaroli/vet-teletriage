"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Logos de los medios de pago (Sergio, 2026-11-05: "siempre el logotipo, no solo
 * el nombre, y que quede armónico y sutil"; 2026-11-06: "más chiquitos, solo un
 * detalle, sin repetirlos en todas las páginas").
 *
 * Por eso: SIN recuadro, diminutos, y usados en muy pocos lugares (la pantalla de
 * pago y la de cobros del veterinario). No usar en pantallas oscuras: se muestran
 * con sus colores originales (no se alteran), pensados para fondo claro.
 *
 * Los archivos oficiales de cada marca van en /public/pagos (ver LEEME.md ahí).
 * Si el archivo todavía no está, se muestra el nombre en texto chico y apagado:
 * nunca queda un hueco roto.
 */
export type MedioDePago = "mercadopago" | "paypal" | "visa" | "mastercard";

// "factor": cuánto mide el logo respecto de `alto`. Los logos apilados (PayPal,
// Mastercard) son casi cuadrados y necesitan más altura que los horizontales
// (Mercado Pago, Visa) para que todos pesen parecido a la vista.
const MEDIOS: Record<MedioDePago, { nombre: string; archivo: string; factor: number }> = {
  mercadopago: { nombre: "Mercado Pago", archivo: "mercadopago", factor: 1.1 },
  paypal: { nombre: "PayPal", archivo: "paypal", factor: 1.45 },
  visa: { nombre: "Visa", archivo: "visa", factor: 0.85 },
  mastercard: { nombre: "Mastercard", archivo: "mastercard", factor: 1.45 },
};
const FACTOR_MAXIMO = 1.45;

const EXTENSIONES = ["svg", "png"] as const;

export function LogoMedio({ medio, alto = 12, style }: { medio: MedioDePago; alto?: number; style?: CSSProperties }) {
  const { nombre, archivo, factor } = MEDIOS[medio];
  const altoLogo = Math.round(alto * factor);
  const [intento, setIntento] = useState(0); // 0: svg, 1: png, 2: texto
  const img = useRef<HTMLImageElement>(null);

  // Si el archivo no existe, el navegador ya falló ANTES de que React se enganche
  // (la página viene renderizada del servidor), así que onError solo no alcanza:
  // al montar se revisa si la imagen ya terminó de cargar sin contenido.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setIntento((i) => i + 1);
  }, [intento]);

  return (
    <span
      className="va-logo-medio"
      title={nombre}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        lineHeight: 1,
        ...style,
      }}
    >
      {intento < EXTENSIONES.length ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={`/pagos/${archivo}.${EXTENSIONES[intento]}`}
          alt={nombre}
          height={altoLogo}
          style={{ height: altoLogo, width: "auto", display: "block" }}
          onError={() => setIntento((i) => i + 1)}
        />
      ) : (
        <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{nombre}®</span>
      )}
    </span>
  );
}

/** Fila de logos, mínima y discreta: etiqueta chica y apagada + logos sin recuadro. */
export function FilaMedios({
  medios,
  etiqueta,
  alto = 12,
  style,
}: {
  medios: MedioDePago[];
  etiqueta?: string;
  alto?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      role="group"
      aria-label={etiqueta ?? "Medios de pago"}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, ...style }}
    >
      {etiqueta ? <span style={{ fontSize: 11.5, color: "var(--muted)", marginRight: 2 }}>{etiqueta}</span> : null}
      {medios.map((m) => (
        <LogoMedio key={m} medio={m} alto={alto} />
      ))}
    </div>
  );
}
