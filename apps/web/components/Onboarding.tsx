"use client";

// Recorrido guiado de 3 pantallas, la primera vez que un cliente entra al
// panel. Estructura y copy calcados del wireframe aprobado por Sergio
// (scratchpad/portadas/onboarding-app.html) — ver esa maqueta para el
// diseño visual de referencia.

import { useState } from "react";
import { LogoIcon } from "./Logo";
import { Foto } from "./Foto";
import { LegalFooter } from "./LegalFooter";

interface Props {
  onTerminar: () => void;
  enviando: boolean;
  // Mismo componente para los dos roles — cambia el copy, no la mecánica
  // del stepper. Default "cliente" para no tocar el call site existente en
  // /panel.
  variante?: "cliente" | "veterinario";
}

// Fotos que ya están en el sitio (public/fotos), una por pantalla. Las que
// muestran personas llevan el rótulo "Imagen ilustrativa".
const FOTOS_CLIENTE = [
  { src: "/fotos/hero-celular.webp", alt: "Una mujer con su gato en brazos, en videollamada con un veterinario", persona: true },
  { src: "/fotos/paso-1.webp", alt: "Un celular con preguntas tildadas y un gatito", persona: false },
  { src: "/fotos/paso-3.webp", alt: "Una laptop con un perro y un veterinario en videollamada", persona: true },
];
const FOTOS_VETERINARIO = [
  { src: "/fotos/veterinario-escritorio.webp", alt: "Manos de un veterinario sobre su escritorio durante una videollamada", persona: true },
  { src: "/fotos/mascotas.webp", alt: "Perro, gato, cobayo y periquito juntos", persona: false },
  { src: "/fotos/paso-3.webp", alt: "Una laptop con un perro y un veterinario en videollamada", persona: true },
];

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

  const fotos = variante === "veterinario" ? FOTOS_VETERINARIO : FOTOS_CLIENTE;
  const foto = fotos[Math.min(paso, fotos.length - 1)];
  const textoPaso = esUltimoPaso ? pantallaFinal : PANTALLAS[paso];

  return (
    <div className="va-bienvenida" role="dialog" aria-label="Bienvenida">
      <div className="va-bienvenida-in">
        <div className="va-bienvenida-top">
          <span className="va-bienvenida-marca">
            <LogoIcon size={34} tono="claro" />
            <span>Videollamada Animal</span>
          </span>
          {!esUltimoPaso && (
            <button type="button" onClick={onTerminar} disabled={enviando} className="va-bienvenida-saltar">
              Saltar
            </button>
          )}
        </div>

        <Foto src={foto.src} alt={foto.alt} className="va-bienvenida-foto" prioridad>
          {foto.persona && <span className="vp-ilustrativa">Imagen ilustrativa</span>}
        </Foto>

        <div className="va-bienvenida-texto">
          <h1>{textoPaso.titulo}</h1>
          <p>{textoPaso.texto}</p>
        </div>

        <div className="va-bienvenida-puntos" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === paso ? "activo" : ""} />
          ))}
        </div>

        <div className="va-bienvenida-acciones">
          {!esUltimoPaso ? (
            <button type="button" className="va-bienvenida-boton" onClick={() => setPaso((p) => p + 1)}>
              Siguiente
            </button>
          ) : (
            <>
              <button type="button" className="va-bienvenida-boton" onClick={onTerminar} disabled={enviando}>
                {enviando ? "Un momento…" : pantallaFinal.boton}
              </button>
              <button type="button" className="va-bienvenida-otra" onClick={() => setPaso(0)} disabled={enviando}>
                Ver cómo funciona de nuevo
              </button>
            </>
          )}
        </div>

        <LegalFooter />
      </div>
    </div>
  );
}
