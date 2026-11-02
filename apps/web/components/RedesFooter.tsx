"use client";

import { useEffect, useState } from "react";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet } from "../lib/api";

// Ícono de Instagram en una sola tinta (esmeralda), para el pie de página.
// La dirección sale de la configuración editable desde el panel de admin
// (instagramUrl): si todavía no hay cuenta cargada, NO se muestra nada, en
// vez de un ícono que no lleva a ningún lado.
export function RedesFooter() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiGet<ConfiguracionPlataforma>("/configuracion")
      .then((c) => {
        if (!cancelado) setUrl(c.instagramUrl || null);
      })
      .catch(() => {
        // Sin API o sin dato: el pie queda como estaba, sin ícono.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!url) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram de Videollamada Animal"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, color: "var(--esmeralda)" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
    </div>
  );
}
