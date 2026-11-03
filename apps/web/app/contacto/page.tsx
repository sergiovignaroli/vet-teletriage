"use client";

// Pantalla de Contacto (Sergio, 2026-09-30: "debe figurar también redes y
// en contacto debe figurar un correo electrónico... todo editable desde el
// panel administrador"). No existía ninguna pantalla de contacto antes de
// esto. Todo el contenido sale de GET /configuracion — un campo que Sergio
// no cargó todavía simplemente no se muestra (el teléfono es fijo y viene de lib/datos-legales.ts),
// en vez de mostrar un dato inventado.
import { useEffect, useState } from "react";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Pantalla, MarcaGrande } from "../../components/Pantalla";
import { TELEFONO_ENLACE, TELEFONO_VISIBLE } from "../../lib/datos-legales";

const REDES: Array<{ campo: keyof ConfiguracionPlataforma; etiqueta: string }> = [
  { campo: "instagramUrl", etiqueta: "Instagram" },
  { campo: "facebookUrl", etiqueta: "Facebook" },
  { campo: "tiktokUrl", etiqueta: "TikTok" },
];

export default function ContactoPage() {
  const [config, setConfig] = useState<ConfiguracionPlataforma | null | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    apiGet<ConfiguracionPlataforma>("/configuracion")
      .then((c) => {
        if (!cancelado) setConfig(c);
      })
      .catch(() => {
        if (!cancelado) setConfig(null);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const redesCargadas = config ? REDES.filter(({ campo }) => Boolean(config[campo])) : [];
  return (
    <Pantalla titulo="Ayuda" variante="menta" ancho={420} volver="/" centrar>
      <MarcaGrande detalle="Teleasesoramiento veterinario" />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 16 }}>
        Contacto
      </h1>

      {config === undefined && <p style={{ fontSize: 14, opacity: 0.75 }}>Cargando…</p>}

      <p style={{ fontSize: 15, marginBottom: 14 }}>
        <a href={TELEFONO_ENLACE} style={{ color: "var(--esmeralda)", fontWeight: 600 }}>
          {TELEFONO_VISIBLE}
        </a>
      </p>

      {config?.emailContacto && (
        <p style={{ fontSize: 15, marginBottom: 14 }}>
          <a href={`mailto:${config.emailContacto}`} style={{ color: "var(--esmeralda)", fontWeight: 600 }}>
            {config.emailContacto}
          </a>
        </p>
      )}

      {redesCargadas.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 8 }}>
          {redesCargadas.map(({ campo, etiqueta }) => (
            <a
              key={campo}
              href={config![campo] as string}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 14, color: "var(--esmeralda)", textDecoration: "underline" }}
            >
              {etiqueta}
            </a>
          ))}
        </div>
      )}

    </Pantalla>
  );
}
