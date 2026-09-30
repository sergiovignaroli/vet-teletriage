"use client";

// Recorrido guiado de 3 pantallas, la primera vez que un cliente entra al
// panel. Estructura y copy calcados del wireframe aprobado por Sergio
// (scratchpad/portadas/onboarding-app.html) — ver esa maqueta para el
// diseño visual de referencia.

import { useState } from "react";
import { Logo } from "./Logo";
import { LegalFooter } from "./LegalFooter";

interface Props {
  onTerminar: () => void;
  enviando: boolean;
  // Mismo componente para los dos roles — cambia el copy, no la mecánica
  // del stepper. Default "cliente" para no tocar el call site existente en
  // /panel.
  variante?: "cliente" | "veterinario";
}

const PANTALLAS_CLIENTE = [
  {
    titulo: "Hola. Acá siempre hay alguien.",
    texto: "Videollamada Animal conecta a tu mascota con un veterinario matriculado, las 24 horas.",
  },
  {
    titulo: "Contás qué pasa",
    texto: "Elegís el motivo del asesoramiento. Nada de formularios largos — dos toques y listo.",
  },
];

const PANTALLA_FINAL_CLIENTE = {
  titulo: "Ya estás listo.",
  texto: "Contanos qué le pasa a tu mascota y te conectamos con un veterinario ahora.",
  boton: "Empezar mi primer asesoramiento",
};

// Decisión de Sergio (2026-09-29): el cliente elige veterinario viendo
// costo total y rating — el copy refleja eso, no un "tomá el que quieras"
// que ya no describe el flujo.
const PANTALLAS_VETERINARIO = [
  {
    titulo: "Hola, colega.",
    texto: "Mientras estés conectado, los clientes te ven en una lista y te eligen directamente a vos.",
  },
  {
    titulo: "Vos ajustás tu margen",
    texto: "La plataforma calcula un precio base por caso; vos le aplicás tu propio margen, dentro de un rango.",
  },
];

const PANTALLA_FINAL_VETERINARIO = {
  titulo: "Ya estás listo.",
  texto: "Conectate para empezar a aparecer en la lista que ven los clientes.",
  boton: "Ir a mi panel",
};

export function Onboarding({ onTerminar, enviando, variante = "cliente" }: Props) {
  const [paso, setPaso] = useState(0);
  const PANTALLAS = variante === "veterinario" ? PANTALLAS_VETERINARIO : PANTALLAS_CLIENTE;
  const pantallaFinal = variante === "veterinario" ? PANTALLA_FINAL_VETERINARIO : PANTALLA_FINAL_CLIENTE;
  const esUltimoPaso = paso === PANTALLAS.length; // la 3ra "pantalla" es el CTA final, no una card de PANTALLAS

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--crema)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "40px 24px",
        zIndex: 50,
      }}
    >
      {/* Logo siempre centrado (Sergio, 2026-09-29) — "Saltar" va en la
          esquina para no competir por el centro con la marca. */}
      <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
        {!esUltimoPaso && (
          <button
            type="button"
            onClick={onTerminar}
            disabled={enviando}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "none",
              border: "none",
              opacity: 0.5,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Saltar
          </button>
        )}
        <Logo size="sm" marginBottom={0} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 340 }}>
        {!esUltimoPaso ? (
          <>
            <h1 className="va-titular" style={{ fontSize: 26, margin: "0 0 12px", lineHeight: 1.25 }}>
              {PANTALLAS[paso].titulo}
            </h1>
            <p style={{ fontSize: 15, opacity: 0.72, lineHeight: 1.55, margin: 0 }}>{PANTALLAS[paso].texto}</p>
          </>
        ) : (
          <>
            <h1 className="va-titular" style={{ fontSize: 26, margin: "0 0 12px", lineHeight: 1.25 }}>
              {pantallaFinal.titulo}
            </h1>
            <p style={{ fontSize: 15, opacity: 0.72, lineHeight: 1.55, margin: 0 }}>{pantallaFinal.texto}</p>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === paso ? "var(--oliva)" : "rgba(64,53,47,.25)",
            }}
          />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 340 }}>
        {!esUltimoPaso ? (
          <button type="button" className="va-boton" onClick={() => setPaso((p) => p + 1)}>
            Siguiente
          </button>
        ) : (
          <>
            <button type="button" className="va-boton" onClick={onTerminar} disabled={enviando}>
              {enviando ? "Un momento…" : pantallaFinal.boton}
            </button>
            <button
              type="button"
              className="va-boton va-boton-ghost"
              style={{ marginTop: 10 }}
              onClick={() => setPaso(0)}
              disabled={enviando}
            >
              Ver cómo funciona de nuevo
            </button>
          </>
        )}
      </div>

      <LegalFooter />
    </div>
  );
}
