"use client";

// Pantalla de Contacto (Sergio, 2026-09-30: "debe figurar también redes y
// en contacto debe figurar un correo electrónico... todo editable desde el
// panel administrador"). No existía ninguna pantalla de contacto antes de
// esto. Todo el contenido sale de GET /configuracion — un campo que Sergio
// no cargó todavía simplemente no se muestra (ver ausenciaTotal más abajo),
// en vez de mostrar un dato inventado.
import { useEffect, useState } from "react";
import type { ConfiguracionPlataforma } from "@vet-teletriage/types";
import { apiGet } from "../../lib/api";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";

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
  // config === null cubre dos casos por igual: la API no tiene nada cargado
  // TODAVÍA, o el fetch directamente falló (API caída, sin red). En ambos
  // el usuario tiene que ver el mensaje de "no hay contacto todavía", nunca
  // una pantalla en blanco — antes acá exigía "config &&" y un config null
  // (por error de red) no mostraba nada.
  const ausenciaTotal = config !== undefined && !config?.emailContacto && redesCargadas.length === 0;

  return (
    <main
      style={{
        maxWidth: 380,
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 22px",
        textAlign: "center",
      }}
    >
      <Logo tagline="Teleasesoramiento veterinario" size="lg" marginBottom={32} />
      <h1 className="va-titular" style={{ fontSize: 22, marginBottom: 16 }}>
        Contacto
      </h1>

      {config === undefined && <p style={{ fontSize: 14, opacity: 0.6 }}>Cargando…</p>}

      {config?.emailContacto && (
        <p style={{ fontSize: 15, marginBottom: 14 }}>
          <a href={`mailto:${config.emailContacto}`} style={{ color: "var(--terracota)", fontWeight: 600 }}>
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
              style={{ fontSize: 14, color: "var(--terracota)", textDecoration: "underline" }}
            >
              {etiqueta}
            </a>
          ))}
        </div>
      )}

      {ausenciaTotal && (
        <p style={{ fontSize: 13, opacity: 0.55 }}>
          Todavía no cargamos un medio de contacto acá — mientras tanto, escribinos por WhatsApp.
        </p>
      )}

      <LegalFooter />
    </main>
  );
}
