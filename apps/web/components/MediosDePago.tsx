"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Logos de los medios de pago (Sergio, 2026-11-05: "siempre el logotipo, no solo
 * el nombre, y que quede armónico y sutil").
 *
 * Los archivos oficiales de cada marca van en /public/pagos (ver LEEME.md ahí).
 * Se muestran sin modificar, sobre un recuadro claro (así se ven bien también en
 * pantallas oscuras y respetan el fondo que cada marca pide). Si el archivo
 * todavía no está, se muestra el nombre en texto: nunca queda un hueco roto.
 */
export type MedioDePago = "mercadopago" | "paypal" | "visa" | "mastercard";

const MEDIOS: Record<MedioDePago, { nombre: string; archivo: string }> = {
  mercadopago: { nombre: "Mercado Pago", archivo: "mercadopago" },
  paypal: { nombre: "PayPal", archivo: "paypal" },
  visa: { nombre: "Visa", archivo: "visa" },
  mastercard: { nombre: "Mastercard", archivo: "mastercard" },
};

const EXTENSIONES = ["svg", "png"] as const;

export function LogoMedio({ medio, alto = 18, style }: { medio: MedioDePago; alto?: number; style?: CSSProperties }) {
  const { nombre, archivo } = MEDIOS[medio];
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
        justifyContent: "center",
        verticalAlign: "middle",
        height: alto + 12,
        padding: "0 9px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.09)",
        borderRadius: 8,
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
          height={alto}
          style={{ height: alto, width: "auto", display: "block" }}
          onError={() => setIntento((i) => i + 1)}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, color: "#33403b", whiteSpace: "nowrap" }}>{nombre}</span>
      )}
    </span>
  );
}

/** Fila de logos, chica y discreta. */
export function FilaMedios({
  medios,
  etiqueta,
  alto = 16,
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
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, ...style }}
    >
      {etiqueta ? <span style={{ fontSize: 12, opacity: 0.7, marginRight: 2 }}>{etiqueta}</span> : null}
      {medios.map((m) => (
        <LogoMedio key={m} medio={m} alto={alto} />
      ))}
    </div>
  );
}
