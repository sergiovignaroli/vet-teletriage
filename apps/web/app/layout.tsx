import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Videollamada Animal",
  description:
    "Teleasesoramiento veterinario — hablá por video con un veterinario matriculado que evalúa qué tan urgente es y te orienta.",
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
