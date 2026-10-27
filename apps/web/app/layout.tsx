import type { ReactNode } from "react";
import "./globals.css";

const TITULO = "Videollamada Animal";
const DESCRIPCION =
  "Teleasesoramiento veterinario — hablá por video con un veterinario matriculado que evalúa qué tan urgente es y te orienta.";

// Imagen para compartir el link (WhatsApp, Instagram, etc.): public/og.jpg.
// Los buscadores y apps piden una URL ABSOLUTA, así que hace falta saber la
// dirección pública del sitio. Se toma de NEXT_PUBLIC_SITE_URL (la del
// dominio propio, cuando exista) o, mientras tanto, de la que Render inyecta
// (RENDER_EXTERNAL_URL). Si no hay ninguna (por ejemplo en tu compu), no se
// declara la imagen en vez de publicar una dirección de localhost.
const BASE = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL;

export const metadata = {
  title: TITULO,
  description: DESCRIPCION,
  ...(BASE
    ? {
        metadataBase: new URL(BASE),
        openGraph: {
          title: TITULO,
          description: DESCRIPCION,
          siteName: TITULO,
          locale: "es_AR",
          type: "website",
          images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Un gato atento en un sillón, con el texto Hablá con un veterinario por video" }],
        },
        twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION, images: ["/og.jpg"] },
      }
    : {}),
};

// Tipografías de la dirección G: Figtree (texto) y Unbounded (títulos y
// botones). Se cargan por Google Fonts, igual que antes.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Unbounded:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
